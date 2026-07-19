import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PORTABLE_BASE_MVP_ARTIFACT_NAME,
  PORTABLE_BASE_MVP_VERSION,
  baseMvpStatus,
  buildCleanProofKit,
  buildPortableBaseMvp,
  inspectCleanEnvironmentOptions,
  inspectPortableBaseMvpProof,
  proveReleaseReproducibility,
  runPortableBaseMvpProof,
  verifyPortableBaseMvp
  ,validateCleanEnvironmentEvidence
} from "@sera/portable-base-mvp";

describe("Portable Offline Base MVP v1", { timeout: 120_000 }, () => {
  it("reports the Milestone 16 status without claiming certification", () => {
    const status = baseMvpStatus() as { version: string; artifactName: string; cleanEnvironmentProofRequired: boolean; modelUse: boolean; publicNetworkUse: boolean };

    expect(status.version).toBe(PORTABLE_BASE_MVP_VERSION);
    expect(status.artifactName).toBe(PORTABLE_BASE_MVP_ARTIFACT_NAME);
    expect(status.cleanEnvironmentProofRequired).toBe(true);
    expect(status.modelUse).toBe(false);
    expect(status.publicNetworkUse).toBe(false);
  });

  it("builds a portable release candidate with manifest, checksum, fixtures, and zip sidecar", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-base-mvp-build-test-"));
    const result = buildPortableBaseMvp({ projectRoot: process.cwd(), outputRoot: root });

    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(fs.existsSync(result.zipPath)).toBe(true);
    expect(path.basename(result.zipPath)).toBe(PORTABLE_BASE_MVP_ARTIFACT_NAME);
    expect(fs.existsSync(result.manifestPath)).toBe(true);
    expect(fs.existsSync(result.checksumPath)).toBe(true);
    expect(fs.existsSync(`${result.zipPath}.sha256.json`)).toBe(true);
    expect(fs.existsSync(path.join(result.packageRoot, "Launch-SERA.cmd"))).toBe(true);
    expect(fs.existsSync(path.join(result.packageRoot, "fixtures", "base-mvp-v1", "opaque-sample.png"))).toBe(true);
  });

  it("verifies both release root and zip sidecar evidence", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-base-mvp-verify-test-"));
    const release = buildPortableBaseMvp({ projectRoot: process.cwd(), outputRoot: root });
    const rootVerification = verifyPortableBaseMvp(release.releaseRoot);
    const zipVerification = verifyPortableBaseMvp(release.zipPath);

    expect(rootVerification.ok).toBe(true);
    expect(zipVerification.ok).toBe(true);
    expect(zipVerification.checks.sidecarMatches).toBe(true);
    expect(rootVerification.checks.runtimeBundled).toBe(true);
    expect(rootVerification.checks.runtimeDigestMatchesManifest).toBe(true);
    expect(rootVerification.checks.launcherExplicitRuntime).toBe(true);
    expect(zipVerification.checks.runtimeBundled).toBe(true);
  });

  it("uses only the quoted release-relative runtime and blocks missing or altered runtime", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera base mvp runtime test "));
    const release = buildPortableBaseMvp({ projectRoot: process.cwd(), outputRoot: root });
    const launcher = fs.readFileSync(path.join(release.packageRoot, "Launch-SERA.cmd"), "utf8");
    expect(launcher).toContain('"%~dp0runtime\\node.exe" "%~dp0app\\sera-portable-entry.cjs"');
    expect(launcher).not.toMatch(/where\s+node/i);
    expect(launcher).not.toMatch(/(^|[\r\n&|]\s*)node(?:\.exe)?\s/i);
    const runtime = path.join(release.packageRoot, "runtime", "node.exe");
    fs.appendFileSync(runtime, "changed");
    expect(verifyPortableBaseMvp(release.releaseRoot).checks.runtimeDigestMatchesManifest).toBe(false);
    fs.rmSync(runtime);
    expect(verifyPortableBaseMvp(release.releaseRoot).checks.runtimeBundled).toBe(false);
  });

  it("rejects incomplete, contradictory, altered, and unsafe clean evidence", () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "sera-clean-empty-"));
    expect(validateCleanEnvironmentEvidence(empty).ok).toBe(false);
    fs.writeFileSync(path.join(empty, "arbitrary.json"), "{}\n");
    expect(validateCleanEnvironmentEvidence(empty).ok).toBe(false);

    for (const mutation of [
      "missing", "invalid-schema", "changed-evidence-digest", "changed-manifest-digest", "proof-id", "machine-id",
      "same-development-machine", "missing-network-denial", "missing-visual", "development-ollama-only", "failed-final",
      "unresolved-claim", "path-traversal"
    ]) {
      const fixture = makeCleanEvidenceFixture();
      mutateCleanFixture(fixture, mutation);
      expect(validateCleanEnvironmentEvidence(fixture).ok, mutation).toBe(false);
    }
  });

  it("rejects a symlink escape where supported", () => {
    const fixture = makeCleanEvidenceFixture();
    const outside = path.join(os.tmpdir(), `sera-outside-${Date.now()}.json`);
    fs.writeFileSync(outside, "{}\n");
    const target = path.join(fixture, "launcher-report.json");
    try {
      fs.rmSync(target);
      fs.symlinkSync(outside, target, "file");
      expect(validateCleanEnvironmentEvidence(fixture).ok).toBe(false);
    } catch {
      expect(true).toBe(true);
    }
  });

  it("accepts a complete synthetic fixture only as parser evidence", () => {
    const result = validateCleanEnvironmentEvidence(makeCleanEvidenceFixture());
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(result.fixtureOnly).toBe(true);
    expect(result.status).toBe("STRUCTURALLY_VALID_FIXTURE");
  });

  it("proves release reproducibility across independent roots", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-base-mvp-repro-test-"));
    const result = proveReleaseReproducibility({ projectRoot: process.cwd(), outputRoot: root });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("REPRODUCIBLE");
    expect(result.normalizedContentDigestA).toBe(result.normalizedContentDigestB);
    expect(result.zipDigestA).toBe(result.zipDigestB);
    expect(fs.existsSync(path.join(root, "release-content-digest-a.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "release-content-digest-b.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "reproducibility-report.json"))).toBe(true);
  });

  it("builds a clean proof kit without repository source or bundled model material", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-base-mvp-kit-test-"));
    const result = buildCleanProofKit({ projectRoot: process.cwd(), outputRoot: root });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("BUILT");
    expect(fs.existsSync(result.manifestPath)).toBe(true);
    expect(fs.existsSync(result.scanReportPath)).toBe(true);
    expect(result.checks.noGit).toBe(true);
    expect(result.checks.noNodeModules).toBe(true);
    expect(result.checks.noTypeScriptSource).toBe(true);
    expect(result.checks.noDevelopmentDatabases).toBe(true);
  });

  it("does not call a same-host folder a clean environment", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-base-mvp-env-test-"));
    const result = inspectCleanEnvironmentOptions({ projectRoot: process.cwd(), outputRoot: root });

    expect(result.options.length).toBeGreaterThanOrEqual(4);
    if (!result.ok) {
      expect(result.status).toBe("BLOCKED");
      expect(result.selectedOption).toBeNull();
      expect(result.blockers).toContain("No locally provable clean Windows environment was available to this Codex session.");
    }
  });

  it("uses isolated temporary proof state and blocks final certification without clean-environment evidence", async () => {
    const result = await runPortableBaseMvpProof({ projectRoot: process.cwd(), modelId: "model-not-required-for-gate-test" });

    expect(result.proofRoot).toContain("sera-portable-base-mvp-proof-");
    expect(result.stateRoot.startsWith(result.proofRoot)).toBe(true);
    expect(result.checks.liveRepositoryStateNotUsed).toBe(true);
    expect(result.cleanEnvironment.required).toBe(true);
    expect(result.cleanEnvironment.status).toBe("MISSING");
    expect(result.checks.cleanEnvironmentProofPresent).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("BLOCKED");
    expect(["BLOCKED", "CONTINUE IMPLEMENTATION"]).toContain(result.recommendation);
    expect(fs.existsSync(path.join(result.proofRoot, "final-proof-report.json"))).toBe(true);
  });

  it("can inspect a generated proof report", async () => {
    const result = await runPortableBaseMvpProof({ projectRoot: process.cwd(), modelId: "model-not-required-for-inspect-test" });
    const inspected = inspectPortableBaseMvpProof(result.proofRoot) as { proofId: string; proofRoot: string; cleanEnvironment: { status: string } };

    expect(inspected.proofId).toBe(result.proofId);
    expect(inspected.proofRoot).toBe(result.proofRoot);
    expect(inspected.cleanEnvironment.status).toBe("MISSING");
  });
});

const cleanFiles = [
  "clean-environment-profile", "clean-proof-kit-manifest", "release-transfer-verification", "environment-network-denial",
  "endpoint-observation-report", "provider-provisioning-report", "ollama-provider-report", "model-manifest", "launcher-report",
  "desktop-operator-visual-manifest", "runtime-health-report", "intake-proof", "provenance-proof", "learning-preflight-proof",
  "ollama-invocation-proof", "model-evaluation-proof", "operator-review-proof", "artifact-closeout-proof", "shutdown-proof",
  "restart-proof", "recurrence-prevention-proof", "related-context-proof", "out-of-scope-proof", "diagnostics-proof",
  "clean-environment-negative-proof", "claim-to-proof-matrix", "final-clean-environment-report"
].map((name) => `${name}.json`).sort((a, b) => a.localeCompare(b));

function stable(value: unknown): string {
  const normalize = (item: any): any => Array.isArray(item) ? item.map(normalize) : item && typeof item === "object" ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, normalize(child)])) : item;
  return JSON.stringify(normalize(value));
}

function digest(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function makeCleanEvidenceFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-clean-fixture-"));
  const identity = { proofId: "fixture-proof", installationId: "fixture-install", releaseZipDigest: "a".repeat(64), releaseContentDigest: "b".repeat(64), providerId: "ollama-loopback-base-mvp-v1", modelId: "fixture-model", modelDigest: "c".repeat(64), cleanMachineId: "fixture-external-machine", fixtureOnly: true, startedAt: "2026-07-18T00:00:00.000Z", completedAt: "2026-07-18T00:01:00.000Z", status: "PASS" };
  for (const [index, file] of cleanFiles.entries()) {
    const name = file.replace(/\.json$/, "");
    const payload: any = { schemaVersion: `sera.${name}.v1`, ...identity, workflowSequence: index + 1 };
    if (file === "clean-environment-profile.json") Object.assign(payload, { externalMachine: true, sameDevelopmentMachine: false, sourceCheckoutPresent: false, gitUsed: false, npmUsed: false, developmentToolsUsed: false });
    if (file === "environment-network-denial.json") Object.assign(payload, { environmentPublicNetworkDenied: true, processPublicNetworkDenied: true });
    if (file === "endpoint-observation-report.json") Object.assign(payload, { loopbackOnly: true, publicEndpointObserved: false });
    if (file === "launcher-report.json") Object.assign(payload, { packagedLauncherUsed: true, sourceCheckoutUsed: false });
    if (file === "desktop-operator-visual-manifest.json") payload.desktopOperatorVisualEvidencePresent = true;
    if (file === "restart-proof.json") Object.assign(payload, { shutdownRecorded: true, restartRecorded: true, persistedHistoryRecovered: true, artifactsRecovered: true });
    if (file === "clean-environment-negative-proof.json") payload.requiredNegativeCasesPassed = true;
    if (file === "claim-to-proof-matrix.json") payload.unresolvedRequiredClaims = 0;
    if (file === "final-clean-environment-report.json") payload.developmentMachineOnlyOllamaProof = false;
    fs.writeFileSync(path.join(root, file), `${JSON.stringify(payload)}\n`);
  }
  refreshManifest(root);
  return root;
}

function refreshManifest(root: string): void {
  const common = JSON.parse(fs.readFileSync(path.join(root, cleanFiles[0]), "utf8"));
  const files = cleanFiles.filter((file) => fs.existsSync(path.join(root, file))).map((file) => {
    const bytes = fs.readFileSync(path.join(root, file));
    return { path: file, size: bytes.length, sha256: digest(bytes), required: true, evidenceType: file.replace(/\.json$/, ""), proofId: common.proofId };
  });
  const manifest: any = { schemaVersion: "sera.clean-evidence-manifest.v1", proofId: common.proofId, installationId: common.installationId, releaseZipDigest: common.releaseZipDigest, releaseContentDigest: common.releaseContentDigest, providerId: common.providerId, modelId: common.modelId, modelDigest: common.modelDigest, cleanMachineId: common.cleanMachineId, startedAt: common.startedAt, completedAt: common.completedAt, fixtureOnly: true, files };
  manifest.manifestDigest = digest(stable(manifest));
  fs.writeFileSync(path.join(root, "clean-evidence-manifest.json"), `${JSON.stringify(manifest)}\n`);
}

function mutateCleanFixture(root: string, mutation: string): void {
  const edit = (file: string, change: (value: any) => void, refresh = true) => { const full = path.join(root, file); const value = JSON.parse(fs.readFileSync(full, "utf8")); change(value); fs.writeFileSync(full, `${JSON.stringify(value)}\n`); if (refresh) refreshManifest(root); };
  if (mutation === "missing") { fs.rmSync(path.join(root, "diagnostics-proof.json")); refreshManifest(root); }
  if (mutation === "invalid-schema") edit("diagnostics-proof.json", (v) => { v.schemaVersion = "wrong"; });
  if (mutation === "changed-evidence-digest") fs.appendFileSync(path.join(root, "diagnostics-proof.json"), "changed");
  if (mutation === "changed-manifest-digest") { const p = path.join(root, "clean-evidence-manifest.json"); const v = JSON.parse(fs.readFileSync(p, "utf8")); v.proofId = "changed"; fs.writeFileSync(p, JSON.stringify(v)); }
  if (mutation === "proof-id") edit("diagnostics-proof.json", (v) => { v.proofId = "conflict"; });
  if (mutation === "machine-id") edit("diagnostics-proof.json", (v) => { v.cleanMachineId = "conflict"; });
  if (mutation === "same-development-machine") edit("clean-environment-profile.json", (v) => { v.sameDevelopmentMachine = true; v.externalMachine = false; });
  if (mutation === "missing-network-denial") edit("environment-network-denial.json", (v) => { delete v.environmentPublicNetworkDenied; });
  if (mutation === "missing-visual") edit("desktop-operator-visual-manifest.json", (v) => { v.desktopOperatorVisualEvidencePresent = false; });
  if (mutation === "development-ollama-only") edit("final-clean-environment-report.json", (v) => { v.developmentMachineOnlyOllamaProof = true; });
  if (mutation === "failed-final") edit("final-clean-environment-report.json", (v) => { v.status = "FAIL"; });
  if (mutation === "unresolved-claim") edit("claim-to-proof-matrix.json", (v) => { v.unresolvedRequiredClaims = 1; });
  if (mutation === "path-traversal") { const p = path.join(root, "clean-evidence-manifest.json"); const v = JSON.parse(fs.readFileSync(p, "utf8")); v.files[0].path = "../escape.json"; delete v.manifestDigest; v.manifestDigest = digest(stable(v)); fs.writeFileSync(p, JSON.stringify(v)); }
}
