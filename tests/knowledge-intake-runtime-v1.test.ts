import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { RuntimeHost, createRuntimeConfig } from "@sera/runtime-host";
import {
  DEFAULT_KNOWLEDGE_POLICY,
  KNOWLEDGE_RUNTIME_SERVICE_ID,
  KnowledgeRuntime,
  KnowledgeRuntimeBlockedError,
  createIntakeAuthorization,
  createKnowledgeRuntimeServices,
  normalizeIntakeRequest,
  runKnowledgeIntakeProof,
  runKnowledgeRetrievalProof,
  type IntakeAuthorization,
  type IntakeRequestInput
} from "@sera/knowledge-runtime";
import { DEFAULT_RUNTIME_STATE_MIGRATIONS, openRuntimeState, type RuntimeStateStore } from "@sera/runtime-state";

let sequence = 0;

describe("Knowledge and Universal Intake Runtime v1", () => {
  let firstIntakeProof: Awaited<ReturnType<typeof runKnowledgeIntakeProof>>;
  let secondIntakeProof: Awaited<ReturnType<typeof runKnowledgeIntakeProof>>;
  let firstKnowledgeProof: Awaited<ReturnType<typeof runKnowledgeRetrievalProof>>;
  let secondKnowledgeProof: Awaited<ReturnType<typeof runKnowledgeRetrievalProof>>;

  beforeAll(async () => {
    firstIntakeProof = await runKnowledgeIntakeProof();
    secondIntakeProof = await runKnowledgeIntakeProof();
    firstKnowledgeProof = await runKnowledgeRetrievalProof();
    secondKnowledgeProof = await runKnowledgeRetrievalProof();
  }, 60_000);

  const proofCases: Array<[string, () => unknown]> = [
    ["intake prove succeeds on first invocation", () => firstIntakeProof.ok],
    ["intake prove succeeds on second sequential invocation", () => secondIntakeProof.ok],
    ["intake proofs use independent proof roots", () => firstIntakeProof.proofRoot !== secondIntakeProof.proofRoot],
    ["knowledge prove succeeds on first invocation", () => firstKnowledgeProof.ok],
    ["knowledge prove succeeds on second sequential invocation", () => secondKnowledgeProof.ok],
    ["knowledge proofs use independent databases", () => firstKnowledgeProof.databasePath !== secondKnowledgeProof.databasePath],
    ["text intake is indexed", () => firstIntakeProof.textIntake],
    ["JSON intake is indexed", () => firstIntakeProof.jsonIntake],
    ["directory intake is indexed", () => firstIntakeProof.directoryIntake],
    ["opaque image intake is preserved", () => firstIntakeProof.opaquePreserved],
    ["duplicate content shares content hash", () => firstIntakeProof.duplicateDeduplicated],
    ["changed content creates a new version", () => firstIntakeProof.versionCreated],
    ["path escape is blocked", () => firstIntakeProof.pathEscapeBlocked],
    ["chunking is deterministic", () => firstIntakeProof.deterministicChunking],
    ["candidate status defaults to candidate", () => firstIntakeProof.candidateStatusDefault],
    ["provenance is complete", () => firstIntakeProof.provenanceComplete],
    ["trust is not inferred", () => firstIntakeProof.trustNotInferred],
    ["lexical retrieval returns hits", () => firstIntakeProof.lexicalRetrieval],
    ["retrieval is deterministic", () => firstIntakeProof.retrievalDeterministic],
    ["evidence files are complete", () => firstIntakeProof.evidenceComplete],
    ["runtime service is healthy", () => firstIntakeProof.runtimeServiceHealthy],
    ["proof is non-Git", () => firstIntakeProof.nonGit],
    ["proof is offline", () => firstIntakeProof.offline && firstIntakeProof.publicNetworkUse === false],
    ["proof is model-free", () => firstIntakeProof.noModelRequired && firstIntakeProof.modelUse === false],
    ["retrieval limit is bounded", () => firstIntakeProof.firstSearchCount <= DEFAULT_KNOWLEDGE_POLICY.limits.maxSearchResults],
    ["query results are stable between searches", () => firstIntakeProof.firstSearchCount === firstIntakeProof.secondSearchCount],
    ["second proof also blocks path escape", () => secondIntakeProof.pathEscapeBlocked],
    ["second proof also preserves opaque content", () => secondIntakeProof.opaquePreserved],
    ["retrieval proof is model-free", () => firstKnowledgeProof.modelUse === false],
    ["retrieval proof is offline", () => firstKnowledgeProof.publicNetworkUse === false],
    ["migration v1 checksum is unchanged", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[0]) === "da454ccf711a0c9a35990b6e2c70a5dedd0f19fced0e98438c3318f34c5c9a0b"],
    ["migration v2 checksum is unchanged", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[1]) === "fc54c2f77819094cbddaecf918cf6f339af5297f9e5e0f559e9953e9f8152fe4"],
    ["migration v3 checksum is unchanged", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[2]) === "957a450915bad1c6318f968318a876a7caedc0c75f745d33ab88381924476626"],
    ["migration v4 checksum is unchanged", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[3]) === "98fb2c9c8172459fcaf6616d3f1671eb0d6bbaa81787be4142a62a91304aca12"],
    ["migration v5 checksum is unchanged", () => migrationChecksum(DEFAULT_RUNTIME_STATE_MIGRATIONS[4]) === "4f09803bf70f07bee9ce28c366ca2ec7ee24bdaeca081b4eae6b14133ed2308f"]
  ];

  it.each(proofCases)("%s", (_name, check) => {
    expect(Boolean(check())).toBe(true);
  });

  it("reports supported source types and opaque behavior", () => {
    withHarness("types", ({ runtime }) => {
      const types = runtime.types();
      expect(types.supportedSourceTypes).toContain("inline-text");
      expect(types.supportedSourceTypes).toContain("local-file");
      expect(types.supportedSourceTypes).toContain("url-reference");
      expect(types.archiveBehavior).toContain("never extracted");
      expect(types.modelUse).toBe(false);
      expect(types.publicNetworkUse).toBe(false);
    });
  });

  it("requires authorization", async () => {
    await withHarness("auth-required", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "alpha" }, { omitAuthorization: true });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("authorization is required");
    });
  });

  it("blocks authorization source type mismatch", async () => {
    await expectBlocked("source-type-mismatch", { sourceType: "inline-text", sourceReference: "alpha" }, { sourceType: "local-file" as any }, "source type mismatch");
  });

  it("blocks source reference hash mismatch", async () => {
    await expectBlocked("source-reference-mismatch", { sourceType: "inline-text", sourceReference: "alpha" }, { sourceReferenceHash: "bad" }, "source reference mismatch");
  });

  it("blocks unsupported policy versions", async () => {
    await expectBlocked("policy-version", { sourceType: "inline-text", sourceReference: "alpha" }, { policyVersion: "old-policy" as any }, "Unsupported intake policy");
  });

  it("blocks expired authorization", async () => {
    await expectBlocked("expired-auth", { sourceType: "inline-text", sourceReference: "alpha" }, { expiresAt: "2000-01-01T00:00:00.000Z" }, "expired");
  });

  it("blocks authorization integrity mismatch", async () => {
    await expectBlocked("integrity", { sourceType: "inline-text", sourceReference: "alpha" }, { integrityHash: "bad" }, "integrity hash mismatch");
  });

  it("blocks network-enabled authorization", async () => {
    await expectBlocked("network-policy", { sourceType: "inline-text", sourceReference: "alpha" }, { networkPolicy: "online" as any }, "Network behavior");
  });

  it("blocks extraction policy mismatch", async () => {
    await expectBlocked("extraction-policy", { sourceType: "inline-text", sourceReference: "alpha" }, { extractionPolicy: "opaque-preserve-v1" }, "policy mismatch");
  });

  it("blocks retention policy mismatch", async () => {
    await expectBlocked("retention-policy", { sourceType: "inline-text", sourceReference: "alpha" }, { retentionPolicy: "other" as any }, "policy mismatch");
  });

  it("blocks media type not permitted by authorization", async () => {
    await expectBlocked("media-type", { sourceType: "inline-text", sourceReference: "alpha", displayName: "a.txt" }, { permittedMediaTypes: ["application/json"] }, "Media type is not permitted");
  });

  it("blocks allowed root mismatches", async () => {
    await withHarness("root-mismatch", async (harness) => {
      const source = path.join(harness.root, "source.txt");
      fs.writeFileSync(source, "alpha", "utf8");
      const result = await intake(harness, { sourceType: "local-file", sourceReference: source, allowedRoots: [harness.root] }, { authorizationOverrides: { allowedRoots: [path.join(harness.root, "other")] } });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("allowed roots mismatch");
    });
  });

  it("blocks local file outside allowed roots", async () => {
    await withHarness("root-escape", async (harness) => {
      const allowed = path.join(harness.root, "allowed");
      fs.mkdirSync(allowed);
      const outside = path.join(harness.root, "outside.txt");
      fs.writeFileSync(outside, "outside", "utf8");
      const result = await intake(harness, { sourceType: "local-file", sourceReference: outside, allowedRoots: [allowed] });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("outside allowed roots");
    });
  });

  it("blocks hidden files during directory intake", async () => {
    await withHarness("hidden-file", async (harness) => {
      const dir = path.join(harness.root, "sources");
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, ".secret.txt"), "secret", "utf8");
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: dir, allowedRoots: [dir] });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("Hidden files");
    });
  });

  it("blocks generated runtime paths", async () => {
    await withHarness("runtime-path", async (harness) => {
      const generated = path.join(harness.root, ".sera", "intake", "x.txt");
      fs.mkdirSync(path.dirname(generated), { recursive: true });
      fs.writeFileSync(generated, "generated", "utf8");
      const result = await intake(harness, { sourceType: "local-file", sourceReference: generated, allowedRoots: [harness.root] });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("Runtime generated paths");
    });
  });

  it("blocks live operational database files", async () => {
    await withHarness("database-path", async (harness) => {
      const dbPath = harness.store.inspect().databasePath;
      const result = await intake(harness, { sourceType: "local-file", sourceReference: dbPath, allowedRoots: [path.dirname(dbPath)] });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("Operational SQLite files");
    });
  });

  it("blocks symlink escape where supported", async () => {
    await withHarness("symlink", async (harness) => {
      const allowed = path.join(harness.root, "allowed");
      const outside = path.join(harness.root, "outside");
      fs.mkdirSync(allowed);
      fs.mkdirSync(outside);
      fs.writeFileSync(path.join(outside, "secret.txt"), "secret", "utf8");
      const link = path.join(allowed, "link");
      try {
        fs.symlinkSync(outside, link, "dir");
      } catch {
        expect(true).toBe(true);
        return;
      }
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: allowed, allowedRoots: [allowed] });
      expect(result.status).toBe("BLOCKED");
    });
  });

  it("blocks junction escape where supported", async () => {
    await withHarness("junction", async (harness) => {
      if (process.platform !== "win32") {
        expect(true).toBe(true);
        return;
      }
      const allowed = path.join(harness.root, "allowed");
      const outside = path.join(harness.root, "outside");
      fs.mkdirSync(allowed);
      fs.mkdirSync(outside);
      const link = path.join(allowed, "junction");
      try {
        fs.symlinkSync(outside, link, "junction");
      } catch {
        expect(true).toBe(true);
        return;
      }
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: allowed, allowedRoots: [allowed] });
      expect(result.status).toBe("BLOCKED");
    });
  });

  it("applies directory ordering deterministically", async () => {
    await withHarness("directory-order", async (harness) => {
      const dir = path.join(harness.root, "sources");
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "b.txt"), "beta", "utf8");
      fs.writeFileSync(path.join(dir, "a.txt"), "alpha", "utf8");
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: dir, allowedRoots: [dir] });
      const assets = harness.store.recoveryAll("SELECT display_name FROM intake_assets WHERE intake_id = ? ORDER BY display_name", [result.intakeId]);
      expect(assets.map((row) => row.display_name)).toEqual(["a.txt", "b.txt"]);
    });
  });

  it("enforces directory depth limit", async () => {
    await withHarness("depth-limit", async (harness) => {
      const dir = path.join(harness.root, "sources");
      const nested = path.join(dir, "nested");
      fs.mkdirSync(nested, { recursive: true });
      fs.writeFileSync(path.join(nested, "a.txt"), "alpha", "utf8");
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: dir, allowedRoots: [dir] }, { authorizationOverrides: { maximumDirectoryDepth: 0 } });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("depth limit");
    });
  });

  it("enforces file count limit", async () => {
    await withHarness("file-count", async (harness) => {
      const dir = path.join(harness.root, "sources");
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "a.txt"), "alpha", "utf8");
      fs.writeFileSync(path.join(dir, "b.txt"), "beta", "utf8");
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: dir, allowedRoots: [dir] }, { authorizationOverrides: { maximumFileCount: 1 } });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("file-count limit");
    });
  });

  it("enforces individual file-size limit", async () => {
    await withHarness("individual-size", async (harness) => {
      const file = path.join(harness.root, "large.txt");
      fs.writeFileSync(file, "alpha beta", "utf8");
      const result = await intake(harness, { sourceType: "local-file", sourceReference: file, allowedRoots: [harness.root] }, { authorizationOverrides: { maximumIndividualFileSize: 2 } });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("file-size limit");
    });
  });

  it("enforces total byte limit", async () => {
    await withHarness("total-size", async (harness) => {
      const dir = path.join(harness.root, "sources");
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "a.txt"), "alpha", "utf8");
      fs.writeFileSync(path.join(dir, "b.txt"), "beta", "utf8");
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: dir, allowedRoots: [dir] }, { authorizationOverrides: { maximumTotalBytes: 3 } });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("total-byte limit");
    });
  });

  it("blocks expected hash mismatch", async () => {
    await withHarness("hash-mismatch", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "alpha", expectedHash: "bad" });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("hash mismatch");
    });
  });

  it("source change during copy blocks", async () => {
    await withHarness("source-change", async (harness) => {
      const file = path.join(harness.root, "source.txt");
      fs.writeFileSync(file, "alpha", "utf8");
      const original = fs.readFileSync;
      let changed = false;
      try {
        (fs as any).readFileSync = (target: fs.PathOrFileDescriptor, ...args: any[]) => {
          const result = original.call(fs, target as any, ...args);
          if (!changed && target === file) {
            changed = true;
            fs.writeFileSync(file, "alpha changed", "utf8");
          }
          return result;
        };
        const result = await intake(harness, { sourceType: "local-file", sourceReference: file, allowedRoots: [harness.root] });
        expect(result.status).toBe("BLOCKED");
        expect(blockReason(harness.store, result.intakeId)).toContain("Source changed during copy");
      } finally {
        (fs as any).readFileSync = original;
      }
    });
  });

  it("detects extension/content mismatch for media", async () => {
    await withHarness("extension-mismatch", async (harness) => {
      const file = path.join(harness.root, "image.txt");
      fs.writeFileSync(file, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1]));
      const result = await intake(harness, { sourceType: "local-file", sourceReference: file, allowedRoots: [harness.root] });
      const asset = harness.store.recoveryGet("SELECT extension_mismatch, media_type FROM intake_assets WHERE intake_id = ?", [result.intakeId]);
      expect(asset?.media_type).toBe("image/png");
      expect(asset?.extension_mismatch).toBe(1);
    });
  });

  it("normalizes JSON deterministically", async () => {
    await withHarness("json", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "{\"b\":2,\"a\":1}", displayName: "data.json", declaredMediaType: "application/json" });
      const chunk = harness.store.recoveryGet("SELECT chunk_text FROM knowledge_chunks WHERE intake_id = ?", [result.intakeId]);
      expect(chunk?.chunk_text).toBe("{\"a\":1,\"b\":2}");
    });
  });

  it("extracts Markdown as deterministic text", async () => {
    await withHarness("markdown", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "# Alpha\n\nBeta", displayName: "note.md", declaredMediaType: "text/markdown" });
      const chunk = harness.store.recoveryGet("SELECT chunk_text FROM knowledge_chunks WHERE intake_id = ?", [result.intakeId]);
      expect(String(chunk?.chunk_text)).toContain("# Alpha");
    });
  });

  it("invalid UTF-8 is handled honestly as opaque", async () => {
    await withHarness("invalid-utf8", async (harness) => {
      const file = path.join(harness.root, "bad.txt");
      fs.writeFileSync(file, Buffer.from([0xff, 0xff, 0xff]));
      const result = await intake(harness, { sourceType: "local-file", sourceReference: file, allowedRoots: [harness.root] });
      const extraction = harness.store.recoveryGet("SELECT status, failure_or_block_reason FROM intake_extractions WHERE intake_id = ?", [result.intakeId]);
      expect(result.status).toBe("OPAQUE_PRESERVED");
      expect(extraction?.status).toBe("opaque");
      expect(String(extraction?.failure_or_block_reason)).toContain("Invalid UTF-8");
    });
  });

  it("blocks malformed JSON", async () => {
    await withHarness("bad-json", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "{\"a\":", displayName: "bad.json", declaredMediaType: "application/json" });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("Malformed JSON");
    });
  });

  it("extracts CSV deterministically", async () => {
    await withHarness("csv", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "name,value\nalpha,1\n", displayName: "data.csv", declaredMediaType: "text/csv" });
      const chunk = harness.store.recoveryGet("SELECT chunk_text FROM knowledge_chunks WHERE intake_id = ?", [result.intakeId]);
      expect(String(chunk?.chunk_text)).toContain("name | value");
    });
  });

  it("blocks malformed CSV", async () => {
    await withHarness("bad-csv", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "\"unterminated", displayName: "bad.csv", declaredMediaType: "text/csv" });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("Malformed CSV");
    });
  });

  it("blocks CSV row limits", async () => {
    await withHarness("csv-rows", async (harness) => {
      const policy = { ...DEFAULT_KNOWLEDGE_POLICY, limits: { ...DEFAULT_KNOWLEDGE_POLICY.limits, maxCsvRows: 1 } };
      const runtime = new KnowledgeRuntime(harness.store, { projectRoot: harness.root, policy });
      const result = await intake({ ...harness, runtime }, { sourceType: "inline-text", sourceReference: "a\nb\n", displayName: "rows.csv", declaredMediaType: "text/csv" });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("CSV row limit");
    });
  });

  it("blocks CSV column limits", async () => {
    await withHarness("csv-columns", async (harness) => {
      const policy = { ...DEFAULT_KNOWLEDGE_POLICY, limits: { ...DEFAULT_KNOWLEDGE_POLICY.limits, maxCsvColumns: 1 } };
      const runtime = new KnowledgeRuntime(harness.store, { projectRoot: harness.root, policy });
      const result = await intake({ ...harness, runtime }, { sourceType: "inline-text", sourceReference: "a,b\n", displayName: "cols.csv", declaredMediaType: "text/csv" });
      expect(result.status).toBe("BLOCKED");
      expect(blockReason(harness.store, result.intakeId)).toContain("CSV column limit");
    });
  });

  it("extracts inert HTML without script execution", async () => {
    await withHarness("html", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "<html><script>bad()</script><p>Alpha</p></html>", displayName: "page.html", declaredMediaType: "text/html" });
      const chunk = harness.store.recoveryGet("SELECT chunk_text FROM knowledge_chunks WHERE intake_id = ?", [result.intakeId]);
      expect(String(chunk?.chunk_text)).toContain("Alpha");
      expect(String(chunk?.chunk_text)).not.toContain("bad()");
    });
  });

  it.each([
    ["PDF", "doc.pdf", Buffer.from("%PDF-1.4")],
    ["PNG", "image.png", Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    ["JPEG", "photo.jpg", Buffer.from([0xff, 0xd8, 0xff, 0x00])],
    ["GIF", "anim.gif", Buffer.from("GIF89a")],
    ["MP3", "sound.mp3", Buffer.from([0, 1, 2, 3])],
    ["WAV", "sound.wav", Buffer.from([0, 1, 2, 3])],
    ["MP4", "movie.mp4", Buffer.from([0, 1, 2, 3])],
    ["ZIP", "archive.zip", Buffer.from([0x50, 0x4b, 0x03, 0x04])]
  ])("preserves opaque %s without extraction", async (_label, fileName, bytes) => {
    await withHarness(`opaque-${fileName}`, async (harness) => {
      const file = path.join(harness.root, fileName);
      fs.writeFileSync(file, bytes);
      const result = await intake(harness, { sourceType: "local-file", sourceReference: file, allowedRoots: [harness.root] });
      expect(result.status).toBe("OPAQUE_PRESERVED");
      expect(result.chunkCount).toBe(0);
    });
  });

  it("preserves unknown binary as opaque", async () => {
    await withHarness("unknown-binary", async (harness) => {
      const file = path.join(harness.root, "binary.bin");
      fs.writeFileSync(file, Buffer.from([0, 1, 2, 3, 4]));
      const result = await intake(harness, { sourceType: "local-file", sourceReference: file, allowedRoots: [harness.root] });
      expect(result.status).toBe("OPAQUE_PRESERVED");
    });
  });

  it("stores content-addressed assets without mutating source", async () => {
    await withHarness("preserve", async (harness) => {
      const file = path.join(harness.root, "source.txt");
      fs.writeFileSync(file, "alpha", "utf8");
      const before = sha256File(file);
      const result = await intake(harness, { sourceType: "local-file", sourceReference: file, allowedRoots: [harness.root] });
      expect(result.contentHashes[0]).toBe(before);
      expect(sha256File(file)).toBe(before);
      expect(fs.existsSync(path.join(harness.root, ".sera", "knowledge", "assets", before, "content"))).toBe(true);
    });
  });

  it("preserved asset content stays hash-stable", async () => {
    await withHarness("asset-immutable", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "alpha beta" });
      const asset = harness.store.recoveryGet("SELECT preservation_path, content_hash, immutable FROM intake_assets WHERE intake_id = ?", [result.intakeId]);
      expect(asset?.immutable).toBe(1);
      expect(sha256File(String(asset?.preservation_path))).toBe(asset?.content_hash);
    });
  });

  it("same idempotency request returns existing intake", async () => {
    await withHarness("idempotent", async (harness) => {
      const source = { sourceType: "inline-text", sourceReference: "alpha beta" } as const;
      const first = await intake(harness, source, { idempotencyKey: "same-key" });
      const second = await intake(harness, { ...source, intakeId: first.intakeId } as any, { idempotencyKey: "same-key" });
      expect(second.intakeId).toBe(first.intakeId);
    });
  });

  it("idempotency survives restart", async () => {
    const root = tempRoot("idempotency-restart");
    const store = openRuntimeState({ projectRoot: root, installationId: "installation_restart", runtimeInstanceId: "runtime_restart_a" });
    const attemptId = createAttempt(store);
    const runtime = new KnowledgeRuntime(store, { projectRoot: root });
    const intakeId = `intake_restart_${++sequence}`;
    const request = normalizeIntakeRequest({ intakeId, attemptId, authorizationId: `auth_${intakeId}`, sourceType: "inline-text", sourceReference: "alpha restart" });
    const authorization = createIntakeAuthorization(request);
    const first = await runtime.intake(request, authorization, "restart-key");
    store.close();
    const reopened = openRuntimeState({ projectRoot: root, installationId: "installation_restart", runtimeInstanceId: "runtime_restart_b" });
    try {
      const second = await new KnowledgeRuntime(reopened, { projectRoot: root }).intake(request, authorization, "restart-key");
      expect(second.intakeId).toBe(first.intakeId);
    } finally {
      reopened.close();
    }
  });

  it("conflicting idempotency reuse remains blocked", async () => {
    await withHarness("idempotency-conflict", async (harness) => {
      await intake(harness, { sourceType: "inline-text", sourceReference: "alpha" }, { idempotencyKey: "same-key" });
      await expect(intake(harness, { sourceType: "inline-text", sourceReference: "beta" }, { idempotencyKey: "same-key" })).rejects.toThrow(KnowledgeRuntimeBlockedError);
    });
  });

  it("terminal intake records remain immutable", async () => {
    await withHarness("terminal", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "alpha" });
      expect(result.status).toBe("INDEXED");
      expect(() => harness.runtime.forceTransitionForTest(result.intakeId, "FAILED")).toThrow(KnowledgeRuntimeBlockedError);
    });
  });

  it("interrupted intake is not promoted to knowledge", () => {
    withHarness("interrupted", (harness) => {
      const intakeId = harness.runtime.createInterruptedForRecovery(harness.attemptId);
      const docs = harness.store.recoveryAll("SELECT document_id FROM knowledge_documents WHERE intake_id = ?", [intakeId]);
      expect(docs).toHaveLength(0);
      expect(harness.runtime.inspectIntake(intakeId).status).toBe("INSPECTED");
    });
  });

  it("cancels nonterminal intake fixtures durably", () => {
    withHarness("cancel", (harness) => {
      const intakeId = harness.runtime.createInterruptedForRecovery(harness.attemptId);
      const result = harness.runtime.cancelIntake(intakeId, "operator cancel");
      expect(result.status).toBe("CANCELLED");
    });
  });

  it("search rejects empty queries", () => {
    withHarness("empty-search", (harness) => {
      expect(() => harness.runtime.search("   ")).toThrow(KnowledgeRuntimeBlockedError);
    });
  });

  it("search is deterministic and includes provenance", async () => {
    await withHarness("search", async (harness) => {
      await intake(harness, { sourceType: "inline-text", sourceReference: "alpha beta alpha" });
      const a = harness.runtime.search("alpha", 5);
      const b = harness.runtime.search("alpha", 5);
      expect(a.results).toEqual(b.results);
      expect(a.results[0].provenance.contentHash).toBeTruthy();
      expect(a.results[0].candidateStatus).toBe("candidate");
      expect(a.results[0].trustState).toBe("unreviewed");
    });
  });

  it("search result limits are enforced", async () => {
    await withHarness("search-limit", async (harness) => {
      await intake(harness, { sourceType: "inline-text", sourceReference: "alpha\n".repeat(300) });
      const result = harness.runtime.search("alpha", 1);
      expect(result.results).toHaveLength(1);
    });
  });

  it("chunk metadata records size, offsets, line ranges, and omits empty chunks", async () => {
    await withHarness("chunk-metadata", async (harness) => {
      const policy = { ...DEFAULT_KNOWLEDGE_POLICY, limits: { ...DEFAULT_KNOWLEDGE_POLICY.limits, maxChunkBytes: 20, chunkOverlapBytes: 5 } };
      const runtime = new KnowledgeRuntime(harness.store, { projectRoot: harness.root, policy });
      const result = await intake({ ...harness, runtime }, { sourceType: "inline-text", sourceReference: "alpha\n\nbeta gamma delta epsilon zeta eta theta" });
      const chunks = harness.store.recoveryAll("SELECT sequence, chunk_text, byte_start, byte_end, line_start, line_end FROM knowledge_chunks WHERE intake_id = ? ORDER BY sequence", [result.intakeId]);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every((chunk) => String(chunk.chunk_text).trim().length > 0)).toBe(true);
      expect(chunks.every((chunk) => Number(chunk.byte_end) > Number(chunk.byte_start))).toBe(true);
      expect(chunks.every((chunk) => Number(chunk.byte_end) - Number(chunk.byte_start) <= 20)).toBe(true);
      expect(chunks.every((chunk) => Number(chunk.line_start) >= 1 && Number(chunk.line_end) >= Number(chunk.line_start))).toBe(true);
      expect(chunks.map((chunk) => chunk.sequence)).toEqual(chunks.map((_chunk, index) => index + 1));
      expect(Number(chunks[1].byte_start) - Number(chunks[0].byte_start)).toBe(15);
    });
  });

  it("source boundaries are preserved between files", async () => {
    await withHarness("source-boundaries", async (harness) => {
      const dir = path.join(harness.root, "sources");
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "a.txt"), "alpha", "utf8");
      fs.writeFileSync(path.join(dir, "b.txt"), "beta", "utf8");
      const result = await intake(harness, { sourceType: "local-directory", sourceReference: dir, allowedRoots: [dir] });
      const docs = harness.store.recoveryAll("SELECT source_asset_id FROM knowledge_documents WHERE intake_id = ?", [result.intakeId]);
      const chunks = harness.store.recoveryAll("SELECT DISTINCT source_asset_id FROM knowledge_chunks WHERE intake_id = ?", [result.intakeId]);
      expect(chunks.map((chunk) => chunk.source_asset_id).sort()).toEqual(docs.map((doc) => doc.source_asset_id).sort());
    });
  });

  it("trust is not inferred from URL strings", async () => {
    await withHarness("url-trust", async (harness) => {
      const result = await intake(harness, { sourceType: "url-reference", sourceReference: "https://trusted.example.test/source" });
      expect(result.trustState).toBe("unreviewed");
    });
  });

  it("derived records cannot replace original source evidence", async () => {
    await withHarness("derived-record", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "source evidence" });
      const provenance = harness.store.recoveryAll("SELECT derived_from_json, source_reference FROM knowledge_provenance WHERE intake_id = ?", [result.intakeId]);
      expect(provenance.every((row) => row.derived_from_json === "[]")).toBe(true);
      expect(provenance.some((row) => String(row.source_reference).includes("source evidence"))).toBe(true);
    });
  });

  it("inspect document is read-only", async () => {
    await withHarness("inspect", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "alpha beta" });
      const before = harness.store.recoveryAll("SELECT * FROM knowledge_queries").length;
      const doc = harness.runtime.inspectDocument(result.documentIds[0]);
      const after = harness.store.recoveryAll("SELECT * FROM knowledge_queries").length;
      expect(doc.status).toBe("INSPECTED");
      expect(after).toBe(before);
    });
  });

  it("sources list preserved assets", async () => {
    await withHarness("sources", async (harness) => {
      await intake(harness, { sourceType: "inline-text", sourceReference: "alpha beta" });
      const sources = harness.runtime.sources() as any;
      expect(sources.sources.length).toBe(1);
      expect(sources.modelUse).toBe(false);
    });
  });

  it("Runtime Host registers knowledge-intake-runtime service", async () => {
    const root = tempRoot("host");
    const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createKnowledgeRuntimeServices(root) });
    const started = await host.start();
    const health = await host.health();
    await host.shutdown();
    expect(started.ok).toBe(true);
    expect(health.services.some((service) => service.serviceId === KNOWLEDGE_RUNTIME_SERVICE_ID && service.status === "healthy")).toBe(true);
  });

  it("shutdown refuses new intake", async () => {
    await withHarness("shutdown", async (harness) => {
      harness.runtime.shutdown();
      await expect(intake(harness, { sourceType: "inline-text", sourceReference: "alpha" })).rejects.toThrow(KnowledgeRuntimeBlockedError);
    });
  });

  it("default CLI proof does not mutate live operational database", () => {
    const root = tempRoot("cli-live-db");
    const store = openRuntimeState({ projectRoot: root });
    const before = store.inspect().counts.commands;
    store.close();
    execFileSync(process.execPath, [path.join(process.cwd(), "apps", "cli", "dist", "index.js"), "intake", "prove"], { cwd: root, encoding: "utf8" });
    const reopened = openRuntimeState({ projectRoot: root });
    try {
      expect(reopened.inspect().counts.commands).toBe(before);
    } finally {
      reopened.close();
    }
  });

  it("CLI intake types reports model-free behavior", () => {
    const root = tempRoot("cli-types");
    const output = execFileSync(process.execPath, [path.join(process.cwd(), "apps", "cli", "dist", "index.js"), "intake", "types"], { cwd: root, encoding: "utf8" });
    expect(JSON.parse(output).modelUse).toBe(false);
  });

  it("repository snapshot excludes generated knowledge runtime paths", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "packages", "repository-snapshot", "src", "repository-snapshot.ts"), "utf8");
    expect(source).toContain("\".sera/intake\"");
    expect(source).toContain("\".sera/knowledge\"");
  });

  it("repository truth classifies knowledge runtime as Runtime", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "packages", "repository-truth", "src", "repository-truth.ts"), "utf8");
    expect(source).toContain("\"knowledge-runtime\"");
  });

  it("legacy knowledge adapter is documented as non-runtime authority", () => {
    const doc = fs.readFileSync(path.join(process.cwd(), "docs", "architecture", "PACKAGE_BOUNDARIES.md"), "utf8");
    expect(doc).toContain("@sera/knowledge-runtime");
    expect(doc).toContain("Runtime-owned Knowledge and Universal Intake boundary");
    expect(doc).toContain("@sera/knowledge");
    expect(doc).toContain("does not call LLM providers");
  });

  it("Control Plane authority is preserved by documentation and runtime results", async () => {
    await withHarness("control-plane-authority", async (harness) => {
      const result = await intake(harness, { sourceType: "inline-text", sourceReference: "alpha" });
      const attempt = harness.store.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [harness.attemptId]);
      const doc = fs.readFileSync(path.join(process.cwd(), "docs", "architecture", "KNOWLEDGE_UNIVERSAL_INTAKE_RUNTIME_V1.md"), "utf8");
      expect(result.status).toBe("INDEXED");
      expect(attempt?.current_state).toBe("RUNNING");
      expect(doc).toContain("Control Plane terminal authority remains outside this runtime");
    });
  });
});

interface Harness {
  root: string;
  store: RuntimeStateStore;
  runtime: KnowledgeRuntime;
  attemptId: string;
}

function tempRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-knowledge-${label}-`));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: label, private: true }), "utf8");
  return root;
}

function withHarness<T>(label: string, fn: (harness: Harness) => T): T {
  const root = tempRoot(label);
  const store = openRuntimeState({ projectRoot: root, installationId: "installation_knowledge_test", runtimeInstanceId: `runtime_knowledge_test_${++sequence}` });
  const runtime = new KnowledgeRuntime(store, { projectRoot: root });
  const attemptId = createAttempt(store);
  try {
    const result = fn({ root, store, runtime, attemptId });
    if (result && typeof (result as Promise<unknown>).then === "function") {
      return (result as Promise<unknown>).finally(() => store.close()) as T;
    }
    store.close();
    return result;
  } catch (error) {
    store.close();
    throw error;
  }
}

async function intake(
  harness: Harness,
  source: Omit<IntakeRequestInput, "intakeId" | "attemptId" | "authorizationId"> & Partial<Pick<IntakeRequestInput, "intakeId">>,
  options: { omitAuthorization?: boolean; authorizationOverrides?: Partial<IntakeAuthorization>; idempotencyKey?: string } = {}
) {
  const intakeId = source.intakeId ?? `intake_test_${++sequence}`;
  const request = normalizeIntakeRequest({
    intakeId,
    attemptId: harness.attemptId,
    authorizationId: `auth_${intakeId}`,
    ...source
  });
  const authorization = options.omitAuthorization ? undefined : createIntakeAuthorization(request, options.authorizationOverrides ?? {});
  return harness.runtime.intake(request, authorization, options.idempotencyKey ?? `idem_${request.requestHash}`);
}

async function expectBlocked(
  label: string,
  source: Omit<IntakeRequestInput, "intakeId" | "attemptId" | "authorizationId">,
  overrides: Partial<IntakeAuthorization>,
  message: string
) {
  await withHarness(label, async (harness) => {
    const result = await intake(harness, source, { authorizationOverrides: overrides });
    expect(result.status).toBe("BLOCKED");
    expect(blockReason(harness.store, result.intakeId)).toContain(message);
  });
}

function createAttempt(store: RuntimeStateStore): string {
  const command = store.acceptCommand({ idempotencyKey: `knowledge-test:${++sequence}`, commandType: "knowledge-test", payload: { sequence }, capability: "knowledge-intake-runtime" });
  const attemptId = command.attemptId!;
  store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane", reason: "focused knowledge runtime test" });
  return attemptId;
}

function blockReason(store: RuntimeStateStore, intakeId: string): string {
  return String(store.recoveryGet("SELECT failure_or_block_reason FROM intake_requests WHERE intake_id = ?", [intakeId])?.failure_or_block_reason ?? "");
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function migrationChecksum(migration: { version: number; name: string; sql: string }): string {
  return stableHash({ version: migration.version, name: migration.name, sql: migration.sql.replace(/\r\n/g, "\n").trim() });
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)]));
  }
  return value;
}
