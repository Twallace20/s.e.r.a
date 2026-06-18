import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { createSeraId, isoNow, redactSecrets, SeraStatus, SeraToolEvent } from "@sera/shared";

export type DeveloperEditMode = "suggested" | "direct";
export type DeveloperPatchMode = "suggested" | "direct";

export interface DeveloperEditInput {
  runId: string;
  projectRoot: string;
  relativePath: string;
  find: string;
  replaceWith: string;
  mode: DeveloperEditMode;
  artifacts: ArtifactStore;
  safety: SafetyPolicy;
  validate?: (context: DeveloperValidationContext) => DeveloperValidationResult;
}

export interface DeveloperInspectInput {
  runId: string;
  projectRoot: string;
  relativePath: string;
  artifacts: ArtifactStore;
  safety: SafetyPolicy;
}

export interface DeveloperPatchOperation {
  kind: "replace";
  find: string;
  replaceWith: string;
  expectedOccurrences?: number;
}

export interface DeveloperPatchInput {
  runId: string;
  projectRoot: string;
  relativePath: string;
  operations: DeveloperPatchOperation[];
  mode: DeveloperPatchMode;
  artifacts: ArtifactStore;
  safety: SafetyPolicy;
  validate?: (context: DeveloperValidationContext) => DeveloperValidationResult;
}

export interface DeveloperValidationContext {
  projectRoot: string;
  absolutePath: string;
  relativePath: string;
  before: string;
  after: string;
}

export interface DeveloperValidationResult {
  ok: boolean;
  message: string;
}

export interface DeveloperEditResult {
  ok: boolean;
  status: SeraStatus;
  mode: DeveloperEditMode;
  relativePath: string;
  absolutePath?: string;
  changed: boolean;
  occurrences: number;
  message: string;
  suggestionPath?: string;
  backupPath?: string;
  restored?: boolean;
}

export interface DeveloperInspectResult {
  ok: boolean;
  status: SeraStatus;
  relativePath: string;
  absolutePath?: string;
  exists: boolean;
  message: string;
  artifactPath?: string;
  sizeBytes?: number;
  lineCount?: number;
  sha256?: string;
}

export interface DeveloperPatchResult {
  ok: boolean;
  status: SeraStatus;
  mode: DeveloperPatchMode;
  relativePath: string;
  absolutePath?: string;
  changed: boolean;
  totalOccurrences: number;
  operationCount: number;
  message: string;
  patchArtifactPath?: string;
  backupPath?: string;
  restored?: boolean;
  validation?: DeveloperValidationResult;
}

interface ResolvedTarget {
  relativePath: string;
  absolutePath: string;
  projectRoot: string;
}

interface PatchRenderResult {
  ok: boolean;
  status: SeraStatus;
  message: string;
  after: string;
  totalOccurrences: number;
  operationSummaries: Array<{
    index: number;
    kind: "replace";
    occurrences: number;
    expectedOccurrences?: number;
  }>;
}

const protectedPathSegments = new Set([".git", "node_modules", "dist", ".sera-runs", ".sera-cert"]);
const protectedBasenames = new Set([".env", ".env.local", ".env.production", ".npmrc"]);

function normalizeRelativePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^([/\\])+/, "");
  if (!normalized || normalized === ".") {
    throw new Error("A relative file path is required.");
  }
  if (path.isAbsolute(relativePath) || normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) {
    throw new Error("Developer Worker paths must be relative and cannot escape the project root.");
  }
  return normalized;
}

function assertNotProtected(relativePath: string): void {
  const parts = relativePath.split(/[\\/]+/).filter(Boolean);
  const basename = parts[parts.length - 1]?.toLowerCase() ?? "";
  if (protectedBasenames.has(basename)) {
    throw new Error(`Developer Worker refuses to edit protected file '${relativePath}'.`);
  }
  for (const part of parts) {
    if (protectedPathSegments.has(part)) {
      throw new Error(`Developer Worker refuses to edit protected path '${relativePath}'.`);
    }
  }
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

function replaceAllLiteral(text: string, find: string, replaceWith: string): string {
  return text.split(find).join(replaceWith);
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function ensureArtifactSubpath(baseDir: string, relativePath: string): string {
  const safeRel = relativePath.split(/[\\/]+/).filter(Boolean).join(path.sep);
  const fullPath = path.join(baseDir, safeRel);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

function lineCount(text: string): number {
  if (text.length === 0) return 0;
  return text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;
}

export class DeveloperWorker {
  inspect(input: DeveloperInspectInput): DeveloperInspectResult {
    const resolved = this.resolveTarget(input, input.relativePath, "read");
    if (!resolved.ok) {
      return {
        ok: false,
        status: "blocked",
        relativePath: input.relativePath,
        absolutePath: resolved.absolutePath,
        exists: false,
        message: resolved.message
      };
    }

    const { relativePath, absolutePath } = resolved.target;
    if (!fs.existsSync(absolutePath)) {
      this.logTool(input, "inspectNoOp", true, "Target file does not exist.", absolutePath);
      return {
        ok: true,
        status: "no_op",
        relativePath,
        absolutePath,
        exists: false,
        message: "Target file does not exist. No inspection artifact created."
      };
    }

    const text = fs.readFileSync(absolutePath, "utf8");
    const inspection = {
      id: createSeraId("dev_inspect"),
      createdAt: isoNow(),
      relativePath,
      absolutePath,
      exists: true,
      sizeBytes: Buffer.byteLength(text, "utf8"),
      lineCount: lineCount(text),
      charCount: text.length,
      sha256: sha256(text)
    };
    const artifactPath = ensureArtifactSubpath(path.join(input.artifacts.runDir, "artifacts", "inspections"), `${relativePath}.inspection.json`);
    fs.writeFileSync(artifactPath, redactSecrets(JSON.stringify(inspection, null, 2)) + "\n", "utf8");
    this.logTool(input, "inspect", true, `Inspection artifact created for ${relativePath}.`, absolutePath, { artifactPath });
    return {
      ok: true,
      status: "completed",
      relativePath,
      absolutePath,
      exists: true,
      message: "Inspection artifact created. Source file was not modified.",
      artifactPath,
      sizeBytes: inspection.sizeBytes,
      lineCount: inspection.lineCount,
      sha256: inspection.sha256
    };
  }

  edit(input: DeveloperEditInput): DeveloperEditResult {
    const patch = this.patch({
      runId: input.runId,
      projectRoot: input.projectRoot,
      relativePath: input.relativePath,
      operations: [{ kind: "replace", find: input.find, replaceWith: input.replaceWith }],
      mode: input.mode,
      artifacts: input.artifacts,
      safety: input.safety,
      validate: input.validate
    });

    return {
      ok: patch.ok,
      status: patch.status,
      mode: input.mode,
      relativePath: patch.relativePath,
      absolutePath: patch.absolutePath,
      changed: patch.changed,
      occurrences: patch.totalOccurrences,
      message: patch.message,
      suggestionPath: patch.patchArtifactPath,
      backupPath: patch.backupPath,
      restored: patch.restored
    };
  }

  patch(input: DeveloperPatchInput): DeveloperPatchResult {
    const resolved = this.resolveTarget(input, input.relativePath, "write");
    if (!resolved.ok) {
      return this.patchBlocked(input, input.relativePath, resolved.message, resolved.absolutePath);
    }

    const { relativePath, absolutePath, projectRoot } = resolved.target;
    if (!fs.existsSync(absolutePath)) {
      return this.patchNoOp(input, relativePath, absolutePath, "Target file does not exist. Developer Worker v2 patches existing files only.");
    }

    const before = fs.readFileSync(absolutePath, "utf8");
    const rendered = this.renderPatch(before, input.operations);
    if (!rendered.ok) {
      if (rendered.status === "blocked") {
        return this.patchBlocked(input, relativePath, rendered.message, absolutePath);
      }
      return this.patchNoOp(input, relativePath, absolutePath, rendered.message);
    }

    if (rendered.after === before) {
      return this.patchNoOp(input, relativePath, absolutePath, "Patch produced no content change.");
    }

    if (input.mode === "suggested") {
      return this.writePatchSuggestion(input, relativePath, absolutePath, before, rendered);
    }

    return this.applyPatchDirect(input, relativePath, absolutePath, before, rendered, projectRoot);
  }

  private resolveTarget(
    input: { projectRoot: string; artifacts: ArtifactStore; safety: SafetyPolicy; runId: string },
    rawRelativePath: string,
    access: "read" | "write"
  ):
    | { ok: true; target: ResolvedTarget }
    | { ok: false; message: string; absolutePath?: string } {
    let relativePath: string;
    try {
      relativePath = normalizeRelativePath(rawRelativePath);
      assertNotProtected(relativePath);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }

    const projectRoot = path.resolve(input.projectRoot);
    const absolutePath = path.resolve(projectRoot, relativePath);
    const decision = access === "read" ? input.safety.canReadPath(absolutePath) : input.safety.canWritePath(absolutePath);
    input.artifacts.appendJsonl("safety-events.jsonl", input.safety.toSafetyEvent(input.runId, decision));

    if (decision.decision !== "allow") {
      return { ok: false, message: decision.reason, absolutePath };
    }
    return { ok: true, target: { relativePath, absolutePath, projectRoot } };
  }

  private renderPatch(before: string, operations: DeveloperPatchOperation[]): PatchRenderResult {
    if (operations.length === 0) {
      return { ok: false, status: "no_op", message: "Patch contains no operations.", after: before, totalOccurrences: 0, operationSummaries: [] };
    }

    let after = before;
    let totalOccurrences = 0;
    const operationSummaries: PatchRenderResult["operationSummaries"] = [];
    for (const [index, operation] of operations.entries()) {
      if (operation.kind !== "replace") {
        return { ok: false, status: "blocked", message: `Unsupported patch operation at index ${index}.`, after, totalOccurrences, operationSummaries };
      }
      if (!operation.find) {
        return { ok: false, status: "blocked", message: `Patch operation ${index} has empty find text. Refusing ambiguous patch.`, after, totalOccurrences, operationSummaries };
      }
      const occurrences = countOccurrences(after, operation.find);
      if (typeof operation.expectedOccurrences === "number" && occurrences !== operation.expectedOccurrences) {
        return {
          ok: false,
          status: "blocked",
          message: `Patch operation ${index} expected ${operation.expectedOccurrences} occurrence(s) but found ${occurrences}. Refusing patch.`,
          after,
          totalOccurrences,
          operationSummaries
        };
      }
      if (occurrences === 0) {
        return { ok: false, status: "no_op", message: `Patch operation ${index} find text was not found. No changes applied.`, after, totalOccurrences, operationSummaries };
      }
      after = replaceAllLiteral(after, operation.find, operation.replaceWith);
      totalOccurrences += occurrences;
      operationSummaries.push({ index, kind: "replace", occurrences, expectedOccurrences: operation.expectedOccurrences });
    }
    return { ok: true, status: "completed_with_changes", message: "Patch rendered successfully.", after, totalOccurrences, operationSummaries };
  }

  private writePatchSuggestion(
    input: DeveloperPatchInput,
    relativePath: string,
    absolutePath: string,
    before: string,
    rendered: PatchRenderResult
  ): DeveloperPatchResult {
    const patchesDir = path.join(input.artifacts.runDir, "artifacts", "patches");
    const patchArtifactPath = ensureArtifactSubpath(patchesDir, `${relativePath}.patched`);
    fs.writeFileSync(patchArtifactPath, rendered.after, "utf8");
    input.artifacts.writeJson(path.join("artifacts", "developer-patch-suggestion.json"), {
      id: createSeraId("dev_patch_suggestion"),
      createdAt: isoNow(),
      mode: "suggested",
      relativePath,
      absolutePath,
      totalOccurrences: rendered.totalOccurrences,
      operationCount: input.operations.length,
      operations: redactSecrets(input.operations),
      operationSummaries: rendered.operationSummaries,
      beforeSha256: sha256(before),
      afterSha256: sha256(rendered.after),
      patchArtifactPath
    });
    this.logTool(input, "suggestPatch", true, `Patch suggestion created for ${relativePath}.`, absolutePath, {
      totalOccurrences: rendered.totalOccurrences,
      operationCount: input.operations.length,
      patchArtifactPath
    });
    return {
      ok: true,
      status: "completed",
      mode: "suggested",
      relativePath,
      absolutePath,
      changed: false,
      totalOccurrences: rendered.totalOccurrences,
      operationCount: input.operations.length,
      patchArtifactPath,
      message: "Patch suggestion created. Source file was not modified."
    };
  }

  private applyPatchDirect(
    input: DeveloperPatchInput,
    relativePath: string,
    absolutePath: string,
    before: string,
    rendered: PatchRenderResult,
    projectRoot: string
  ): DeveloperPatchResult {
    const backupDir = path.join(input.artifacts.runDir, "artifacts", "backups");
    const backupPath = ensureArtifactSubpath(backupDir, relativePath);
    fs.writeFileSync(backupPath, before, "utf8");
    fs.writeFileSync(absolutePath, rendered.after, "utf8");

    const validation = input.validate?.({ projectRoot, absolutePath, relativePath, before, after: rendered.after });
    if (validation && !validation.ok) {
      fs.writeFileSync(absolutePath, before, "utf8");
      input.artifacts.writeJson(path.join("artifacts", "developer-patch-rollback.json"), {
        id: createSeraId("dev_patch_rollback"),
        createdAt: isoNow(),
        relativePath,
        absolutePath,
        backupPath,
        reason: validation.message,
        beforeSha256: sha256(before),
        failedAfterSha256: sha256(rendered.after)
      });
      this.logTool(input, "directPatchRollback", false, validation.message, absolutePath, {
        totalOccurrences: rendered.totalOccurrences,
        operationCount: input.operations.length,
        backupPath
      });
      return {
        ok: false,
        status: "failed",
        mode: "direct",
        relativePath,
        absolutePath,
        changed: false,
        totalOccurrences: rendered.totalOccurrences,
        operationCount: input.operations.length,
        backupPath,
        restored: true,
        validation,
        message: `Validation failed after direct patch. Original file restored. ${validation.message}`
      };
    }

    input.artifacts.writeJson(path.join("artifacts", "developer-patch-direct.json"), {
      id: createSeraId("dev_patch"),
      createdAt: isoNow(),
      mode: "direct",
      relativePath,
      absolutePath,
      totalOccurrences: rendered.totalOccurrences,
      operationCount: input.operations.length,
      operations: redactSecrets(input.operations),
      operationSummaries: rendered.operationSummaries,
      backupPath,
      beforeSha256: sha256(before),
      afterSha256: sha256(rendered.after),
      validation: validation ?? { ok: true, message: "No validator supplied for Developer Worker v2 patch." }
    });
    this.logTool(input, "directPatch", true, `Direct patch applied to ${relativePath}.`, absolutePath, {
      totalOccurrences: rendered.totalOccurrences,
      operationCount: input.operations.length,
      backupPath
    });
    return {
      ok: true,
      status: "completed_with_changes",
      mode: "direct",
      relativePath,
      absolutePath,
      changed: true,
      totalOccurrences: rendered.totalOccurrences,
      operationCount: input.operations.length,
      backupPath,
      validation: validation ?? { ok: true, message: "No validator supplied for Developer Worker v2 patch." },
      message: `Direct patch applied. Replaced ${rendered.totalOccurrences} occurrence(s) across ${input.operations.length} operation(s). Backup captured in artifacts.`
    };
  }

  private patchNoOp(input: DeveloperPatchInput, relativePath: string, absolutePath: string, message: string): DeveloperPatchResult {
    this.logTool(input, "patchNoOp", true, message, absolutePath);
    return {
      ok: true,
      status: "no_op",
      mode: input.mode,
      relativePath,
      absolutePath,
      changed: false,
      totalOccurrences: 0,
      operationCount: input.operations.length,
      message
    };
  }

  private patchBlocked(input: DeveloperPatchInput, relativePath: string, message: string, absolutePath?: string): DeveloperPatchResult {
    this.logTool(input, "patchBlocked", false, message, absolutePath);
    return {
      ok: false,
      status: "blocked",
      mode: input.mode,
      relativePath,
      absolutePath,
      changed: false,
      totalOccurrences: 0,
      operationCount: input.operations.length,
      message
    };
  }

  private logTool(
    input: { runId: string; artifacts: ArtifactStore },
    action: string,
    ok: boolean,
    message: string,
    target?: string,
    metadata?: Record<string, unknown>
  ): void {
    const event: SeraToolEvent = {
      ts: isoNow(),
      runId: input.runId,
      tool: "DeveloperWorker",
      action,
      ok,
      message: redactSecrets(message),
      target,
      metadata
    };
    input.artifacts.appendJsonl("tool-events.jsonl", event);
  }
}
