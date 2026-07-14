import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type ExecutionResult } from "@sera/contracts";
import { runRepositorySnapshot } from "@sera/repository-snapshot";
import { runRepositoryTruth } from "@sera/repository-truth";
import { isPathInside, normalizePath, redactSecrets } from "@sera/shared";

export const CONTROL_PLANE_SCHEMA_VERSION = "sera.control-plane.v1";
export const CONTROL_PLANE_VERSION = "control-plane-v1";

export type ControlPlaneAttemptStatus = "PENDING" | "READY" | "RUNNING" | "BLOCKED" | "FAILED" | "CANCELLED" | "COMPLETED" | "COMPLETED_WITH_WARNINGS";
export type ControlPlaneStageStatus = "PENDING" | "READY" | "RUNNING" | "BLOCKED" | "FAILED" | "SKIPPED" | "CANCELLED" | "COMPLETED";
export type ControlPlaneGateStatus = "PENDING" | "PASS" | "FAIL" | "BLOCKED" | "NOT_APPLICABLE";
export type ControlPlaneTerminalDecision = "COMPLETE" | "COMPLETE_WITH_WARNINGS" | "BLOCK" | "FAIL" | "CANCEL";
export type ControlPlaneGateType = "precondition" | "permission" | "capability" | "execution" | "verification" | "evaluation" | "repeatability" | "safety" | "owner-approval" | "closeout";
export type ControlPlaneExecutionMode = "emit-evidence" | "validate-file" | "compare-hash" | "warning" | "fail" | "block" | "timeout" | "cancel" | "noop";

export interface ControlPlaneClock {
  now(): Date;
}

export interface ControlPlaneEvidenceRequirement {
  id: string;
  kind?: string;
  required?: boolean;
  stageId?: string;
}

export interface ControlPlaneStageSpec {
  id: string;
  title?: string;
  dependsOn?: string[];
  required?: boolean;
  safeAfterFailure?: boolean;
  executionMode: ControlPlaneExecutionMode;
  timeoutMs?: number;
  retryLimit?: number;
  evidence?: ControlPlaneEvidenceRequirement[];
  input?: Record<string, unknown>;
}

export interface ControlPlaneGateSpec {
  id: string;
  gateType: ControlPlaneGateType;
  required?: boolean;
  dependsOn?: string[];
  evaluationTiming?: "before" | "after" | "closeout";
  evidenceRequirements?: ControlPlaneEvidenceRequirement[];
  passCriteria?: {
    kind: "always-pass" | "always-fail" | "evidence-valid" | "snapshot-valid" | "truth-valid" | "owner-approval";
    evidenceIds?: string[];
    approved?: boolean;
    blockSeverities?: string[];
  };
}

export interface ControlPlaneAttemptSpec {
  schemaVersion?: string;
  attemptId?: string;
  title: string;
  sourceBaseline?: Record<string, unknown>;
  owner?: string;
  stages: ControlPlaneStageSpec[];
  gates?: ControlPlaneGateSpec[];
  closeoutPolicy?: {
    requireOwnerApproval?: boolean;
    ownerApproved?: boolean;
    promotionAllowed?: boolean;
    mergeAllowed?: boolean;
  };
  ownerAuthority?: {
    approval?: boolean;
    rejection?: boolean;
    cancellation?: boolean;
    retry?: boolean;
    resume?: boolean;
    emergencyStop?: boolean;
    permissionGrant?: boolean;
    permissionDenial?: boolean;
  };
  requiredEvidence?: ControlPlaneEvidenceRequirement[];
}

export interface ControlPlaneEvidence {
  schemaVersion: string;
  evidenceId: string;
  attemptId: string;
  stageId: string;
  kind: string;
  path?: string;
  sha256?: string;
  inline?: unknown;
  valid: boolean;
  createdAt: string;
  warnings: string[];
  errors: string[];
}

export interface ControlPlaneStageResult {
  schemaVersion: string;
  stageId: string;
  status: ControlPlaneStageStatus;
  required: boolean;
  attempts: number;
  startedAt?: string;
  finishedAt?: string;
  evidenceIds: string[];
  warnings: string[];
  errors: string[];
  blockingCode?: string;
  normalizedOutcome: {
    exitCode?: number;
    stderrPresent?: boolean;
    objectiveSuccess: boolean;
    outcomeBasis: string;
  };
}

export interface ControlPlaneGateResult {
  schemaVersion: string;
  gateId: string;
  gateType: ControlPlaneGateType;
  status: ControlPlaneGateStatus;
  required: boolean;
  evidenceIds: string[];
  warnings: string[];
  errors: string[];
  blockingCode?: string;
}

export interface ControlPlaneBlockedHandoff {
  schemaVersion: string;
  code: string;
  reason: string;
  blockedAt: string;
  requiredDecision: string;
  missingInputs: string[];
  evidencePaths: string[];
  safeResumePolicy: string;
}

export interface ControlPlaneAttemptRecord {
  schemaVersion: string;
  controlPlaneVersion: string;
  attemptId: string;
  title: string;
  status: ControlPlaneAttemptStatus;
  terminalDecision: ControlPlaneTerminalDecision;
  createdAt: string;
  finishedAt: string;
  sourceBaseline: Record<string, unknown>;
  sourceSnapshotId?: string;
  sourceTruthId?: string;
  modelUse: false;
  networkUse: false;
  stageCount: number;
  gateCount: number;
  evidenceCount: number;
  warningCount: number;
  errorCount: number;
  blockedHandoff?: ControlPlaneBlockedHandoff;
}

export interface ControlPlaneCloseoutRecord {
  schemaVersion: string;
  attemptId: string;
  closeoutId: string;
  status: "CLOSEOUT_COMPLETED" | "CLOSEOUT_BLOCKED";
  createdAt: string;
  mergeAllowed: false;
  promotionAllowed: boolean;
  ownerApprovalRequired: boolean;
  ownerApproved: boolean;
  message: string;
}

export interface ControlPlaneResult {
  ok: boolean;
  status: ControlPlaneAttemptStatus | "VERIFIED" | "VERIFY_FAILED" | "CLOSEOUT_COMPLETED" | "CLOSEOUT_BLOCKED" | "INSPECTED";
  message: string;
  attemptId?: string;
  outputRoot: string;
  attemptPath?: string;
  terminalDecision?: ControlPlaneTerminalDecision;
  summary?: Record<string, unknown>;
  execution: ExecutionResult;
}

export interface ControlPlaneOptions {
  repositoryRoot: string;
  outputRoot?: string;
  clock?: ControlPlaneClock;
  idGenerator?: (spec: ControlPlaneAttemptSpec, createdAt: string) => string;
  simulateFailureAfterStaging?: boolean;
}

type StageExecutor = (input: {
  spec: ControlPlaneStageSpec;
  attemptId: string;
  repositoryRoot: string;
  attemptRoot: string;
  finalAttemptRoot: string;
  createdAt: string;
}) => Omit<ControlPlaneStageResult, "schemaVersion" | "stageId" | "required" | "attempts" | "startedAt" | "finishedAt"> & { evidence: ControlPlaneEvidence[] };

const REQUIRED_FILES = [
  "attempt.json",
  "specification.json",
  "stage-results.json",
  "evidence-index.json",
  "gate-results.json",
  "terminal-decision.json",
  "closeout.json",
  "events.jsonl",
  "final-report.md"
] as const;

const STAGE_MODES: ControlPlaneExecutionMode[] = ["emit-evidence", "validate-file", "compare-hash", "warning", "fail", "block", "timeout", "cancel", "noop"];
const GATE_TYPES: ControlPlaneGateType[] = ["precondition", "permission", "capability", "execution", "verification", "evaluation", "repeatability", "safety", "owner-approval", "closeout"];

export function runControlPlaneAttempt(options: ControlPlaneOptions, spec: ControlPlaneAttemptSpec): ControlPlaneResult {
  return new ControlPlane(options).run(spec);
}

export class ControlPlane {
  private readonly repositoryRoot: string;
  private readonly outputRoot: string;
  private readonly clock: ControlPlaneClock;

  constructor(private readonly options: ControlPlaneOptions) {
    this.repositoryRoot = path.resolve(options.repositoryRoot);
    this.outputRoot = path.resolve(options.outputRoot ?? path.join(this.repositoryRoot, ".sera", "control-plane"));
    this.clock = options.clock ?? { now: () => new Date() };
  }

  inspect(): ControlPlaneResult {
    const attempts = this.listAttempts();
    const active = readJsonSafe(path.join(this.outputRoot, "current.json")) as { attemptId?: string } | undefined;
    const terminalCounts = countBy(attempts, (attempt) => String(attempt.terminalDecision ?? "UNKNOWN"));
    const closeoutEligibleCount = attempts.filter((attempt) => attempt.status === "COMPLETED" || attempt.status === "COMPLETED_WITH_WARNINGS").length;
    const summary = {
      schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
      controlPlaneVersion: CONTROL_PLANE_VERSION,
      activeAttempt: active?.attemptId ?? null,
      recentAttempts: attempts.slice(-10).map((attempt) => ({ attemptId: attempt.attemptId, status: attempt.status, terminalDecision: attempt.terminalDecision })),
      terminalCounts,
      closeoutEligibleCount,
      stageTypes: STAGE_MODES,
      gateTypes: GATE_TYPES,
      limitations: [
        "Reference executor does not run shell commands.",
        "Owner decisions are accepted only as explicit spec fields in v1.",
        "Closeout cannot merge, push, tag, or promote without future policy.",
        "Legacy phase and ZIP workflows are evidence only, not authority."
      ],
      modelUse: false,
      networkUse: false
    };
    return {
      ok: true,
      status: "INSPECTED",
      message: "Unified Control Plane v1 inspected.",
      outputRoot: relative(this.repositoryRoot, this.outputRoot),
      summary,
      execution: { commandId: CONTROL_PLANE_VERSION, attemptId: "inspect", status: "COMPLETED", evidenceDirectory: ".sera/control-plane" }
    };
  }

  run(spec: ControlPlaneAttemptSpec): ControlPlaneResult {
    const createdAt = this.clock.now().toISOString();
    const validation = this.validateSpec(spec);
    const attemptId = spec.attemptId ?? this.options.idGenerator?.(spec, createdAt) ?? createAttemptId(spec, createdAt);
    const parent = path.join(this.outputRoot, "attempts");
    const attemptRoot = path.join(parent, attemptId);
    const staging = path.join(parent, `.attempt-staging-${attemptId}`);
    try {
      const boundary = this.validateBoundary();
      if (!boundary.ok) return this.blockedResult(attemptId, boundary.message);
      if (!validation.ok) {
        return this.writeTerminalOnly(attemptId, createdAt, spec, "BLOCKED", "BLOCK", validation.message, validation.errors, "SPECIFICATION_INVALID");
      }

      fs.mkdirSync(parent, { recursive: true });
      safeRemoveOwnedPath(staging, parent);
      fs.mkdirSync(staging, { recursive: true });

      const events: unknown[] = [];
      const evidence: ControlPlaneEvidence[] = [];
      const stageResults: ControlPlaneStageResult[] = [];
      const gateResults: ControlPlaneGateResult[] = [];
      const sourceBaseline = this.loadSourceBaseline(spec);
      events.push(event("attempt_started", createdAt, attemptId, { title: spec.title }));

      const beforeGateBlock = this.evaluateGates("before", spec, gateResults, evidence, sourceBaseline);
      if (beforeGateBlock) events.push(event("precondition_blocked", createdAt, attemptId, { reason: beforeGateBlock }));

      if (!beforeGateBlock) {
        this.runStages(spec, attemptId, staging, attemptRoot, createdAt, stageResults, evidence, events);
        this.evaluateGates("after", spec, gateResults, evidence, sourceBaseline);
      } else {
        for (const stage of spec.stages) {
          stageResults.push(skippedStage(stage, "Skipped because a required precondition gate did not pass."));
        }
      }

      const evidenceErrors = validateRequiredEvidence(spec, stageResults, evidence);
      const terminal = decideTerminal(stageResults, gateResults, evidenceErrors);
      const status = attemptStatusFromTerminal(terminal, stageResults, gateResults);
      const warnings = [...stageResults.flatMap((item) => item.warnings), ...gateResults.flatMap((item) => item.warnings)];
      const errors = [...stageResults.flatMap((item) => item.errors), ...gateResults.flatMap((item) => item.errors), ...evidenceErrors];
      const finishedAt = this.clock.now().toISOString();
      const blockedHandoff = terminal === "BLOCK" ? buildBlockedHandoff(errors[0] ?? beforeGateBlock ?? "Attempt blocked.", evidence, finishedAt) : undefined;
      const attempt: ControlPlaneAttemptRecord = {
        schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
        controlPlaneVersion: CONTROL_PLANE_VERSION,
        attemptId,
        title: spec.title,
        status,
        terminalDecision: terminal,
        createdAt,
        finishedAt,
        sourceBaseline,
        sourceSnapshotId: stringValue(sourceBaseline.snapshotId),
        sourceTruthId: stringValue(sourceBaseline.truthId),
        modelUse: false,
        networkUse: false,
        stageCount: stageResults.length,
        gateCount: gateResults.length,
        evidenceCount: evidence.length,
        warningCount: warnings.length,
        errorCount: errors.length,
        blockedHandoff
      };
      const closeout: ControlPlaneCloseoutRecord = initialCloseout(attemptId, finishedAt, spec);
      events.push(event("attempt_finished", finishedAt, attemptId, { status, terminalDecision: terminal }));

      writeAttemptOutputs(staging, spec, attempt, stageResults, evidence, gateResults, closeout, events, terminal, warnings, errors);
      if (this.options.simulateFailureAfterStaging) {
        safeRemoveOwnedPath(staging, parent);
        throw new Error("Simulated Control Plane failure after staging.");
      }
      if (fs.existsSync(attemptRoot)) safeRemoveOwnedPath(attemptRoot, parent);
      fs.renameSync(staging, attemptRoot);
      this.promoteSummary(attempt);

      return {
        ok: terminal === "COMPLETE" || terminal === "COMPLETE_WITH_WARNINGS",
        status,
        message: `Unified Control Plane v1 ${status.toLowerCase().replace(/_/g, " ")}.`,
        attemptId,
        outputRoot: relative(this.repositoryRoot, this.outputRoot),
        attemptPath: relative(this.repositoryRoot, attemptRoot),
        terminalDecision: terminal,
        summary: { attemptId, status, terminalDecision: terminal, warningCount: warnings.length, errorCount: errors.length, modelUse: false, networkUse: false },
        execution: { commandId: CONTROL_PLANE_VERSION, attemptId, status: executionStatus(terminal), evidenceDirectory: relative(this.repositoryRoot, attemptRoot), reason: errors[0] }
      };
    } catch (error) {
      safeRemoveOwnedPath(staging, parent);
      const message = redactSecrets(error instanceof Error ? error.message : String(error));
      return { ok: false, status: "FAILED", message, attemptId, outputRoot: relative(this.repositoryRoot, this.outputRoot), execution: { commandId: CONTROL_PLANE_VERSION, attemptId, status: "FAILED", reason: message } };
    }
  }

  verify(attemptIdOrPath: string): ControlPlaneResult {
    const attemptRoot = this.resolveAttempt(attemptIdOrPath);
    const attemptId = path.basename(attemptRoot);
    const errors: string[] = [];
    for (const file of REQUIRED_FILES) {
      const absolute = path.join(attemptRoot, file);
      if (!fs.existsSync(absolute)) errors.push(`Missing ${file}.`);
      if (file.endsWith(".json") && fs.existsSync(absolute)) {
        try {
          JSON.parse(fs.readFileSync(absolute, "utf8"));
        } catch (error) {
          errors.push(`Malformed ${file}: ${redactSecrets(error instanceof Error ? error.message : String(error))}`);
        }
      }
    }
    const attempt = readJsonSafe(path.join(attemptRoot, "attempt.json")) as ControlPlaneAttemptRecord | undefined;
    const evidence = readJsonSafe(path.join(attemptRoot, "evidence-index.json")) as { evidence?: ControlPlaneEvidence[] } | undefined;
    if (!attempt || attempt.schemaVersion !== CONTROL_PLANE_SCHEMA_VERSION) errors.push("Attempt schema is invalid.");
    if (attempt && attempt.attemptId !== attemptId) errors.push("Attempt id does not match attempt directory.");
    for (const item of evidence?.evidence ?? []) {
      if (item.path) {
        const absolute = path.join(this.repositoryRoot, item.path);
        if (!isPathInside(this.repositoryRoot, absolute) || !fs.existsSync(absolute)) errors.push(`Evidence path invalid: ${item.path}.`);
        if (item.sha256 && fs.existsSync(absolute) && sha256File(absolute) !== item.sha256) errors.push(`Evidence hash mismatch: ${item.evidenceId}.`);
      }
    }
    return {
      ok: errors.length === 0,
      status: errors.length === 0 ? "VERIFIED" : "VERIFY_FAILED",
      message: errors.length === 0 ? "Control Plane attempt verified." : errors.join(" "),
      attemptId,
      outputRoot: relative(this.repositoryRoot, this.outputRoot),
      attemptPath: relative(this.repositoryRoot, attemptRoot),
      terminalDecision: attempt?.terminalDecision,
      summary: { errorCount: errors.length, modelUse: false, networkUse: false },
      execution: { commandId: `${CONTROL_PLANE_VERSION}:verify`, attemptId, status: errors.length === 0 ? "COMPLETED" : "FAILED", evidenceDirectory: relative(this.repositoryRoot, attemptRoot), reason: errors[0] }
    };
  }

  closeout(attemptIdOrPath: string): ControlPlaneResult {
    const attemptRoot = this.resolveAttempt(attemptIdOrPath);
    const attempt = readJsonSafe(path.join(attemptRoot, "attempt.json")) as ControlPlaneAttemptRecord | undefined;
    if (!attempt) {
      return { ok: false, status: "CLOSEOUT_BLOCKED", message: "Attempt is missing attempt.json.", outputRoot: relative(this.repositoryRoot, this.outputRoot), execution: { commandId: `${CONTROL_PLANE_VERSION}:closeout`, attemptId: path.basename(attemptRoot), status: "BLOCKED", reason: "missing attempt.json" } };
    }
    const specification = readJsonSafe(path.join(attemptRoot, "specification.json")) as ControlPlaneAttemptSpec | undefined;
    const eligible = attempt.terminalDecision === "COMPLETE" || attempt.terminalDecision === "COMPLETE_WITH_WARNINGS";
    const policy = specification?.closeoutPolicy ?? {};
    const ownerApprovalRequired = policy.requireOwnerApproval === true;
    const ownerApproved = policy.ownerApproved === true;
    const promotionAllowed = Boolean(policy.promotionAllowed && ownerApproved && !ownerApprovalRequired);
    const closeout: ControlPlaneCloseoutRecord = {
      schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
      attemptId: attempt.attemptId,
      closeoutId: `closeout_${sha256Text(`${attempt.attemptId}:${this.clock.now().toISOString()}`).slice(0, 12)}`,
      status: eligible && (!ownerApprovalRequired || ownerApproved) ? "CLOSEOUT_COMPLETED" : "CLOSEOUT_BLOCKED",
      createdAt: this.clock.now().toISOString(),
      mergeAllowed: false,
      promotionAllowed,
      ownerApprovalRequired,
      ownerApproved,
      message: eligible ? "Control Plane closeout recorded; merge and promotion remain disabled in v1." : "Closeout blocked because the attempt did not complete."
    };
    atomicWriteJson(path.join(attemptRoot, "closeout.json"), closeout, attemptRoot);
    return {
      ok: closeout.status === "CLOSEOUT_COMPLETED",
      status: closeout.status,
      message: closeout.message,
      attemptId: attempt.attemptId,
      outputRoot: relative(this.repositoryRoot, this.outputRoot),
      attemptPath: relative(this.repositoryRoot, attemptRoot),
      terminalDecision: attempt.terminalDecision,
      summary: { closeout, modelUse: false, networkUse: false },
      execution: { commandId: `${CONTROL_PLANE_VERSION}:closeout`, attemptId: attempt.attemptId, status: closeout.status === "CLOSEOUT_COMPLETED" ? "COMPLETED" : "BLOCKED", evidenceDirectory: relative(this.repositoryRoot, attemptRoot), reason: closeout.status === "CLOSEOUT_BLOCKED" ? closeout.message : undefined }
    };
  }

  validateSpec(spec: ControlPlaneAttemptSpec): { ok: boolean; message: string; errors: string[] } {
    const errors: string[] = [];
    if (!spec || typeof spec !== "object") errors.push("Specification must be an object.");
    if (!spec.title || typeof spec.title !== "string") errors.push("Specification title is required.");
    if (!Array.isArray(spec.stages) || spec.stages.length === 0) errors.push("Specification requires at least one stage.");
    const stageIds = new Set<string>();
    for (const stage of spec.stages ?? []) {
      if (!stage.id || stageIds.has(stage.id)) errors.push(`Stage id is missing or duplicated: ${stage.id ?? "(missing)"}.`);
      stageIds.add(stage.id);
      if (!STAGE_MODES.includes(stage.executionMode)) errors.push(`Stage ${stage.id} has unknown executionMode.`);
      if (stage.timeoutMs !== undefined && (!Number.isInteger(stage.timeoutMs) || stage.timeoutMs < 1)) errors.push(`Stage ${stage.id} timeoutMs must be positive.`);
      if (stage.retryLimit !== undefined && (!Number.isInteger(stage.retryLimit) || stage.retryLimit < 0 || stage.retryLimit > 5)) errors.push(`Stage ${stage.id} retryLimit must be 0..5.`);
      for (const dep of stage.dependsOn ?? []) if (!stageIds.has(dep) && !spec.stages.some((candidate) => candidate.id === dep)) errors.push(`Stage ${stage.id} depends on unknown stage ${dep}.`);
      const rel = stage.input?.relativePath;
      if (rel !== undefined && !safeRelative(String(rel))) errors.push(`Stage ${stage.id} relativePath must stay inside repository.`);
    }
    for (const cycle of detectStageCycles(spec.stages ?? [])) errors.push(`Stage dependency cycle: ${cycle.join(" -> ")}.`);
    const gateIds = new Set<string>();
    for (const gate of spec.gates ?? []) {
      if (!gate.id || gateIds.has(gate.id)) errors.push(`Gate id is missing or duplicated: ${gate.id ?? "(missing)"}.`);
      gateIds.add(gate.id);
      if (!GATE_TYPES.includes(gate.gateType)) errors.push(`Gate ${gate.id} has unknown gateType.`);
      for (const dep of gate.dependsOn ?? []) if (!stageIds.has(dep) && !gateIds.has(dep) && !(spec.gates ?? []).some((candidate) => candidate.id === dep)) errors.push(`Gate ${gate.id} depends on unknown id ${dep}.`);
    }
    if (spec.closeoutPolicy?.mergeAllowed === true) errors.push("Control Plane v1 closeoutPolicy.mergeAllowed must remain false.");
    return { ok: errors.length === 0, message: errors.join(" ") || "Specification is valid.", errors };
  }

  private validateBoundary(): { ok: boolean; message: string } {
    if (!fs.existsSync(this.repositoryRoot) || !fs.statSync(this.repositoryRoot).isDirectory()) return { ok: false, message: "Repository root does not exist or is not a directory." };
    if (!isPathInside(this.repositoryRoot, this.outputRoot)) return { ok: false, message: "Control Plane output root must be inside repository root." };
    return { ok: true, message: "Control Plane boundaries are valid." };
  }

  private runStages(spec: ControlPlaneAttemptSpec, attemptId: string, attemptRoot: string, finalAttemptRoot: string, createdAt: string, results: ControlPlaneStageResult[], evidence: ControlPlaneEvidence[], events: unknown[]): void {
    const byId = new Map<string, ControlPlaneStageResult>();
    for (const stage of spec.stages) {
      const dependencies = stage.dependsOn ?? [];
      const failedDep = dependencies.map((dep) => byId.get(dep)).find((dep) => dep && dep.status !== "COMPLETED");
      if (failedDep && !stage.safeAfterFailure) {
        const skipped = skippedStage(stage, `Skipped because dependency ${failedDep.stageId} ended ${failedDep.status}.`);
        results.push(skipped);
        byId.set(stage.id, skipped);
        continue;
      }
      const retryLimit = stage.retryLimit ?? 0;
      let final: ControlPlaneStageResult | undefined;
      for (let attempt = 1; attempt <= retryLimit + 1; attempt += 1) {
        const startedAt = this.clock.now().toISOString();
        events.push(event("stage_started", startedAt, attemptId, { stageId: stage.id, attempt }));
        const executed = builtinExecutor({ spec: stage, attemptId, repositoryRoot: this.repositoryRoot, attemptRoot, finalAttemptRoot, createdAt });
        final = {
          schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
          stageId: stage.id,
          status: executed.status,
          required: stage.required !== false,
          attempts: attempt,
          startedAt,
          finishedAt: this.clock.now().toISOString(),
          evidenceIds: executed.evidenceIds,
          warnings: executed.warnings,
          errors: executed.errors,
          blockingCode: executed.blockingCode,
          normalizedOutcome: executed.normalizedOutcome
        };
        evidence.push(...executed.evidence);
        events.push(event("stage_finished", final.finishedAt!, attemptId, { stageId: stage.id, status: final.status }));
        if (final.status === "COMPLETED" || !["FAILED", "BLOCKED"].includes(final.status)) break;
      }
      results.push(final!);
      byId.set(stage.id, final!);
    }
  }

  private evaluateGates(timing: "before" | "after" | "closeout", spec: ControlPlaneAttemptSpec, results: ControlPlaneGateResult[], evidence: ControlPlaneEvidence[], baseline: Record<string, unknown>): string | undefined {
    let block: string | undefined;
    for (const gate of (spec.gates ?? []).filter((candidate) => (candidate.evaluationTiming ?? "after") === timing)) {
      const required = gate.required !== false;
      const ids = gate.evidenceRequirements?.map((item) => item.id) ?? gate.passCriteria?.evidenceIds ?? [];
      const missing = ids.filter((id) => !evidence.some((item) => item.evidenceId === id && item.valid));
      let status: ControlPlaneGateStatus = "PASS";
      const warnings: string[] = [];
      const errors: string[] = [];
      const criteria = gate.passCriteria ?? { kind: "always-pass" as const };
      if (criteria.kind === "always-fail") {
        status = "FAIL";
        errors.push("Gate criterion always-fail requested.");
      } else if (criteria.kind === "evidence-valid" && missing.length > 0) {
        status = required ? "FAIL" : "NOT_APPLICABLE";
        errors.push(`Missing required gate evidence: ${missing.join(", ")}.`);
      } else if (criteria.kind === "snapshot-valid" && !baseline.snapshotId) {
        status = "BLOCKED";
        errors.push("Repository Snapshot baseline is missing.");
      } else if (criteria.kind === "truth-valid" && !baseline.truthId) {
        status = "BLOCKED";
        errors.push("Repository Truth baseline is missing.");
      } else if (criteria.kind === "truth-valid") {
        const severityCounts = baseline.truthFindingCountsBySeverity as Record<string, number> | undefined;
        for (const severity of criteria.blockSeverities ?? []) {
          if ((severityCounts?.[severity] ?? 0) > 0) {
            status = "BLOCKED";
            errors.push(`Repository Truth severity ${severity} blocks this gate.`);
          }
        }
      } else if (criteria.kind === "owner-approval" && criteria.approved !== true) {
        status = "BLOCKED";
        errors.push("Owner approval is required and not present.");
      }
      if (!required && status === "FAIL") status = "NOT_APPLICABLE";
      const result: ControlPlaneGateResult = { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, gateId: gate.id, gateType: gate.gateType, status, required, evidenceIds: ids, warnings, errors, blockingCode: status === "BLOCKED" ? "OWNER_OR_PRECONDITION_BLOCKED" : status === "FAIL" ? "GATE_FAILED" : undefined };
      results.push(result);
      if (required && (status === "BLOCKED" || status === "FAIL") && !block) block = errors[0] ?? `Gate ${gate.id} did not pass.`;
    }
    return block;
  }

  private loadSourceBaseline(spec: ControlPlaneAttemptSpec): Record<string, unknown> {
    const baseline: Record<string, unknown> = { ...(spec.sourceBaseline ?? {}) };
    const snapshotSummary = readJsonSafe(path.join(this.repositoryRoot, ".sera", "repository", "summary.json")) as Record<string, unknown> | undefined;
    const truthSummary = readJsonSafe(path.join(this.repositoryRoot, ".sera", "repository-truth", "summary.json")) as Record<string, unknown> | undefined;
    if (snapshotSummary?.snapshotId) baseline.snapshotId = snapshotSummary.snapshotId;
    if (truthSummary?.sourceSnapshotId) baseline.truthSourceSnapshotId = truthSummary.sourceSnapshotId;
    const truthJson = readJsonSafe(path.join(this.repositoryRoot, ".sera", "repository-truth", "truth.json")) as Record<string, unknown> | undefined;
    if (truthJson?.truthId) baseline.truthId = truthJson.truthId;
    if (truthSummary?.findingCountsBySeverity) baseline.truthFindingCountsBySeverity = truthSummary.findingCountsBySeverity;
    baseline.modelUse = false;
    baseline.networkUse = false;
    return baseline;
  }

  private promoteSummary(attempt: ControlPlaneAttemptRecord): void {
    fs.mkdirSync(this.outputRoot, { recursive: true });
    const attempts = this.listAttempts().filter((item) => item.attemptId !== attempt.attemptId).concat(attempt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    atomicWriteJson(path.join(this.outputRoot, "current.json"), {
      schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
      attemptId: attempt.attemptId,
      status: attempt.status,
      terminalDecision: attempt.terminalDecision,
      updatedAt: attempt.finishedAt,
      modelUse: false,
      networkUse: false
    }, this.outputRoot);
    atomicWriteJson(path.join(this.outputRoot, "summary.json"), {
      schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
      controlPlaneVersion: CONTROL_PLANE_VERSION,
      attemptCount: attempts.length,
      terminalCounts: countBy(attempts, (item) => item.terminalDecision),
      lastAttemptId: attempt.attemptId,
      modelUse: false,
      networkUse: false
    }, this.outputRoot);
  }

  private listAttempts(): ControlPlaneAttemptRecord[] {
    const attemptsRoot = path.join(this.outputRoot, "attempts");
    if (!fs.existsSync(attemptsRoot)) return [];
    return fs.readdirSync(attemptsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => readJsonSafe(path.join(attemptsRoot, entry.name, "attempt.json")) as ControlPlaneAttemptRecord | undefined)
      .filter((item): item is ControlPlaneAttemptRecord => Boolean(item?.attemptId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.attemptId.localeCompare(b.attemptId));
  }

  private resolveAttempt(attemptIdOrPath: string): string {
    const normalized = normalizeSlash(attemptIdOrPath);
    const direct = path.resolve(this.repositoryRoot, normalized);
    if (isPathInside(this.repositoryRoot, direct) && fs.existsSync(direct) && fs.statSync(direct).isDirectory()) return direct;
    return path.join(this.outputRoot, "attempts", normalized);
  }

  private blockedResult(attemptId: string, message: string): ControlPlaneResult {
    return { ok: false, status: "BLOCKED", message, attemptId, outputRoot: relative(this.repositoryRoot, this.outputRoot), execution: { commandId: CONTROL_PLANE_VERSION, attemptId, status: "BLOCKED", reason: message } };
  }

  private writeTerminalOnly(attemptId: string, createdAt: string, spec: ControlPlaneAttemptSpec, status: ControlPlaneAttemptStatus, terminal: ControlPlaneTerminalDecision, message: string, errors: string[], code: string): ControlPlaneResult {
    const parent = path.join(this.outputRoot, "attempts");
    const attemptRoot = path.join(parent, attemptId);
    const finishedAt = this.clock.now().toISOString();
    fs.mkdirSync(parent, { recursive: true });
    const attempt: ControlPlaneAttemptRecord = {
      schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
      controlPlaneVersion: CONTROL_PLANE_VERSION,
      attemptId,
      title: spec.title ?? "Invalid Control Plane specification",
      status,
      terminalDecision: terminal,
      createdAt,
      finishedAt,
      sourceBaseline: { modelUse: false, networkUse: false },
      modelUse: false,
      networkUse: false,
      stageCount: 0,
      gateCount: 0,
      evidenceCount: 0,
      warningCount: 0,
      errorCount: errors.length,
      blockedHandoff: buildBlockedHandoff(message, [], finishedAt, code)
    };
    safeRemoveOwnedPath(attemptRoot, parent);
    fs.mkdirSync(attemptRoot, { recursive: true });
    writeAttemptOutputs(attemptRoot, spec, attempt, [], [], [], initialCloseout(attemptId, finishedAt, spec), [event("attempt_blocked", finishedAt, attemptId, { message })], terminal, [], errors);
    this.promoteSummary(attempt);
    return { ok: false, status, message, attemptId, outputRoot: relative(this.repositoryRoot, this.outputRoot), attemptPath: relative(this.repositoryRoot, attemptRoot), terminalDecision: terminal, summary: { errorCount: errors.length, modelUse: false, networkUse: false }, execution: { commandId: CONTROL_PLANE_VERSION, attemptId, status: "BLOCKED", reason: message, evidenceDirectory: relative(this.repositoryRoot, attemptRoot) } };
  }
}

const builtinExecutor: StageExecutor = ({ spec, attemptId, repositoryRoot, attemptRoot, finalAttemptRoot, createdAt }) => {
  const evidence: ControlPlaneEvidence[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let status: ControlPlaneStageStatus = "COMPLETED";
  let blockingCode: string | undefined;
  const evidenceIds: string[] = [];
  const objectiveSuccess = !["fail", "block", "timeout", "cancel"].includes(spec.executionMode);

  const addEvidence = (item: ControlPlaneEvidence): void => {
    evidence.push(item);
    evidenceIds.push(item.evidenceId);
  };

  if (spec.executionMode === "emit-evidence") {
    const id = String(spec.input?.evidenceId ?? spec.evidence?.[0]?.id ?? `${spec.id}-evidence`);
    const evidencePath = path.join(attemptRoot, "evidence", `${safeName(id)}.json`);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    const payload = { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, evidenceId: id, stageId: spec.id, value: spec.input?.value ?? "emitted" };
    fs.writeFileSync(evidencePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    addEvidence(evidenceRecord(id, attemptId, spec.id, String(spec.input?.kind ?? "structured"), relative(repositoryRoot, path.join(finalAttemptRoot, "evidence", `${safeName(id)}.json`)), sha256File(evidencePath), undefined, true, createdAt));
  } else if (spec.executionMode === "validate-file") {
    const rel = normalizeSlash(String(spec.input?.relativePath ?? ""));
    const absolute = path.join(repositoryRoot, rel);
    const valid = safeRelative(rel) && fs.existsSync(absolute) && fs.statSync(absolute).isFile();
    if (!valid) {
      status = "BLOCKED";
      blockingCode = "EVIDENCE_MISSING_OR_OUTSIDE_BOUNDARY";
      errors.push(`File evidence is missing or outside boundary: ${rel}.`);
    }
    addEvidence(evidenceRecord(String(spec.input?.evidenceId ?? spec.evidence?.[0]?.id ?? `${spec.id}-file`), attemptId, spec.id, "file", valid ? rel : undefined, valid ? sha256File(absolute) : undefined, undefined, valid, createdAt, [], valid ? [] : errors));
  } else if (spec.executionMode === "compare-hash") {
    const rel = normalizeSlash(String(spec.input?.relativePath ?? ""));
    const expected = String(spec.input?.sha256 ?? "");
    const absolute = path.join(repositoryRoot, rel);
    const actual = safeRelative(rel) && fs.existsSync(absolute) ? sha256File(absolute) : "";
    const valid = actual.length > 0 && actual === expected;
    if (!valid) {
      status = "FAILED";
      blockingCode = "EVIDENCE_HASH_MISMATCH";
      errors.push(`Hash mismatch for ${rel}.`);
    }
    addEvidence(evidenceRecord(String(spec.input?.evidenceId ?? spec.evidence?.[0]?.id ?? `${spec.id}-hash`), attemptId, spec.id, "hash", rel, actual || undefined, { expectedSha256: expected, actualSha256: actual }, valid, createdAt, [], valid ? [] : errors));
  } else if (spec.executionMode === "warning") {
    warnings.push(String(spec.input?.message ?? "Stage completed with warning."));
  } else if (spec.executionMode === "fail") {
    status = "FAILED";
    blockingCode = "REQUIRED_STAGE_FAILED";
    errors.push(String(spec.input?.message ?? "Stage failed by specification."));
  } else if (spec.executionMode === "block") {
    status = "BLOCKED";
    blockingCode = "DEPENDENCY_OR_PERMISSION_BLOCKED";
    errors.push(String(spec.input?.message ?? "Stage blocked by specification."));
  } else if (spec.executionMode === "timeout") {
    status = "FAILED";
    blockingCode = "TIMEOUT";
    errors.push("Stage timed out by deterministic simulation.");
  } else if (spec.executionMode === "cancel") {
    status = "CANCELLED";
    blockingCode = "OWNER_CANCELLED";
    errors.push("Stage cancelled by owner authority.");
  }

  return {
    status,
    evidenceIds,
    warnings,
    errors,
    blockingCode,
    normalizedOutcome: {
      exitCode: spec.input?.exitCode === undefined ? undefined : Number(spec.input.exitCode),
      stderrPresent: Boolean(spec.input?.stderr),
      objectiveSuccess,
      outcomeBasis: "Structured Control Plane stage outcome; stderr and exit code are evidence, not sole authority."
    },
    evidence
  };
};

function validateRequiredEvidence(spec: ControlPlaneAttemptSpec, stages: ControlPlaneStageResult[], evidence: ControlPlaneEvidence[]): string[] {
  const errors: string[] = [];
  const requirements = [
    ...(spec.requiredEvidence ?? []),
    ...spec.stages.flatMap((stage) => (stage.evidence ?? []).map((req) => ({ ...req, stageId: req.stageId ?? stage.id })))
  ].filter((req) => req.required !== false);
  for (const req of requirements) {
    const found = evidence.find((item) => item.evidenceId === req.id);
    if (!found) errors.push(`Required evidence missing: ${req.id}.`);
    if (found && !found.valid) errors.push(`Required evidence invalid: ${req.id}.`);
    if (found && req.stageId && found.stageId !== req.stageId) errors.push(`Required evidence ${req.id} belongs to wrong stage.`);
  }
  for (const stage of stages.filter((item) => item.required && item.status === "COMPLETED")) {
    const declared = spec.stages.find((candidate) => candidate.id === stage.stageId)?.evidence ?? [];
    for (const req of declared.filter((item) => item.required !== false)) {
      if (!stage.evidenceIds.includes(req.id)) errors.push(`Stage ${stage.stageId} completed without required evidence ${req.id}.`);
    }
  }
  return errors;
}

function decideTerminal(stages: ControlPlaneStageResult[], gates: ControlPlaneGateResult[], evidenceErrors: string[]): ControlPlaneTerminalDecision {
  if (stages.some((stage) => stage.required && stage.status === "CANCELLED")) return "CANCEL";
  if (stages.some((stage) => stage.required && stage.status === "FAILED")) return "FAIL";
  if (gates.some((gate) => gate.required && gate.status === "FAIL")) return "FAIL";
  if (stages.some((stage) => stage.required && stage.status === "BLOCKED")) return "BLOCK";
  if (gates.some((gate) => gate.required && gate.status === "BLOCKED")) return "BLOCK";
  if (evidenceErrors.length > 0) return "FAIL";
  if (stages.some((stage) => stage.warnings.length > 0) || gates.some((gate) => gate.warnings.length > 0)) return "COMPLETE_WITH_WARNINGS";
  return "COMPLETE";
}

function attemptStatusFromTerminal(terminal: ControlPlaneTerminalDecision, stages: ControlPlaneStageResult[], gates: ControlPlaneGateResult[]): ControlPlaneAttemptStatus {
  if (terminal === "CANCEL") return "CANCELLED";
  if (terminal === "BLOCK") return "BLOCKED";
  if (terminal === "FAIL") return "FAILED";
  if (terminal === "COMPLETE_WITH_WARNINGS" || stages.some((stage) => stage.warnings.length > 0) || gates.some((gate) => gate.warnings.length > 0)) return "COMPLETED_WITH_WARNINGS";
  return "COMPLETED";
}

function executionStatus(terminal: ControlPlaneTerminalDecision): ExecutionResult["status"] {
  if (terminal === "BLOCK") return "BLOCKED";
  if (terminal === "FAIL" || terminal === "CANCEL") return "FAILED";
  return "COMPLETED";
}

function writeAttemptOutputs(root: string, spec: ControlPlaneAttemptSpec, attempt: ControlPlaneAttemptRecord, stages: ControlPlaneStageResult[], evidence: ControlPlaneEvidence[], gates: ControlPlaneGateResult[], closeout: ControlPlaneCloseoutRecord, events: unknown[], terminal: ControlPlaneTerminalDecision, warnings: string[], errors: string[]): void {
  const outputs: Record<string, unknown> = {
    "attempt.json": attempt,
    "specification.json": { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, ...spec },
    "stage-results.json": { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, attemptId: attempt.attemptId, stages },
    "evidence-index.json": { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, attemptId: attempt.attemptId, evidence },
    "gate-results.json": { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, attemptId: attempt.attemptId, gates },
    "terminal-decision.json": { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, attemptId: attempt.attemptId, terminalDecision: terminal, precedence: ["owner cancellation", "fatal control plane failure", "required stage failure", "required gate failure", "required evidence missing", "blocked dependency or permission", "completed with warnings", "completed"], warnings, errors },
    "closeout.json": closeout
  };
  for (const [name, value] of Object.entries(outputs)) fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(root, "events.jsonl"), events.map((item) => JSON.stringify(item)).join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(root, "final-report.md"), [
    "# Unified Control Plane v1 Attempt",
    "",
    `Attempt: ${attempt.attemptId}`,
    `Status: ${attempt.status}`,
    `Terminal decision: ${terminal}`,
    `Model use: ${attempt.modelUse}`,
    `Network use: ${attempt.networkUse}`,
    "",
    "## Evidence",
    ...evidence.map((item) => `- ${item.evidenceId}: ${item.valid ? "valid" : "invalid"}`),
    "",
    "## Warnings",
    ...(warnings.length ? warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Errors",
    ...(errors.length ? errors.map((item) => `- ${item}`) : ["- none"]),
    ""
  ].join("\n"), "utf8");
  for (const file of REQUIRED_FILES) {
    if (file.endsWith(".json")) JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  }
}

function initialCloseout(attemptId: string, createdAt: string, spec: ControlPlaneAttemptSpec): ControlPlaneCloseoutRecord {
  return {
    schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
    attemptId,
    closeoutId: `closeout_pending_${safeName(attemptId)}`,
    status: "CLOSEOUT_BLOCKED",
    createdAt,
    mergeAllowed: false,
    promotionAllowed: false,
    ownerApprovalRequired: spec.closeoutPolicy?.requireOwnerApproval === true,
    ownerApproved: spec.closeoutPolicy?.ownerApproved === true,
    message: "Closeout is a separate operation and has not been completed."
  };
}

function skippedStage(stage: ControlPlaneStageSpec, reason: string): ControlPlaneStageResult {
  return { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, stageId: stage.id, status: "SKIPPED", required: stage.required !== false, attempts: 0, evidenceIds: [], warnings: [], errors: [reason], blockingCode: "DEPENDENCY_FAILED", normalizedOutcome: { objectiveSuccess: false, outcomeBasis: reason } };
}

function buildBlockedHandoff(reason: string, evidence: ControlPlaneEvidence[], blockedAt: string, code = "DEPENDENCY_OR_PERMISSION_BLOCKED"): ControlPlaneBlockedHandoff {
  return {
    schemaVersion: CONTROL_PLANE_SCHEMA_VERSION,
    code,
    reason,
    blockedAt,
    requiredDecision: "Owner must grant permission, provide missing evidence, revise the spec, or cancel the attempt.",
    missingInputs: reason.includes("missing") ? [reason] : [],
    evidencePaths: evidence.map((item) => item.path).filter((item): item is string => Boolean(item)).sort(),
    safeResumePolicy: "Resume only with the same repository baseline or after a fresh Snapshot then Truth sequence."
  };
}

function evidenceRecord(evidenceId: string, attemptId: string, stageId: string, kind: string, evidencePath: string | undefined, sha256: string | undefined, inline: unknown, valid: boolean, createdAt: string, warnings: string[] = [], errors: string[] = []): ControlPlaneEvidence {
  return { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, evidenceId, attemptId, stageId, kind, path: evidencePath, sha256, inline, valid, createdAt, warnings, errors };
}

function event(kind: string, createdAt: string, attemptId: string, data: Record<string, unknown>): Record<string, unknown> {
  return { schemaVersion: CONTROL_PLANE_SCHEMA_VERSION, createdAt, attemptId, kind, data };
}

function createAttemptId(spec: ControlPlaneAttemptSpec, createdAt: string): string {
  return `attempt_${sha256Text(`${spec.title}:${createdAt}`).slice(0, 12)}`;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function safeRelative(value: string): boolean {
  const normalized = normalizeSlash(value);
  return normalized.length > 0 && !path.isAbsolute(normalized) && !normalized.split("/").includes("..");
}

function normalizeSlash(value: string): string {
  return normalizePath(value).replace(/\/+$/g, "");
}

function relative(root: string, target: string): string {
  const rel = path.relative(root, target);
  return normalizeSlash(rel || ".");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readJsonSafe(filePath: string): unknown | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

function atomicWriteJson(target: string, value: unknown, ownerRoot: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!isPathInside(ownerRoot, target)) throw new Error("Refusing to write outside Control Plane-owned output area.");
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  JSON.parse(fs.readFileSync(temp, "utf8"));
  fs.renameSync(temp, target);
}

function detectStageCycles(stages: ControlPlaneStageSpec[]): string[][] {
  const graph = new Map(stages.map((stage) => [stage.id, stage.dependsOn ?? []]));
  const cycles = new Set<string>();
  const visit = (node: string, stack: string[]): void => {
    if (stack.includes(node)) {
      cycles.add(stack.slice(stack.indexOf(node)).concat(node).join(" -> "));
      return;
    }
    for (const dep of graph.get(node) ?? []) visit(dep, [...stack, node]);
  };
  for (const stage of stages) visit(stage.id, []);
  return [...cycles].sort().map((cycle) => cycle.split(" -> "));
}

function countBy<T>(items: T[], selector: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[selector(item)] = (counts[selector(item)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Text(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function safeRemoveOwnedPath(target: string, ownerRoot: string): void {
  if (!fs.existsSync(target)) return;
  if (!isPathInside(ownerRoot, target)) throw new Error("Refusing to remove path outside Control Plane-owned output area.");
  fs.rmSync(target, { recursive: true, force: true });
}

export function refreshControlPlaneRepositoryBaseline(options: ControlPlaneOptions): { snapshotId?: string; truthId?: string; ok: boolean; message: string } {
  const snapshot = runRepositorySnapshot({ repositoryRoot: options.repositoryRoot, clock: options.clock });
  if (!snapshot.ok) return { ok: false, snapshotId: snapshot.snapshotId, message: snapshot.message };
  const truth = runRepositoryTruth({ repositoryRoot: options.repositoryRoot, refreshSnapshot: true, clock: options.clock });
  return { ok: truth.ok, snapshotId: truth.sourceSnapshotId ?? snapshot.snapshotId, truthId: truth.truthId, message: truth.message };
}
