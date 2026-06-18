import fs from "node:fs";
import path from "node:path";
import { ArtifactStore } from "@sera/artifacts";
import { SafetyPolicy } from "@sera/safety";
import { createSeraId, isoNow, redactSecrets, SeraStatus, SeraToolEvent } from "@sera/shared";

export type DeveloperEditMode = "suggested" | "direct";

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

function ensureArtifactSubpath(baseDir: string, relativePath: string): string {
  const safeRel = relativePath.split(/[\\/]+/).filter(Boolean).join(path.sep);
  const fullPath = path.join(baseDir, safeRel);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

export class DeveloperWorker {
  edit(input: DeveloperEditInput): DeveloperEditResult {
    let relativePath: string;
    try {
      relativePath = normalizeRelativePath(input.relativePath);
      assertNotProtected(relativePath);
    } catch (err) {
      return this.blocked(input, input.relativePath, err instanceof Error ? err.message : String(err));
    }

    const projectRoot = path.resolve(input.projectRoot);
    const absolutePath = path.resolve(projectRoot, relativePath);
    const decision = input.safety.canWritePath(absolutePath);
    input.artifacts.appendJsonl("safety-events.jsonl", input.safety.toSafetyEvent(input.runId, decision));

    if (decision.decision !== "allow") {
      return this.blocked(input, relativePath, decision.reason, absolutePath);
    }

    if (!fs.existsSync(absolutePath)) {
      return this.noOp(input, relativePath, absolutePath, "Target file does not exist. Developer Worker v1 edits existing files only.");
    }

    if (!input.find) {
      return this.noOp(input, relativePath, absolutePath, "Find text is empty. Refusing ambiguous edit.");
    }

    const before = fs.readFileSync(absolutePath, "utf8");
    const occurrences = countOccurrences(before, input.find);
    if (occurrences === 0) {
      return this.noOp(input, relativePath, absolutePath, "Find text was not found. No changes applied.");
    }

    const after = replaceAllLiteral(before, input.find, input.replaceWith);
    if (after === before) {
      return this.noOp(input, relativePath, absolutePath, "Replacement produced no content change.");
    }

    if (input.mode === "suggested") {
      return this.writeSuggestion(input, relativePath, absolutePath, before, after, occurrences);
    }

    return this.applyDirect(input, relativePath, absolutePath, before, after, occurrences, projectRoot);
  }

  private writeSuggestion(
    input: DeveloperEditInput,
    relativePath: string,
    absolutePath: string,
    before: string,
    after: string,
    occurrences: number
  ): DeveloperEditResult {
    const suggestionsDir = path.join(input.artifacts.runDir, "artifacts", "suggestions");
    const suggestionPath = ensureArtifactSubpath(suggestionsDir, `${relativePath}.suggested`);
    fs.writeFileSync(suggestionPath, after, "utf8");
    input.artifacts.writeJson(path.join("artifacts", "developer-edit-suggestion.json"), {
      id: createSeraId("dev_suggestion"),
      createdAt: isoNow(),
      mode: "suggested",
      relativePath,
      absolutePath,
      occurrences,
      suggestionPath,
      preview: redactSecrets({ find: input.find, replaceWith: input.replaceWith })
    });
    this.logTool(input, "suggestEdit", true, `Suggested edit created for ${relativePath}.`, absolutePath, { occurrences, suggestionPath });
    return {
      ok: true,
      status: "completed",
      mode: "suggested",
      relativePath,
      absolutePath,
      changed: false,
      occurrences,
      suggestionPath,
      message: "Suggested edit created. Source file was not modified."
    };
  }

  private applyDirect(
    input: DeveloperEditInput,
    relativePath: string,
    absolutePath: string,
    before: string,
    after: string,
    occurrences: number,
    projectRoot: string
  ): DeveloperEditResult {
    const backupDir = path.join(input.artifacts.runDir, "artifacts", "backups");
    const backupPath = ensureArtifactSubpath(backupDir, relativePath);
    fs.writeFileSync(backupPath, before, "utf8");
    fs.writeFileSync(absolutePath, after, "utf8");

    const validation = input.validate?.({ projectRoot, absolutePath, relativePath, before, after });
    if (validation && !validation.ok) {
      fs.writeFileSync(absolutePath, before, "utf8");
      input.artifacts.writeJson(path.join("artifacts", "developer-edit-rollback.json"), {
        id: createSeraId("dev_rollback"),
        createdAt: isoNow(),
        relativePath,
        absolutePath,
        backupPath,
        reason: validation.message
      });
      this.logTool(input, "directEditRollback", false, validation.message, absolutePath, { occurrences, backupPath });
      return {
        ok: false,
        status: "failed",
        mode: "direct",
        relativePath,
        absolutePath,
        changed: false,
        occurrences,
        backupPath,
        restored: true,
        message: `Validation failed after direct edit. Original file restored. ${validation.message}`
      };
    }

    input.artifacts.writeJson(path.join("artifacts", "developer-edit-direct.json"), {
      id: createSeraId("dev_edit"),
      createdAt: isoNow(),
      mode: "direct",
      relativePath,
      absolutePath,
      occurrences,
      backupPath,
      validation: validation ?? { ok: true, message: "No validator supplied for Developer Worker v1 text edit." }
    });
    this.logTool(input, "directEdit", true, `Direct edit applied to ${relativePath}.`, absolutePath, { occurrences, backupPath });
    return {
      ok: true,
      status: "completed_with_changes",
      mode: "direct",
      relativePath,
      absolutePath,
      changed: true,
      occurrences,
      backupPath,
      message: `Direct edit applied. Replaced ${occurrences} occurrence(s). Backup captured in artifacts.`
    };
  }

  private noOp(input: DeveloperEditInput, relativePath: string, absolutePath: string, message: string): DeveloperEditResult {
    this.logTool(input, "editNoOp", true, message, absolutePath);
    return {
      ok: true,
      status: "no_op",
      mode: input.mode,
      relativePath,
      absolutePath,
      changed: false,
      occurrences: 0,
      message
    };
  }

  private blocked(input: DeveloperEditInput, relativePath: string, message: string, absolutePath?: string): DeveloperEditResult {
    this.logTool(input, "editBlocked", false, message, absolutePath);
    return {
      ok: false,
      status: "blocked",
      mode: input.mode,
      relativePath,
      absolutePath,
      changed: false,
      occurrences: 0,
      message
    };
  }

  private logTool(
    input: DeveloperEditInput,
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
