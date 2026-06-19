import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { createSeraId, isoNow, redactSecrets, SeraStatus, SeraToolEvent } from "@sera/shared";
import { DeveloperValidationResult } from "./developer-worker";

export type DeveloperMultiPatchMode = "suggested" | "direct";

export interface DeveloperMultiPatchOperation {
  kind: "replace";
  find: string;
  replaceWith: string;
  expectedOccurrences?: number;
}

export interface DeveloperMultiPatchTarget {
  relativePath: string;
  operations: DeveloperMultiPatchOperation[];
}

export interface DeveloperMultiValidationFileContext {
  relativePath: string;
  absolutePath: string;
  before: string;
  after: string;
}

export interface DeveloperMultiValidationContext {
  projectRoot: string;
  files: DeveloperMultiValidationFileContext[];
}

export interface DeveloperMultiPatchInput {
  runId: string;
  projectRoot: string;
  targets: DeveloperMultiPatchTarget[];
  mode: DeveloperMultiPatchMode;
  artifacts: ArtifactStore;
  safety: SafetyPolicy;
  validate?: (context: DeveloperMultiValidationContext) => DeveloperValidationResult;
}

export interface DeveloperMultiPatchFileResult {
  relativePath: string;
  absolutePath?: string;
  changed: boolean;
  totalOccurrences: number;
  operationCount: number;
  message: string;
  patchArtifactPath?: string;
  backupPath?: string;
  restored?: boolean;
  beforeSha256?: string;
  afterSha256?: string;
}

export interface DeveloperMultiPatchResult {
  ok: boolean;
  status: SeraStatus;
  mode: DeveloperMultiPatchMode;
  changed: boolean;
  fileCount: number;
  changedFileCount: number;
  totalOccurrences: number;
  message: string;
  files: DeveloperMultiPatchFileResult[];
  manifestPath?: string;
  validation?: DeveloperValidationResult;
  restored?: boolean;
}

interface ResolvedMultiTarget {
  relativePath: string;
  absolutePath: string;
  projectRoot: string;
  operations: DeveloperMultiPatchOperation[];
}

interface RenderedMultiTarget extends ResolvedMultiTarget {
  before: string;
  after: string;
  totalOccurrences: number;
  operationSummaries: Array<{
    index: number;
    kind: "replace";
    occurrences: number;
    expectedOccurrences?: number;
  }>;
}

const protectedPathSegments = new Set([
  ".git",
  "node_modules",
  "dist",
  ".sera-runs",
  ".sera-cert",
  ".sera-memory",
  ".sera-tasks",
  ".sera-knowledge",
  ".sera-models",
  ".sera-autonomy",
  ".sera-console"
]);
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
    throw new Error(`Developer Multi-File Worker refuses to edit protected file '${relativePath}'.`);
  }
  for (const part of parts) {
    if (protectedPathSegments.has(part)) {
      throw new Error(`Developer Multi-File Worker refuses to edit protected path '${relativePath}'.`);
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

export class MultiFileDeveloperWorker {
  multiPatch(input: DeveloperMultiPatchInput): DeveloperMultiPatchResult {
    if (input.targets.length === 0) {
      return this.blocked(input, "Multi-file patch requires at least one target.");
    }

    const resolved = this.resolveTargets(input);
    if (!resolved.ok) {
      return this.blocked(input, resolved.message, resolved.files);
    }

    const rendered = this.renderTargets(input, resolved.targets);
    if (!rendered.ok) {
      return this.blocked(input, rendered.message, rendered.files);
    }

    const changedTargets = rendered.targets.filter((target) => target.after !== target.before);
    if (changedTargets.length === 0) {
      this.logTool(input, "multiPatchNoOp", true, "Multi-file patch produced no source changes.");
      return {
        ok: true,
        status: "no_op",
        mode: input.mode,
        changed: false,
        fileCount: rendered.targets.length,
        changedFileCount: 0,
        totalOccurrences: rendered.targets.reduce((sum, target) => sum + target.totalOccurrences, 0),
        message: "Multi-file patch produced no source changes.",
        files: rendered.targets.map((target) => this.toFileResult(target, false, "No source change."))
      };
    }

    if (input.mode === "suggested") {
      return this.writeMultiPatchSuggestion(input, rendered.targets);
    }

    return this.applyMultiPatchDirect(input, rendered.targets);
  }

  private resolveTargets(input: DeveloperMultiPatchInput):
    | { ok: true; targets: ResolvedMultiTarget[] }
    | { ok: false; message: string; files: DeveloperMultiPatchFileResult[] } {
    const seen = new Set<string>();
    const targets: ResolvedMultiTarget[] = [];
    const files: DeveloperMultiPatchFileResult[] = [];

    for (const target of input.targets) {
      let relativePath: string;
      try {
        relativePath = normalizeRelativePath(target.relativePath);
        assertNotProtected(relativePath);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        files.push({ relativePath: target.relativePath, changed: false, totalOccurrences: 0, operationCount: target.operations.length, message });
        return { ok: false, message, files };
      }

      if (seen.has(relativePath)) {
        const message = `Duplicate multi-file patch target: ${relativePath}`;
        files.push({ relativePath, changed: false, totalOccurrences: 0, operationCount: target.operations.length, message });
        return { ok: false, message, files };
      }
      seen.add(relativePath);

      const projectRoot = path.resolve(input.projectRoot);
      const absolutePath = path.resolve(projectRoot, relativePath);
      const decision = input.safety.canWritePath(absolutePath);
      input.artifacts.appendJsonl("safety-events.jsonl", input.safety.toSafetyEvent(input.runId, decision));
      if (decision.decision !== "allow") {
        const message = decision.reason;
        files.push({ relativePath, absolutePath, changed: false, totalOccurrences: 0, operationCount: target.operations.length, message });
        return { ok: false, message, files };
      }
      if (!fs.existsSync(absolutePath)) {
        const message = `Target file does not exist. Multi-File Developer Worker patches existing files only: ${relativePath}`;
        files.push({ relativePath, absolutePath, changed: false, totalOccurrences: 0, operationCount: target.operations.length, message });
        return { ok: false, message, files };
      }

      targets.push({ relativePath, absolutePath, projectRoot, operations: target.operations });
    }

    return { ok: true, targets };
  }

  private renderTargets(input: DeveloperMultiPatchInput, targets: ResolvedMultiTarget[]):
    | { ok: true; targets: RenderedMultiTarget[] }
    | { ok: false; message: string; files: DeveloperMultiPatchFileResult[] } {
    const renderedTargets: RenderedMultiTarget[] = [];
    const files: DeveloperMultiPatchFileResult[] = [];

    for (const target of targets) {
      const before = fs.readFileSync(target.absolutePath, "utf8");
      let after = before;
      let totalOccurrences = 0;
      const operationSummaries: RenderedMultiTarget["operationSummaries"] = [];

      if (target.operations.length === 0) {
        const message = `Multi-file patch target has no operations: ${target.relativePath}`;
        files.push(this.toFileResult({ ...target, before, after, totalOccurrences, operationSummaries }, false, message));
        return { ok: false, message, files };
      }

      for (const [index, operation] of target.operations.entries()) {
        if (operation.kind !== "replace") {
          const message = `Unsupported multi-file patch operation at ${target.relativePath}#${index}.`;
          files.push(this.toFileResult({ ...target, before, after, totalOccurrences, operationSummaries }, false, message));
          return { ok: false, message, files };
        }
        if (!operation.find) {
          const message = `Multi-file patch operation ${index} in ${target.relativePath} has empty find text.`;
          files.push(this.toFileResult({ ...target, before, after, totalOccurrences, operationSummaries }, false, message));
          return { ok: false, message, files };
        }
        const occurrences = countOccurrences(after, operation.find);
        if (typeof operation.expectedOccurrences === "number" && occurrences !== operation.expectedOccurrences) {
          const message = `Multi-file patch operation ${index} in ${target.relativePath} expected ${operation.expectedOccurrences} occurrence(s) but found ${occurrences}. Refusing the entire batch.`;
          files.push(this.toFileResult({ ...target, before, after, totalOccurrences, operationSummaries }, false, message));
          return { ok: false, message, files };
        }
        if (occurrences === 0) {
          const message = `Multi-file patch operation ${index} find text was not found in ${target.relativePath}. Refusing the entire batch.`;
          files.push(this.toFileResult({ ...target, before, after, totalOccurrences, operationSummaries }, false, message));
          return { ok: false, message, files };
        }
        after = replaceAllLiteral(after, operation.find, operation.replaceWith);
        totalOccurrences += occurrences;
        operationSummaries.push({ index, kind: "replace", occurrences, expectedOccurrences: operation.expectedOccurrences });
      }
      renderedTargets.push({ ...target, before, after, totalOccurrences, operationSummaries });
    }

    return { ok: true, targets: renderedTargets };
  }

  private writeMultiPatchSuggestion(input: DeveloperMultiPatchInput, targets: RenderedMultiTarget[]): DeveloperMultiPatchResult {
    const files: DeveloperMultiPatchFileResult[] = [];
    for (const target of targets) {
      const patchArtifactPath = ensureArtifactSubpath(path.join(input.artifacts.runDir, "artifacts", "multi-file-patches"), `${target.relativePath}.patched`);
      fs.writeFileSync(patchArtifactPath, target.after, "utf8");
      files.push({ ...this.toFileResult(target, false, "Patch suggestion created. Source file was not modified."), patchArtifactPath });
    }
    const manifestPath = input.artifacts.writeJson(path.join("artifacts", "developer-multi-patch-suggestion.json"), this.createManifest(input, targets, files, "suggested"));
    this.logTool(input, "suggestMultiPatch", true, `Multi-file patch suggestion created for ${targets.length} file(s).`, undefined, { fileCount: targets.length, manifestPath });
    return {
      ok: true,
      status: "completed",
      mode: "suggested",
      changed: false,
      fileCount: targets.length,
      changedFileCount: 0,
      totalOccurrences: targets.reduce((sum, target) => sum + target.totalOccurrences, 0),
      message: "Multi-file patch suggestion created. Source files were not modified.",
      files,
      manifestPath
    };
  }

  private applyMultiPatchDirect(input: DeveloperMultiPatchInput, targets: RenderedMultiTarget[]): DeveloperMultiPatchResult {
    const files: DeveloperMultiPatchFileResult[] = [];
    const backups: Array<{ target: RenderedMultiTarget; backupPath: string }> = [];

    for (const target of targets) {
      const backupPath = ensureArtifactSubpath(path.join(input.artifacts.runDir, "artifacts", "multi-file-backups"), target.relativePath);
      fs.writeFileSync(backupPath, target.before, "utf8");
      backups.push({ target, backupPath });
    }

    for (const target of targets) {
      fs.writeFileSync(target.absolutePath, target.after, "utf8");
    }

    const validation = input.validate?.({
      projectRoot: path.resolve(input.projectRoot),
      files: targets.map((target) => ({ relativePath: target.relativePath, absolutePath: target.absolutePath, before: target.before, after: target.after }))
    });

    if (validation && !validation.ok) {
      for (const { target } of backups) {
        fs.writeFileSync(target.absolutePath, target.before, "utf8");
      }
      for (const { target, backupPath } of backups) {
        files.push({ ...this.toFileResult(target, false, `Validation failed. Original file restored. ${validation.message}`), backupPath, restored: true });
      }
      const manifestPath = input.artifacts.writeJson(path.join("artifacts", "developer-multi-patch-rollback.json"), {
        ...this.createManifest(input, targets, files, "direct"),
        restored: true,
        validation
      });
      this.logTool(input, "directMultiPatchRollback", false, validation.message, undefined, { fileCount: targets.length, manifestPath });
      return {
        ok: false,
        status: "failed",
        mode: "direct",
        changed: false,
        fileCount: targets.length,
        changedFileCount: 0,
        totalOccurrences: targets.reduce((sum, target) => sum + target.totalOccurrences, 0),
        message: `Validation failed after multi-file patch. Original files restored. ${validation.message}`,
        files,
        manifestPath,
        validation,
        restored: true
      };
    }

    for (const { target, backupPath } of backups) {
      files.push({ ...this.toFileResult(target, true, "Direct multi-file patch applied with backup."), backupPath, restored: false });
    }
    const finalValidation = validation ?? { ok: true, message: "No validator supplied for Multi-File Developer Worker v3 patch." };
    const manifestPath = input.artifacts.writeJson(path.join("artifacts", "developer-multi-patch-direct.json"), {
      ...this.createManifest(input, targets, files, "direct"),
      validation: finalValidation
    });
    this.logTool(input, "directMultiPatch", true, `Direct multi-file patch applied to ${targets.length} file(s).`, undefined, { fileCount: targets.length, manifestPath });
    return {
      ok: true,
      status: "completed_with_changes",
      mode: "direct",
      changed: true,
      fileCount: targets.length,
      changedFileCount: files.filter((file) => file.changed).length,
      totalOccurrences: targets.reduce((sum, target) => sum + target.totalOccurrences, 0),
      message: `Direct multi-file patch applied to ${targets.length} file(s). Backups captured in artifacts.`,
      files,
      manifestPath,
      validation: finalValidation,
      restored: false
    };
  }

  private toFileResult(target: RenderedMultiTarget, changed: boolean, message: string): DeveloperMultiPatchFileResult {
    return {
      relativePath: target.relativePath,
      absolutePath: target.absolutePath,
      changed,
      totalOccurrences: target.totalOccurrences,
      operationCount: target.operations.length,
      message,
      beforeSha256: sha256(target.before),
      afterSha256: sha256(target.after)
    };
  }

  private createManifest(input: DeveloperMultiPatchInput, targets: RenderedMultiTarget[], files: DeveloperMultiPatchFileResult[], mode: DeveloperMultiPatchMode): Record<string, unknown> {
    return {
      id: createSeraId("dev_multi_patch"),
      createdAt: isoNow(),
      mode,
      fileCount: targets.length,
      changedFileCount: files.filter((file) => file.changed).length,
      totalOccurrences: targets.reduce((sum, target) => sum + target.totalOccurrences, 0),
      targets: targets.map((target) => ({
        relativePath: target.relativePath,
        absolutePath: target.absolutePath,
        operationCount: target.operations.length,
        operations: redactSecrets(target.operations),
        operationSummaries: target.operationSummaries,
        beforeSha256: sha256(target.before),
        afterSha256: sha256(target.after)
      })),
      files
    };
  }

  private blocked(input: DeveloperMultiPatchInput, message: string, files: DeveloperMultiPatchFileResult[] = []): DeveloperMultiPatchResult {
    this.logTool(input, "multiPatchBlocked", false, message);
    return {
      ok: false,
      status: "blocked",
      mode: input.mode,
      changed: false,
      fileCount: input.targets.length,
      changedFileCount: 0,
      totalOccurrences: 0,
      message,
      files
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
      tool: "MultiFileDeveloperWorker",
      action,
      ok,
      message: redactSecrets(message),
      target,
      metadata
    };
    input.artifacts.appendJsonl("tool-events.jsonl", event);
  }
}
