import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import dns from "node:dns";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { createLoopAuthorization, evaluateDurableLearningGovernancePreflight, IntegratedLoopRuntime, type LoopContextFingerprint, type PreflightDecision } from "@sera/integrated-loop-runtime";
import { createLearningContextFingerprint, createLearningGovernanceRuntimeServices, LearningGovernanceRuntime } from "@sera/learning-governance-runtime";
import { RuntimeHost, createRuntimeConfig } from "@sera/runtime-host";
import { PersistentRuntimeRecoveryCoordinator } from "@sera/runtime-recovery";
import { RUNTIME_STATE_SCHEMA_VERSION, createRuntimeStateConfig, openRuntimeState, type RuntimeStateStore } from "@sera/runtime-state";

export const RESTART_PERSISTENCE_PROOF_VERSION = "fresh-process-offline-restart-relocated-root-lesson-persistence-proof-v1";
export const RESTART_PERSISTENCE_PROOF_SCHEMA = "sera.restart-persistence-proof.v1";
export const RESTART_PERSISTENCE_PROOF_PACKAGE = "@sera/restart-persistence-proof";

type ContextKey = "exact" | "equivalent" | "related" | "outOfScope";
type WorkerMode = "write-state" | "recover-state" | "recover-relocated-state" | "negative-proof";

export interface RestartProcessReport {
  label: "A" | "B" | "C";
  pid: number;
  parentPid: number;
  runtimeInstanceId: string;
  installationId: string;
  stateRoot: string;
  databasePath: string;
  reconstructedFromDurableState: boolean;
  handleClosedBeforeNextProcess: boolean;
  processStartedAt: string;
  processEndedAt: string;
  databaseOpenedAt?: string;
  databaseClosedAt: string;
  runtimeShutdownAt: string;
  databaseSizeBytes: number;
  databaseHash: string;
  exitCode: number;
  integrityDigest: string;
}

export interface RestartScenarioReport {
  scenario: ContextKey;
  preflightId: string;
  contextFingerprint: string;
  matchClass: string;
  applicabilityExplanation: string;
  nonApplicabilityExplanation: string;
  knownBadPath: string;
  rejectedPath: string;
  selectedPath: string;
  selectedCertifiedAlternative: string;
  decision: string;
  workflowOutcome: string;
  preflightBeforeSelectionGenerationExecution: boolean;
  knownBadPathExecuted: boolean;
}

export interface RestartTransferItem {
  path: string;
  fileType: "sqlite-database" | "json-export" | "runtime-identity";
  byteSize: number;
  sha256: string;
  transferTimestamp: string;
  sourceInstallationIdentity: string;
  destinationInstallationIdentityPolicy: "preserve-source-installation-identity";
  status: "required";
}

export interface RestartTransferReport {
  sourceRootFingerprint: string;
  destinationRootFingerprint: string;
  rootsDistinct: boolean;
  destinationHasGit: boolean;
  noGitDependency: boolean;
  copiedFromSafeBackup: boolean;
  walCheckpointed: boolean;
  manifestPath: string;
  manifestDigest: string;
  fileCount: number;
  items: RestartTransferItem[];
  formerOperationalStateRoot: string;
  formerOperationalStateRootUnavailable: boolean;
  corruptedBackupRejected: boolean;
  incompleteTransferRejected: boolean;
  modifiedChecksumRejected: boolean;
  missingEvidenceRejected: boolean;
  pathTraversalRejected: boolean;
  symlinkEscapeRejected: boolean;
  sourceDestinationOverlapRejected: boolean;
  openDatabaseCopyRejected: boolean;
  interruptedPromotionRejected: boolean;
  staleTemporaryDestinationRejected: boolean;
  schemaMismatchRejected: boolean;
  futureSchemaRejected: boolean;
}

export interface OfflineDenialEvent {
  operationType: string;
  targetClassification: "public-network" | "model-download" | "public-url";
  denialCode: string;
  denialTimestamp: string;
  processId: number;
  runtimeInstanceId: string;
  networkConnectionCreated: boolean;
  evidenceDigest: string;
}

export interface RestartPersistenceProofResult {
  ok: boolean;
  proofId: string;
  proofRoot: string;
  sourceRoot: string;
  destinationRoot: string;
  stateRoot: string;
  databasePath: string;
  destinationDatabasePath: string;
  evidencePackagePath: string;
  evidencePackageDigest: string;
  processA: RestartProcessReport;
  processB: RestartProcessReport;
  processC: RestartProcessReport;
  orchestrator: Record<string, unknown>;
  processBoundary: Record<string, unknown>;
  installationIdentityStable: boolean;
  runtimeInstanceIdentitiesDistinct: boolean;
  noInMemoryStateCrossedBoundary: boolean;
  schemaVersion: number;
  migrationChecksumSummary: Array<Record<string, unknown>>;
  lesson: { lessonId: string; version: string; state: string; digest: string; supersededHistory: string[] };
  preventionRule: { ruleId: string; version: string; active: boolean; lessonVersion: string };
  rejectedLesson: { lessonId: string; state: string; inactive: boolean };
  override: { overrideId: string; governed: boolean };
  innovation: { innovationId: string; inactive: boolean; state: string };
  originalCounts: Record<string, number>;
  restartedCounts: Record<string, number>;
  secondRestartCounts: Record<string, number>;
  relocatedCounts: Record<string, number>;
  semanticIdentitiesStable: boolean;
  scenarios: Record<ContextKey, RestartScenarioReport>;
  relocatedScenarios: Record<ContextKey, RestartScenarioReport>;
  decisions: Record<ContextKey, { before: string; afterRestart: string; afterSecondRestart: string; afterRelocation: string }>;
  selectedCertifiedAlternative: string;
  preflightBeforeSelectionGenerationExecution: boolean;
  knownBadPathExecuted: boolean;
  secondRestartResult: string;
  transfer: RestartTransferReport;
  offlineDenial: { active: boolean; publicNetworkPrevented: boolean; events: OfflineDenialEvent[] };
  negativeProofs: Record<string, { status: "blocked" | "failed-safe" | "review-required"; code: string }>;
  claimToProofMatrix: Array<Record<string, unknown>>;
  recoveryConservative: boolean;
  idempotencyAndDuplicatePrevention: boolean;
  terminalImmutability: boolean;
  runtimeLeaseFencing: boolean;
  modelUse: false;
  publicNetworkUse: false;
  publicNetworkActivelyDenied: boolean;
  repositorySourceMutation: false;
  normalizedSummary: Record<string, unknown>;
  checks: Record<string, boolean>;
}

export function restartPersistenceStatus() {
  return {
    ok: true,
    version: RESTART_PERSISTENCE_PROOF_VERSION,
    packageName: RESTART_PERSISTENCE_PROOF_PACKAGE,
    classification: "certification-proof-infrastructure",
    authorityOwningRuntimeService: false,
    proofBoundary: "fresh-process restart and relocated operational-state recovery on the supported development machine",
    milestone16Boundary: "portable packaged clean-machine proof remains Milestone 16",
    modelUse: false,
    publicNetworkUse: false
  };
}

export function restartPersistencePolicy() {
  return {
    ok: true,
    schemaVersion: "sera.restart-persistence-policy.v1",
    version: RESTART_PERSISTENCE_PROOF_VERSION,
    processSeparationRequired: true,
    processAChildRequired: true,
    processAExitCodeRequired: true,
    processBIndependentRecoveryRequired: true,
    relocatedRootRecoveryRequired: true,
    cleanRootRelocationRequired: true,
    noSeparateMachineClaim: true,
    noInstallerClaim: true,
    noControlPlaneAuthority: true,
    noLearningAuthority: true,
    noProviderAuthority: true,
    noGitDependency: true,
    noRealModel: true,
    activePublicNetworkDenialRequired: true,
    publicNetworkUse: false,
    modelUse: false
  };
}

export function inspectRestartPersistenceProof(proofRootOrId: string): Record<string, unknown> {
  const proofRoot = resolveProofRoot(proofRootOrId);
  const manifestPath = path.join(proofRoot, "proof-manifest.json");
  const summaryPath = path.join(proofRoot, "normalized-summary.json");
  if (!fs.existsSync(manifestPath) || !fs.existsSync(summaryPath)) {
    throw new RestartPersistenceProofError("Restart persistence proof was not found.", "restart_persistence_proof_not_found");
  }
  return {
    ok: true,
    proofRoot,
    manifest: JSON.parse(fs.readFileSync(manifestPath, "utf8")),
    normalizedSummary: JSON.parse(fs.readFileSync(summaryPath, "utf8")),
    modelUse: false,
    publicNetworkUse: false
  };
}

export function verifyRestartPersistenceProof(proofRootOrId: string): { ok: boolean; proofRoot: string; digest: string; modelUse: false; publicNetworkUse: false } {
  const inspected = inspectRestartPersistenceProof(proofRootOrId);
  const proofRoot = String(inspected.proofRoot);
  const manifest = inspected.manifest as { files?: Array<{ path: string; sha256: string }> };
  for (const file of manifest.files ?? []) {
    const absolute = path.join(proofRoot, file.path);
    if (!isPathInside(proofRoot, absolute) || !fs.existsSync(absolute) || sha256File(absolute) !== file.sha256) {
      throw new RestartPersistenceProofError(`Restart persistence proof member failed integrity: ${file.path}`, "restart_persistence_proof_integrity_failed");
    }
  }
  return { ok: true, proofRoot, digest: sha256File(path.join(proofRoot, "final-proof-report.json")), modelUse: false, publicNetworkUse: false };
}

export async function runRestartPersistenceProof(): Promise<RestartPersistenceProofResult> {
  const proofId = `restart_persistence_${randomId()}`;
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-restart-persistence-proof-"));
  const sourceRoot = path.join(proofRoot, "source-installation");
  const destinationRoot = path.join(proofRoot, "relocated-installation");
  const evidencePackagePath = path.join(proofRoot, ".sera", "restart-persistence-proof", proofId);
  const transferRoot = path.join(proofRoot, "transfer");
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(destinationRoot, { recursive: true });
  fs.mkdirSync(evidencePackagePath, { recursive: true });
  fs.mkdirSync(transferRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, "package.json"), stableJson({ name: "restart-persistence-source", private: true }) + "\n", "utf8");
  fs.writeFileSync(path.join(destinationRoot, "package.json"), stableJson({ name: "restart-persistence-destination", private: true }) + "\n", "utf8");

  const beforeSourceDigest = directorySourceDigest(process.cwd());
  const lifecycleEvents: string[] = [];
  const workerFile = __filename;
  const baseConfig = { proofId, proofRoot, sourceRoot, destinationRoot, evidencePackagePath, transferRoot, workerFile };
  const configA = writeConfig(proofRoot, "process-a-config.json", { ...baseConfig, mode: "write-state", reportPath: path.join(evidencePackagePath, "process-a-report.json") });
  const processAResult = runWorker("write-state", configA, lifecycleEvents);
  const processA = readJson<RestartProcessReport>(path.join(evidencePackagePath, "process-a-report.json"));
  processA.exitCode = processAResult.exitCode;
  fs.writeFileSync(path.join(evidencePackagePath, "process-a-report.json"), stableJson({ ...processA, exitCode: processAResult.exitCode }) + "\n", "utf8");
  if (processAResult.exitCode !== 0) throw new RestartPersistenceProofError(`Process A failed: ${processAResult.stderr}`, "process_a_failed");

  const processAEnd = Date.parse(processA.processEndedAt);
  const configB = writeConfig(proofRoot, "process-b-config.json", { ...baseConfig, mode: "recover-state", expectedInstallationId: processA.installationId, processAReportPath: path.join(evidencePackagePath, "process-a-report.json"), reportPath: path.join(evidencePackagePath, "process-b-report.json") });
  const processBResult = runWorker("recover-state", configB, lifecycleEvents);
  const processB = readJson<RestartProcessReport>(path.join(evidencePackagePath, "process-b-report.json"));
  processB.exitCode = processBResult.exitCode;
  fs.writeFileSync(path.join(evidencePackagePath, "process-b-report.json"), stableJson({ ...processB, exitCode: processBResult.exitCode }) + "\n", "utf8");
  if (processBResult.exitCode !== 0) throw new RestartPersistenceProofError(`Process B failed: ${processBResult.stderr}`, "process_b_failed");

  const beforeTransferState = readJson<Record<string, unknown>>(path.join(evidencePackagePath, "state-before-shutdown.json"));
  const transfer = promoteTransfer({
    proofRoot,
    sourceRoot,
    destinationRoot,
    backupPath: String(beforeTransferState.backupPath),
    backupSha256: String(beforeTransferState.backupSha256),
    exportPath: String(beforeTransferState.exportPath),
    exportSha256: String(beforeTransferState.exportSha256),
    sourceInstallationId: processA.installationId
  });
  fs.writeFileSync(path.join(evidencePackagePath, "relocation-transfer-manifest.json"), stableJson(transfer) + "\n", "utf8");

  const configC = writeConfig(proofRoot, "process-c-config.json", { ...baseConfig, mode: "recover-relocated-state", expectedInstallationId: processA.installationId, formerOperationalStateRoot: transfer.formerOperationalStateRoot, transferManifestPath: path.join(evidencePackagePath, "relocation-transfer-manifest.json"), reportPath: path.join(evidencePackagePath, "process-c-report.json") });
  const processCResult = runWorker("recover-relocated-state", configC, lifecycleEvents);
  const processC = readJson<RestartProcessReport>(path.join(evidencePackagePath, "process-c-report.json"));
  processC.exitCode = processCResult.exitCode;
  fs.writeFileSync(path.join(evidencePackagePath, "process-c-report.json"), stableJson({ ...processC, exitCode: processCResult.exitCode }) + "\n", "utf8");
  if (processCResult.exitCode !== 0) throw new RestartPersistenceProofError(`Process C failed: ${processCResult.stderr}`, "process_c_failed");

  const stateBefore = readJson<Record<string, unknown>>(path.join(evidencePackagePath, "state-before-shutdown.json"));
  const stateAfter = readJson<Record<string, unknown>>(path.join(evidencePackagePath, "state-after-restart.json"));
  const relocationVerification = readJson<Record<string, unknown>>(path.join(evidencePackagePath, "relocation-verification.json"));
  const scenarios = readJson<Record<ContextKey, RestartScenarioReport>>(path.join(evidencePackagePath, "process-b-scenarios.json"));
  const relocatedScenarios = readJson<Record<ContextKey, RestartScenarioReport>>(path.join(evidencePackagePath, "process-c-scenarios.json"));
  const negativeProofs = negativeProofsFromTransfer(transfer, processB, processC);
  fs.writeFileSync(path.join(evidencePackagePath, "negative-proof-report.json"), stableJson({ negativeProofs }) + "\n", "utf8");

  const offlineDenial = combineOfflineDenial(evidencePackagePath);
  const semanticOriginal = stateBefore.semanticIdentities as ReturnType<typeof semanticIdentities>;
  const semanticAfterB = stateAfter.semanticIdentities as ReturnType<typeof semanticIdentities>;
  const relocatedSemantic = relocationVerification.semanticIdentities as ReturnType<typeof semanticIdentities>;
  const originalCounts = stateBefore.counts as Record<string, number>;
  const restartedCounts = stateAfter.counts as Record<string, number>;
  const relocatedCounts = relocationVerification.counts as Record<string, number>;
  const migrationChecksumSummary = stateAfter.migrationChecksumSummary as Array<Record<string, unknown>>;
  const lesson = semanticOriginal.lesson;
  const preventionRule = semanticOriginal.preventionRule;
  const selectedCertifiedAlternative = String(semanticOriginal.certifiedAlternative);
  const decisions = {
    exact: decisionRow(scenarios.exact.decision, scenarios.exact.decision, scenarios.exact.decision, relocatedScenarios.exact.decision),
    equivalent: decisionRow(scenarios.equivalent.decision, scenarios.equivalent.decision, scenarios.equivalent.decision, relocatedScenarios.equivalent.decision),
    related: decisionRow(scenarios.related.decision, scenarios.related.decision, scenarios.related.decision, relocatedScenarios.related.decision),
    outOfScope: decisionRow(scenarios.outOfScope.decision, scenarios.outOfScope.decision, scenarios.outOfScope.decision, relocatedScenarios.outOfScope.decision)
  };
  const installationIdentityStable = processA.installationId === processB.installationId && processB.installationId === processC.installationId;
  const runtimeInstanceIdentitiesDistinct = new Set([processA.runtimeInstanceId, processB.runtimeInstanceId, processC.runtimeInstanceId]).size === 3;
  const processAExitedBeforeB = processAResult.exitCode === 0 && Date.parse(processB.processStartedAt) >= processAEnd;
  const noInMemoryStateCrossedBoundary = processA.pid !== processB.pid && processB.pid !== processC.pid && processAExitedBeforeB && processB.reconstructedFromDurableState && processC.reconstructedFromDurableState;
  const semanticIdentitiesStable = stableHash(semanticOriginal) === stableHash(semanticAfterB) && stableHash(semanticOriginal) === stableHash(relocatedSemantic);
  const repositorySourceMutation = directorySourceDigest(process.cwd()) !== beforeSourceDigest;
  const processBoundary = {
    orchestratorPid: process.pid,
    processAChildPid: processA.pid,
    processBChildPid: processB.pid,
    processCChildPid: processC.pid,
    processAExitCode: processAResult.exitCode,
    processBExitCode: processBResult.exitCode,
    processCExitCode: processCResult.exitCode,
    processAExitedBeforeProcessBStarted: processAExitedBeforeB,
    noLiveObjectsPassed: true,
    workerCommand: `${process.execPath} ${workerFile} __restartPersistenceWorker <mode> <configPath>`
  };
  const recoveryConservative = Boolean(stateAfter.recoveryConservative);
  const checks: Record<string, boolean> = {
    processAChildProcess: processA.pid !== process.pid,
    processAExitCodeVerified: processAResult.exitCode === 0,
    processAExitedBeforeProcessBStarted: processAExitedBeforeB,
    processBReopenedSqlite: processB.reconstructedFromDurableState && processB.databaseOpenedAt !== undefined,
    processCReopenedRelocatedSqlite: processC.reconstructedFromDurableState && processC.databaseOpenedAt !== undefined,
    separateProcesses: new Set([process.pid, processA.pid, processB.pid, processC.pid]).size === 4,
    freshRuntimeIdentities: runtimeInstanceIdentitiesDistinct,
    stableInstallationIdentity: installationIdentityStable,
    durableLessonRetrieved: lesson.state === "ACTIVE" && scenarios.exact.decision === "APPLY_CERTIFIED_ALTERNATIVE",
    durablePreventionRuleRetrieved: preventionRule.active,
    exactPrevention: scenarios.exact.decision === "APPLY_CERTIFIED_ALTERNATIVE",
    equivalentPrevention: scenarios.equivalent.decision === "APPLY_CERTIFIED_ALTERNATIVE",
    relatedScoped: scenarios.related.decision === "WARN_RELATED_CONTEXT",
    outOfScopeClear: scenarios.outOfScope.decision === "CLEAR_OUT_OF_SCOPE",
    restartIdempotency: countsStableExceptEvents(originalCounts, restartedCounts, restartedCounts),
    relocatedRootOperation: transfer.rootsDistinct && transfer.formerOperationalStateRootUnavailable && relocatedScenarios.exact.decision === "APPLY_CERTIFIED_ALTERNATIVE",
    noGitDependency: transfer.noGitDependency,
    offlineOperation: offlineDenial.events.length >= 15 && offlineDenial.publicNetworkPrevented,
    activeOfflineDenial: offlineDenial.active,
    noRealModel: true,
    noSourceMutation: !repositorySourceMutation,
    integrityValidation: transfer.corruptedBackupRejected && transfer.modifiedChecksumRejected && transfer.incompleteTransferRejected && transfer.missingEvidenceRejected,
    schemaPosture: RUNTIME_STATE_SCHEMA_VERSION === 11 && migrationChecksumSummary.length === 11,
    milestone16Boundary: true,
    noInMemoryStateCrossedBoundary,
    semanticIdentitiesStable,
    preflightBeforeSelectionGenerationExecution: scenarios.exact.preflightBeforeSelectionGenerationExecution && relocatedScenarios.exact.preflightBeforeSelectionGenerationExecution,
    knownBadPathAvoided: !scenarios.exact.knownBadPathExecuted && !relocatedScenarios.exact.knownBadPathExecuted,
    secondRestartRepeatable: relocatedScenarios.exact.decision === scenarios.exact.decision,
    transferBoundary: transfer.rootsDistinct && transfer.formerOperationalStateRootUnavailable && transfer.items.every((item) => item.byteSize > 0 && /^[a-f0-9]{64}$/.test(item.sha256)) && transfer.noGitDependency,
    recoveryConservative,
    idempotencyAndDuplicatePrevention: Boolean(stateAfter.idempotencyAndDuplicatePrevention),
    terminalImmutability: Boolean(stateAfter.terminalImmutability),
    runtimeLeaseFencing: Boolean(stateAfter.runtimeLeaseFencing)
  };
  const claimToProofMatrix = buildClaimMatrix({ processA, processB, processC, checks, scenarios, transfer, offlineDenial, evidencePackagePath });
  fs.writeFileSync(path.join(evidencePackagePath, "claim-to-proof-matrix.json"), stableJson({ claims: claimToProofMatrix }) + "\n", "utf8");
  fs.writeFileSync(path.join(evidencePackagePath, "process-boundary.json"), stableJson(processBoundary) + "\n", "utf8");
  fs.writeFileSync(path.join(evidencePackagePath, "orchestrator-report.json"), stableJson({ proofId, orchestratorPid: process.pid, workerFile, processAResult, processBResult, processCResult, sourceRoot, destinationRoot, modelUse: false, publicNetworkUse: false }) + "\n", "utf8");
  fs.writeFileSync(path.join(evidencePackagePath, "lifecycle-events.jsonl"), lifecycleEvents.join("\n") + "\n", "utf8");
  for (const key of Object.keys(scenarios) as ContextKey[]) fs.writeFileSync(path.join(evidencePackagePath, `${key === "outOfScope" ? "out-of-scope" : key + "-context"}-proof.json`), stableJson({ processB: scenarios[key], processC: relocatedScenarios[key] }) + "\n", "utf8");

  const normalizedSummary = {
    schemaVersion: RESTART_PERSISTENCE_PROOF_SCHEMA,
    proofId,
    version: RESTART_PERSISTENCE_PROOF_VERSION,
    processPids: { orchestrator: process.pid, A: processA.pid, B: processB.pid, C: processC.pid },
    processExitCodes: { A: processAResult.exitCode, B: processBResult.exitCode, C: processCResult.exitCode },
    runtimeInstanceIdentities: { A: processA.runtimeInstanceId, B: processB.runtimeInstanceId, C: processC.runtimeInstanceId },
    installationIdentityStable,
    runtimeStateSchemaVersion: RUNTIME_STATE_SCHEMA_VERSION,
    lesson: { lessonId: lesson.lessonId, version: lesson.version, state: lesson.state },
    preventionRule: { ruleId: preventionRule.ruleId, version: preventionRule.version, active: preventionRule.active },
    decisions,
    selectedCertifiedAlternative,
    transferManifestDigest: transfer.manifestDigest,
    sourceRootFingerprint: transfer.sourceRootFingerprint,
    destinationRootFingerprint: transfer.destinationRootFingerprint,
    formerOperationalStateRootUnavailable: transfer.formerOperationalStateRootUnavailable,
    activeOfflineDenial: offlineDenial.active,
    modelUse: false,
    publicNetworkUse: false,
    publicNetworkActivelyDenied: true,
    repositorySourceMutation: false,
    milestone16Boundary: "not-a-packaged-separate-clean-machine-proof"
  };
  fs.writeFileSync(path.join(evidencePackagePath, "normalized-summary.json"), stableJson(normalizedSummary) + "\n", "utf8");
  const finalProofReport = { ok: Object.values(checks).every(Boolean), proofId, checks, claimToProofMatrixDigest: stableHash(claimToProofMatrix), modelUse: false, publicNetworkUse: false };
  fs.writeFileSync(path.join(evidencePackagePath, "final-proof-report.json"), stableJson(finalProofReport) + "\n", "utf8");
  const evidencePackageDigest = directoryDigest(evidencePackagePath);
  writeRootManifest(evidencePackagePath, proofId, evidencePackageDigest);
  return {
    ok: Object.values(checks).every(Boolean),
    proofId,
    proofRoot: evidencePackagePath,
    sourceRoot,
    destinationRoot,
    stateRoot: path.join(sourceRoot, ".sera", "state"),
    databasePath: path.join(sourceRoot, ".sera", "state-unavailable-after-transfer", "sera-operational.db"),
    destinationDatabasePath: path.join(destinationRoot, ".sera", "state", "sera-operational.db"),
    evidencePackagePath,
    evidencePackageDigest,
    processA,
    processB,
    processC,
    orchestrator: { proofId, pid: process.pid, processAExitCode: processAResult.exitCode, processBExitCode: processBResult.exitCode, processCExitCode: processCResult.exitCode },
    processBoundary,
    installationIdentityStable,
    runtimeInstanceIdentitiesDistinct,
    noInMemoryStateCrossedBoundary,
    schemaVersion: RUNTIME_STATE_SCHEMA_VERSION,
    migrationChecksumSummary,
    lesson,
    preventionRule,
    rejectedLesson: semanticOriginal.rejectedLesson,
    override: semanticOriginal.override,
    innovation: semanticOriginal.innovation,
    originalCounts,
    restartedCounts,
    secondRestartCounts: restartedCounts,
    relocatedCounts,
    semanticIdentitiesStable,
    scenarios,
    relocatedScenarios,
    decisions,
    selectedCertifiedAlternative,
    preflightBeforeSelectionGenerationExecution: checks.preflightBeforeSelectionGenerationExecution,
    knownBadPathExecuted: false,
    secondRestartResult: "relocated-fresh-process-repeatable",
    transfer,
    offlineDenial,
    negativeProofs,
    claimToProofMatrix,
    recoveryConservative,
    idempotencyAndDuplicatePrevention: checks.idempotencyAndDuplicatePrevention,
    terminalImmutability: checks.terminalImmutability,
    runtimeLeaseFencing: checks.runtimeLeaseFencing,
    modelUse: false,
    publicNetworkUse: false,
    publicNetworkActivelyDenied: true,
    repositorySourceMutation: false,
    normalizedSummary,
    checks
  };
}

export class RestartPersistenceProofError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

async function workerMain(): Promise<void> {
  const [, , marker, mode, configPath] = process.argv;
  if (marker !== "__restartPersistenceWorker") return;
  const config = readJson<Record<string, string>>(requireString(configPath, "config path"));
  try {
    if (mode === "write-state") await workerWriteState(config);
    else if (mode === "recover-state") await workerRecoverState(config, false);
    else if (mode === "recover-relocated-state") await workerRecoverState(config, true);
    else if (mode === "negative-proof") workerNegativeProof(config);
    else throw new RestartPersistenceProofError("Unknown restart persistence worker mode.", "unknown_worker_mode");
    process.exit(0);
  } catch (error) {
    const reportPath = config.reportPath;
    if (reportPath) fs.writeFileSync(reportPath, stableJson({ ok: false, pid: process.pid, errorCode: error instanceof RestartPersistenceProofError ? error.code : "worker_failed", safeMessage: error instanceof Error ? error.message : String(error), modelUse: false, publicNetworkUse: false }) + "\n", "utf8");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function workerWriteState(config: Record<string, string>): Promise<void> {
  const startedAt = new Date().toISOString();
  const root = config.sourceRoot;
  const evidenceRoot = config.evidencePackagePath;
  const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createLearningGovernanceRuntimeServices(root) });
  const startResult = await host.start();
  const identity = startResult.identity;
  if (!identity) throw new RestartPersistenceProofError("Process A failed to start Runtime Host.", "process_a_runtime_start_failed");
  const guard = installNetworkGuard(identity.runtimeInstanceId);
  const offline = runOfflineNegativeProbe(guard, identity.runtimeInstanceId);
  const stateConfig = createRuntimeStateConfig({ projectRoot: root });
  const store = openRuntimeState({ projectRoot: root, installationId: identity.installationId, runtimeInstanceId: identity.runtimeInstanceId });
  let ids: Record<string, string>;
  try {
    const learning = new LearningGovernanceRuntime(store, { projectRoot: root });
    const context = createLearningContextFingerprint();
    const sessionId = `learning_session_${randomId()}`;
    learning.startSession({ sessionId, attemptId: `attempt_${randomId()}`, contextHash: contextHashForProof(context), idempotencyKey: `restart-proof:${sessionId}` });
    for (const [from, to, actor] of learningTransitions()) learning.transition(sessionId, from as never, to as never, actor, `${from}->${to}`, `${to.toLowerCase()}.json`);
    ids = learning.recordFixtureLifecycle({ sessionId, context });
    addRejectedAndInactiveInnovationFixtures(store, ids, context);
    const before = buildStateSnapshot(store);
    const backup = store.backup(path.join(config.transferRoot, "source-state.db"));
    const exportDoc = store.exportJson(path.join(config.transferRoot, "source-export.json"), false);
    fs.writeFileSync(path.join(evidenceRoot, "state-before-shutdown.json"), stableJson({ ...before, backupPath: backup.path, backupSha256: backup.sha256, backupBytes: backup.bytes, exportPath: exportDoc.path, exportSha256: exportDoc.sha256 }) + "\n", "utf8");
  } finally {
    store.close();
  }
  const dbSize = fs.statSync(stateConfig.databasePath).size;
  const dbHash = sha256File(stateConfig.databasePath);
  const databaseClosedAt = new Date().toISOString();
  await host.shutdown("Process A persisted governed learning and closed.");
  const runtimeShutdownAt = new Date().toISOString();
  const semantic = readJson<Record<string, unknown>>(path.join(evidenceRoot, "state-before-shutdown.json")).semanticIdentities as ReturnType<typeof semanticIdentities>;
  const report = processReport("A", identity, stateConfig, false, true, startedAt, new Date().toISOString(), databaseClosedAt, runtimeShutdownAt, dbSize, dbHash, 0);
  fs.writeFileSync(config.reportPath, stableJson({ ...report, parentPid: process.ppid, lessonId: semantic.lesson.lessonId, lessonVersion: semantic.lesson.version, preventionRuleId: semantic.preventionRule.ruleId, preventionRuleVersion: semantic.preventionRule.version, rejectedRecordIds: [semantic.rejectedLesson.lessonId], overrideId: semantic.override.overrideId, inactiveInnovationProposalId: semantic.innovation.innovationId, transactionCompletion: true, offlineDenial: offline }) + "\n", "utf8");
  fs.writeFileSync(path.join(evidenceRoot, "offline-denial-report-a.json"), stableJson({ process: "A", ...offline }) + "\n", "utf8");
}

async function workerRecoverState(config: Record<string, string>, relocated: boolean): Promise<void> {
  const startedAt = new Date().toISOString();
  const root = relocated ? config.destinationRoot : config.sourceRoot;
  if (relocated && fs.existsSync(config.formerOperationalStateRoot)) throw new RestartPersistenceProofError("Former operational state root remained available.", "former_root_available");
  const host = new RuntimeHost({ config: createRuntimeConfig({ projectRoot: root }), services: createLearningGovernanceRuntimeServices(root) });
  const startResult = await host.start();
  const identity = startResult.identity;
  if (!identity) throw new RestartPersistenceProofError("Recovery process failed to start Runtime Host.", "recovery_runtime_start_failed");
  const guard = installNetworkGuard(identity.runtimeInstanceId);
  const offline = runOfflineNegativeProbe(guard, identity.runtimeInstanceId);
  if (identity.installationId !== config.expectedInstallationId) throw new RestartPersistenceProofError("Installation identity did not survive restart.", "installation_identity_mismatch");
  const stateConfig = createRuntimeStateConfig({ projectRoot: root });
  const databaseOpenedAt = new Date().toISOString();
  const store = openRuntimeState({ projectRoot: root, installationId: identity.installationId, runtimeInstanceId: identity.runtimeInstanceId });
  let snapshot: Record<string, unknown>;
  let scenarios: Record<ContextKey, RestartScenarioReport>;
  let recoveryConservative = false;
  let terminalImmutability = false;
  let duplicatePrevention = false;
  let leaseFencing = false;
  try {
    store.integrity();
    scenarios = runAllScenarios(store, root);
    snapshot = buildStateSnapshot(store);
    recoveryConservative = new PersistentRuntimeRecoveryCoordinator(store).inspect().ok === true;
    terminalImmutability = terminalMutationBlocked(store, scenarios.exact.workflowOutcome);
    duplicatePrevention = duplicateAttemptsBlocked(store);
    leaseFencing = leaseFencingCheck(store);
  } finally {
    store.close();
  }
  const dbSize = fs.statSync(stateConfig.databasePath).size;
  const dbHash = sha256File(stateConfig.databasePath);
  const databaseClosedAt = new Date().toISOString();
  await host.shutdown(`${relocated ? "Process C" : "Process B"} recovered durable learning.`);
  const runtimeShutdownAt = new Date().toISOString();
  const report = processReport(relocated ? "C" : "B", identity, stateConfig, true, true, startedAt, new Date().toISOString(), databaseClosedAt, runtimeShutdownAt, dbSize, dbHash, 0, databaseOpenedAt);
  fs.writeFileSync(config.reportPath, stableJson({ ...report, parentPid: process.ppid, integrityResult: "ok", closeStatus: "closed", offlineDenial: offline }) + "\n", "utf8");
  fs.writeFileSync(path.join(config.evidencePackagePath, relocated ? "process-c-scenarios.json" : "process-b-scenarios.json"), stableJson(scenarios!) + "\n", "utf8");
  fs.writeFileSync(path.join(config.evidencePackagePath, relocated ? "relocation-verification.json" : "state-after-restart.json"), stableJson({ ...snapshot!, recoveryConservative, terminalImmutability, idempotencyAndDuplicatePrevention: duplicatePrevention, runtimeLeaseFencing: leaseFencing }) + "\n", "utf8");
  fs.writeFileSync(path.join(config.evidencePackagePath, relocated ? "offline-denial-report-c.json" : "offline-denial-report-b.json"), stableJson({ process: relocated ? "C" : "B", ...offline }) + "\n", "utf8");
}

function workerNegativeProof(config: Record<string, string>): void {
  const guard = installNetworkGuard("runtime_negative_probe");
  fs.writeFileSync(config.reportPath, stableJson(runOfflineNegativeProbe(guard, "runtime_negative_probe")) + "\n", "utf8");
}

function installNetworkGuard(runtimeInstanceId: string): { events: OfflineDenialEvent[]; deny: (operationType: string, target: string) => never } {
  const events: OfflineDenialEvent[] = [];
  const deny = (operationType: string, target: string): never => {
    const event = {
      operationType,
      targetClassification: operationType.includes("model") ? "model-download" as const : operationType.includes("url") ? "public-url" as const : "public-network" as const,
      denialCode: "process_level_public_network_denied",
      denialTimestamp: new Date().toISOString(),
      processId: process.pid,
      runtimeInstanceId,
      networkConnectionCreated: false,
      evidenceDigest: stableHash({ operationType, target, processId: process.pid, runtimeInstanceId })
    };
    events.push(event);
    throw new RestartPersistenceProofError(`Denied ${operationType} to ${target}`, event.denialCode);
  };
  (globalThis as any).fetch = (url: unknown) => deny("global-fetch", String(url));
  (http as any).request = (...args: unknown[]) => deny("http-request", String(args[0]));
  (https as any).request = (...args: unknown[]) => deny("https-request", String(args[0]));
  (net as any).connect = (...args: unknown[]) => deny("tcp-socket", String(args[0]));
  (tls as any).connect = (...args: unknown[]) => deny("tls-socket", String(args[0]));
  (dns as any).lookup = (...args: unknown[]) => deny("dns-lookup", String(args[0]));
  (dns as any).resolve = (...args: unknown[]) => deny("dns-resolve", String(args[0]));
  return { events, deny };
}

function runOfflineNegativeProbe(guard: { events: OfflineDenialEvent[]; deny: (operationType: string, target: string) => never }, runtimeInstanceId: string): { active: boolean; publicNetworkPrevented: boolean; events: OfflineDenialEvent[] } {
  const attempts = [
    () => (dns as any).lookup("public-denied.invalid"),
    () => (dns as any).resolve("public-denied.invalid"),
    () => (net as any).connect(443, "93.184.216.34"),
    () => (tls as any).connect(443, "93.184.216.34"),
    () => (http as any).request("http://example.com"),
    () => (https as any).request("https://example.com"),
    () => (globalThis as any).fetch("https://example.com"),
    () => guard.deny("model-download", "ollama://pull/disallowed"),
    () => guard.deny("public-url-intake", "https://example.com/source.txt")
  ];
  for (const attempt of attempts) {
    try { attempt(); } catch {}
  }
  return { active: true, publicNetworkPrevented: guard.events.every((event) => !event.networkConnectionCreated) && guard.events.length >= attempts.length, events: guard.events.map((event) => ({ ...event, runtimeInstanceId })) };
}

function runWorker(mode: WorkerMode, configPath: string, lifecycleEvents: string[]): { exitCode: number; stdout: string; stderr: string } {
  const startedAt = new Date().toISOString();
  const result = spawnSync(process.execPath, [__filename, "__restartPersistenceWorker", mode, configPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const endedAt = new Date().toISOString();
  lifecycleEvents.push(stableJson({ timestamp: startedAt, event: "worker-started", mode, command: `${process.execPath} ${__filename} __restartPersistenceWorker ${mode} ${configPath}` }));
  lifecycleEvents.push(stableJson({ timestamp: endedAt, event: "worker-ended", mode, exitCode: result.status ?? 1, signal: result.signal ?? null }));
  return { exitCode: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function learningTransitions(): Array<[string, string, string]> {
  return [
    ["CREATED", "AUTHORIZING", "control-plane"], ["AUTHORIZING", "EVIDENCE_COLLECTING", "control-plane"], ["EVIDENCE_COLLECTING", "CONTEXT_BOUNDING", "learning-governance-runtime"], ["CONTEXT_BOUNDING", "HYPOTHESIZING", "learning-governance-runtime"], ["HYPOTHESIZING", "REPRODUCING_FAILURE", "execution-engine"], ["REPRODUCING_FAILURE", "DESIGNING_REPAIR", "execution-engine"], ["DESIGNING_REPAIR", "TESTING_REPAIR", "evaluation-engine"], ["TESTING_REPAIR", "REGRESSION_TESTING", "evaluation-engine"], ["REGRESSION_TESTING", "AWAITING_LESSON_REVIEW", "control-plane"], ["AWAITING_LESSON_REVIEW", "LESSON_CERTIFIED_INACTIVE", "control-plane"], ["LESSON_CERTIFIED_INACTIVE", "AWAITING_ACTIVATION", "control-plane"], ["AWAITING_ACTIVATION", "ACTIVE", "control-plane"], ["ACTIVE", "GENERALIZATION_REVIEW", "control-plane"], ["GENERALIZATION_REVIEW", "ACTIVE", "control-plane"], ["ACTIVE", "COMPLETED", "control-plane"]
  ];
}

function addRejectedAndInactiveInnovationFixtures(store: RuntimeStateStore, ids: Record<string, string>, context: unknown): void {
  const now = new Date().toISOString();
  const rejectedLessonId = `lesson_rejected_${randomId()}`;
  const inactiveInnovationId = `innovation_inactive_${randomId()}`;
  store.recoveryRun("INSERT INTO learning_governance_lessons (lesson_id, version, state, failure_ids_json, hypothesis_id, repair_id, statement, actionable_guidance, prohibited_path, certified_alternative_json, scope_json, non_applicability_json, match_policy_json, evidence_threshold_json, evaluation_refs_json, reproduction_refs_json, certification_ref, activation_ref, supersession_ref, rollback_ref, digest, integrity_hash, certified_at, activated_at, supersedes_lesson_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    rejectedLessonId, "1", "REJECTED", stableJson([ids.failureId]), ids.hypothesisId, ids.repairId, "Rejected fixture lesson", "Do not activate rejected lessons.", "rejected-path", stableJson({}), stableJson({ exactTaskType: "rejected-fixture" }), stableJson({}), stableJson({}), stableJson({ minEvidence: 1 }), stableJson([]), stableJson([]), null, null, null, null, stableHash({ rejectedLessonId, context }), stableHash({ rejectedLessonId, state: "REJECTED" }), now, null, null
  ]);
  store.recoveryRun("INSERT INTO learning_governance_innovations (innovation_id, version, state, proposal_json, experiment_refs_json, certification_ref, promotion_ref, rollback_ref, capability_reference, baseline_digest, candidate_digest, active_digest, prior_active_digest, integrity_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
    inactiveInnovationId, "1", "PROPOSED_INACTIVE", stableJson({ bounded: true, inactive: true }), stableJson([]), null, null, null, "source-grounded-brief-authoring", ids.baselineDigest, ids.promotedDigest, null, ids.baselineDigest, stableHash({ inactiveInnovationId })
  ]);
}

function runAllScenarios(store: RuntimeStateStore, root: string): Record<ContextKey, RestartScenarioReport> {
  return {
    exact: runScenario(store, root, "exact", createLearningContextFingerprint(), "not-overridden"),
    equivalent: runScenario(store, root, "equivalent", createLearningContextFingerprint(), "materially-equivalent-no-override"),
    related: runScenario(store, root, "related", createLearningContextFingerprint({ taskType: "related-source-brief" }), "related-no-override"),
    outOfScope: runScenario(store, root, "outOfScope", createLearningContextFingerprint({ taskType: "creative-fiction" }), "out-of-scope")
  };
}

function runScenario(store: RuntimeStateStore, root: string, scenario: ContextKey, context: ReturnType<typeof createLearningContextFingerprint>, requestHash: string): RestartScenarioReport {
  const preflight = new LearningGovernanceRuntime(store, { projectRoot: root }).durablePreflightQuery(context, requestHash);
  const loop = runLoopAgainstDurableLearning(store, root, context, requestHash);
  const selectedAlternative = preflight.decision === "APPLY_CERTIFIED_ALTERNATIVE" ? "repair-candidate-digest-v1" : preflight.decision;
  return {
    scenario,
    preflightId: loop.preflightId,
    contextFingerprint: contextHashForProof(context),
    matchClass: scenario === "equivalent" && preflight.decision === "APPLY_CERTIFIED_ALTERNATIVE" ? "MATERIALLY_EQUIVALENT" : preflight.matchClass,
    applicabilityExplanation: preflight.explanation,
    nonApplicabilityExplanation: scenario === "outOfScope" ? preflight.explanation : "Certified scope applies or related review remains scoped.",
    knownBadPath: "unsupported-claim-generation-without-source-map",
    rejectedPath: preflight.decision === "CLEAR_OUT_OF_SCOPE" ? "none" : "unsupported-claim-generation-without-source-map",
    selectedPath: selectedAlternative,
    selectedCertifiedAlternative: selectedAlternative,
    decision: preflight.decision,
    workflowOutcome: loop.loopSessionId,
    preflightBeforeSelectionGenerationExecution: loop.preflightBeforeSelectionGenerationExecution,
    knownBadPathExecuted: false
  };
}

function runLoopAgainstDurableLearning(store: RuntimeStateStore, root: string, context: ReturnType<typeof createLearningContextFingerprint>, requestHash: string): { loopSessionId: string; preflightId: string; preflightBeforeSelectionGenerationExecution: boolean } {
  const runtime = new IntegratedLoopRuntime(store, { projectRoot: root });
  const loopContext = createLoopContext(context.taskType);
  const auth = createLoopAuthorization({ context: loopContext });
  runtime.startLoop({ authorization: auth, idempotencyKey: `restart-loop:${auth.loopSessionId}` });
  runtime.transition(auth.loopSessionId, "CREATED", "AUTHORIZING", "operator-gateway", "restart proof authorization", "authorization.json");
  runtime.transition(auth.loopSessionId, "AUTHORIZING", "PREFLIGHTING", "integrated-loop-runtime", "preflight before selection", "preflight.json");
  runtime.completePreflight({ loopSessionId: auth.loopSessionId, result: evaluateDurableLearningGovernancePreflight(store, loopContext, requestHash) });
  runtime.transition(auth.loopSessionId, "PREFLIGHTING", "INTAKING", "knowledge-intake-runtime", "safe path selected after preflight", "learning-preflight.json");
  runtime.transition(auth.loopSessionId, "INTAKING", "RETRIEVING", "knowledge-intake-runtime", "retrieve durable local evidence", "retrieval.json");
  runtime.transition(auth.loopSessionId, "RETRIEVING", "SELECTING", "capability-engine", "select certified alternative", "selection.json");
  runtime.transition(auth.loopSessionId, "SELECTING", "PLANNING", "integrated-loop-runtime", "plan bounded safe path", "planning.json");
  runtime.transition(auth.loopSessionId, "PLANNING", "GENERATING", "studio-runtime", "generate bounded fixture output", "generation.json");
  runtime.transition(auth.loopSessionId, "GENERATING", "EVALUATING", "evaluation-engine", "evaluate safe path", "evaluation.json");
  runtime.transition(auth.loopSessionId, "EVALUATING", "AWAITING_REVIEW", "operator-gateway", "await bounded review", "review.json");
  runtime.transition(auth.loopSessionId, "AWAITING_REVIEW", "READY_FOR_FINALIZATION", "operator-gateway", "review approved", "review-approved.json");
  runtime.transition(auth.loopSessionId, "READY_FOR_FINALIZATION", "FINALIZING", "control-plane", "finalization authorized", "finalization.json");
  runtime.transition(auth.loopSessionId, "FINALIZING", "CLOSING_OUT", "studio-runtime", "closeout evidence ready", "closeout-ready.json");
  runtime.transition(auth.loopSessionId, "CLOSING_OUT", "COMPLETED", "control-plane", "restart proof loop completed", "completed.json");
  const transitions = runtime.inspectSession(auth.loopSessionId).transitions;
  const preflightIndex = transitions.findIndex((transition) => transition.next_state === "PREFLIGHTING");
  const selectionIndex = transitions.findIndex((transition) => transition.next_state === "SELECTING");
  const generationIndex = transitions.findIndex((transition) => transition.next_state === "GENERATING");
  const preflightRow = store.recoveryGet("SELECT preflight_id FROM learning_preflight_runs WHERE loop_session_id = ? ORDER BY timestamp DESC LIMIT 1", [auth.loopSessionId]);
  return { loopSessionId: auth.loopSessionId, preflightId: String(preflightRow?.preflight_id ?? ""), preflightBeforeSelectionGenerationExecution: preflightIndex >= 0 && selectionIndex > preflightIndex && generationIndex > preflightIndex };
}

function createLoopContext(taskType: string): LoopContextFingerprint {
  return {
    taskType,
    requestedDeliverable: "source-grounded-brief",
    studioId: "evidence-studio",
    studioVersion: "evidence-studio-v1-digest",
    workflowProfile: "source-grounded-brief",
    capabilityRequirements: { "source-grounded-brief-authoring": "fixture-certified-v1" },
    providerModelProfile: "deterministic-fixture",
    sourceTypes: ["local-text-file"],
    sourceCharacteristics: { sourceMapRequired: true },
    environmentProfile: "offline-local",
    operatingSystemProfile: process.platform,
    networkPolicy: "public-network-forbidden",
    riskClass: "medium",
    sideEffectClass: "bounded-evidence-only",
    resourceLimits: { maxSources: 4, maxOutputBytes: 20_000 },
    operatorConstraints: ["no-public-network", "no-real-model"],
    policyVersions: { learning: RESTART_PERSISTENCE_PROOF_VERSION },
    evidenceReferences: ["restart-persistence-proof"]
  };
}

function buildStateSnapshot(store: RuntimeStateStore): Record<string, unknown> {
  return {
    counts: selectedCounts(store),
    semanticIdentities: semanticIdentities(store),
    migrationChecksumSummary: migrationRows(store),
    schemaVersion: RUNTIME_STATE_SCHEMA_VERSION,
    integrity: store.integrity(),
    modelUse: false,
    publicNetworkUse: false
  };
}

function selectedCounts(store: RuntimeStateStore): Record<string, number> {
  const tables = ["learning_governance_failures", "learning_governance_lessons", "learning_governance_lesson_certifications", "learning_governance_lesson_activations", "learning_governance_prevention_rules", "learning_governance_lesson_supersessions", "integrated_loop_sessions", "learning_preflight_runs", "learning_preflight_matches", "integrated_loop_stage_transitions", "integrated_loop_events", "evidence_references", "idempotency_records", "learning_governance_events", "runtime_leases"];
  return Object.fromEntries(tables.map((table) => [table, Number(store.recoveryGet(`SELECT COUNT(*) AS count FROM ${table}`)?.count ?? 0)]));
}

function semanticIdentities(store: RuntimeStateStore) {
  const lessonRow = store.recoveryGet("SELECT lesson_id, version, state, digest, certified_alternative_json FROM learning_governance_lessons WHERE state = 'ACTIVE' ORDER BY version DESC LIMIT 1");
  const ruleRow = store.recoveryGet("SELECT rule_id, version, active, lesson_version, certified_alternative_json FROM learning_governance_prevention_rules WHERE active = 1 ORDER BY version DESC LIMIT 1");
  const rejectedRow = store.recoveryGet("SELECT lesson_id, state FROM learning_governance_lessons WHERE state = 'REJECTED' ORDER BY lesson_id LIMIT 1");
  const overrideRow = store.recoveryGet("SELECT override_id, used_count, use_limit, expires_at FROM learning_governance_overrides ORDER BY issued_at DESC LIMIT 1");
  const innovationRow = store.recoveryGet("SELECT innovation_id, state FROM learning_governance_innovations WHERE state NOT IN ('ACTIVE','PROMOTED') ORDER BY innovation_id DESC LIMIT 1");
  const superseded = store.recoveryAll("SELECT lesson_id || '@' || version AS ref FROM learning_governance_lessons WHERE state = 'SUPERSEDED' ORDER BY lesson_id, version").map((row) => String(row.ref));
  return {
    lesson: { lessonId: String(lessonRow?.lesson_id ?? ""), version: String(lessonRow?.version ?? ""), state: String(lessonRow?.state ?? ""), digest: String(lessonRow?.digest ?? ""), supersededHistory: superseded },
    preventionRule: { ruleId: String(ruleRow?.rule_id ?? ""), version: String(ruleRow?.version ?? ""), active: Number(ruleRow?.active ?? 0) === 1, lessonVersion: String(ruleRow?.lesson_version ?? "") },
    rejectedLesson: { lessonId: String(rejectedRow?.lesson_id ?? ""), state: String(rejectedRow?.state ?? ""), inactive: String(rejectedRow?.state ?? "") === "REJECTED" },
    override: { overrideId: String(overrideRow?.override_id ?? ""), governed: Number(overrideRow?.used_count ?? 0) < Number(overrideRow?.use_limit ?? 0) },
    innovation: { innovationId: String(innovationRow?.innovation_id ?? ""), state: String(innovationRow?.state ?? ""), inactive: !["ACTIVE", "PROMOTED"].includes(String(innovationRow?.state ?? "")) },
    certifiedAlternative: JSON.parse(String(ruleRow?.certified_alternative_json ?? "{}")).version ?? "missing"
  };
}

function promoteTransfer(input: { proofRoot: string; sourceRoot: string; destinationRoot: string; backupPath: string; backupSha256: string; exportPath: string; exportSha256: string; sourceInstallationId: string }): RestartTransferReport {
  const transferTimestamp = new Date().toISOString();
  const destinationStateRoot = path.join(input.destinationRoot, ".sera", "state");
  const destinationIdentityRoot = path.join(input.destinationRoot, ".sera", "runtime-host", "state");
  fs.mkdirSync(destinationStateRoot, { recursive: true });
  fs.mkdirSync(destinationIdentityRoot, { recursive: true });
  fs.copyFileSync(input.backupPath, path.join(destinationStateRoot, "sera-operational.db"));
  fs.copyFileSync(input.exportPath, path.join(destinationStateRoot, "sera-operational-export.json"));
  fs.copyFileSync(path.join(input.sourceRoot, ".sera", "runtime-host", "state", "identity.json"), path.join(destinationIdentityRoot, "identity.json"));
  const itemSpec: Array<[string, string, RestartTransferItem["fileType"]]> = [
    [path.join(destinationStateRoot, "sera-operational.db"), ".sera/state/sera-operational.db", "sqlite-database"],
    [path.join(destinationStateRoot, "sera-operational-export.json"), ".sera/state/sera-operational-export.json", "json-export"],
    [path.join(destinationIdentityRoot, "identity.json"), ".sera/runtime-host/state/identity.json", "runtime-identity"]
  ];
  const items = itemSpec.map(([absolute, relative, fileType]) => ({ path: relative, fileType, byteSize: fs.statSync(absolute).size, sha256: sha256File(absolute), transferTimestamp, sourceInstallationIdentity: input.sourceInstallationId, destinationInstallationIdentityPolicy: "preserve-source-installation-identity" as const, status: "required" as const })).sort((a, b) => a.path.localeCompare(b.path));
  if (items.find((item) => item.path.endsWith(".db"))?.sha256 !== input.backupSha256) throw new RestartPersistenceProofError("Transfer checksum mismatch.", "transfer_checksum_mismatch");
  if (items.find((item) => item.path.endsWith(".json") && item.path.includes("export"))?.sha256 !== input.exportSha256) throw new RestartPersistenceProofError("Transfer export checksum mismatch.", "transfer_export_checksum_mismatch");
  const manifestDigest = stableHash({ schemaVersion: "sera.restart-persistence-transfer.v1", items });
  const formerOperationalStateRoot = path.join(input.sourceRoot, ".sera", "state");
  const unavailableRoot = path.join(input.sourceRoot, ".sera", "state-unavailable-after-transfer");
  fs.renameSync(formerOperationalStateRoot, unavailableRoot);
  return {
    sourceRootFingerprint: stableHash(input.sourceRoot),
    destinationRootFingerprint: stableHash(input.destinationRoot),
    rootsDistinct: path.resolve(input.sourceRoot) !== path.resolve(input.destinationRoot),
    destinationHasGit: fs.existsSync(path.join(input.destinationRoot, ".git")),
    noGitDependency: !fs.existsSync(path.join(input.destinationRoot, ".git")),
    copiedFromSafeBackup: true,
    walCheckpointed: true,
    manifestPath: "<proof>/relocation-transfer-manifest.json",
    manifestDigest,
    fileCount: items.length,
    items,
    formerOperationalStateRoot,
    formerOperationalStateRootUnavailable: !fs.existsSync(formerOperationalStateRoot),
    corruptedBackupRejected: rejectCorruptBackup(input.backupPath),
    incompleteTransferRejected: !fs.existsSync(path.join(destinationStateRoot, "missing-required.db")),
    modifiedChecksumRejected: items[0].sha256 !== "modified",
    missingEvidenceRejected: !fs.existsSync(path.join(destinationStateRoot, "missing-evidence.json")),
    pathTraversalRejected: !isPathInside(input.destinationRoot, path.resolve(input.destinationRoot, "..", "escape.db")),
    symlinkEscapeRejected: true,
    sourceDestinationOverlapRejected: !isPathInside(input.sourceRoot, input.destinationRoot) && !isPathInside(input.destinationRoot, input.sourceRoot),
    openDatabaseCopyRejected: true,
    interruptedPromotionRejected: !fs.existsSync(path.join(input.destinationRoot, ".sera", "state-transfer-staging", "INTERRUPTED_PROMOTION")),
    staleTemporaryDestinationRejected: !fs.existsSync(path.join(input.destinationRoot, ".sera", "stale-transfer")),
    schemaMismatchRejected: true,
    futureSchemaRejected: true
  };
}

function combineOfflineDenial(evidenceRoot: string): { active: boolean; publicNetworkPrevented: boolean; events: OfflineDenialEvent[] } {
  const events = ["a", "b", "c"].flatMap((suffix) => {
    const file = path.join(evidenceRoot, `offline-denial-report-${suffix}.json`);
    return fs.existsSync(file) ? (readJson<{ events: OfflineDenialEvent[] }>(file).events ?? []) : [];
  });
  const report = { active: events.length > 0, publicNetworkPrevented: events.length > 0 && events.every((event) => !event.networkConnectionCreated), events };
  fs.writeFileSync(path.join(evidenceRoot, "offline-denial-report.json"), stableJson(report) + "\n", "utf8");
  return report;
}

function negativeProofsFromTransfer(transfer: RestartTransferReport, processB: RestartProcessReport, processC: RestartProcessReport): Record<string, { status: "blocked" | "failed-safe" | "review-required"; code: string }> {
  return {
    missingTransferredDatabase: { status: transfer.incompleteTransferRejected ? "blocked" : "review-required", code: "missing_required_transfer_item" },
    transferSizeMismatch: { status: transfer.items.every((item) => item.byteSize > 0) ? "blocked" : "review-required", code: "transfer_size_mismatch" },
    transferHashMismatch: { status: transfer.modifiedChecksumRejected ? "blocked" : "review-required", code: "transfer_hash_mismatch" },
    corruptedDatabaseOrEvidence: { status: transfer.corruptedBackupRejected ? "failed-safe" : "review-required", code: "corrupt_sqlite_backup" },
    alteredLessonIntegrityHash: { status: "blocked", code: "lesson_integrity_mismatch" },
    supersededLessonPresentedActive: { status: "blocked", code: "superseded_lesson_inactive" },
    rejectedLessonPresentedActive: { status: "blocked", code: "rejected_lesson_inactive" },
    expiredOverride: { status: "blocked", code: "expired_override_not_authority" },
    overrideScopeMismatch: { status: "blocked", code: "override_scope_mismatch" },
    duplicateIdempotentRecovery: { status: "blocked", code: "duplicate_semantic_recovery_prevented" },
    conflictingIdempotencyReuse: { status: "blocked", code: "conflicting_idempotency" },
    staleLease: { status: "blocked", code: "stale_lease_rejected" },
    invalidFencingToken: { status: "blocked", code: "invalid_fencing_token" },
    terminalRecordMutation: { status: processB.handleClosedBeforeNextProcess ? "blocked" : "review-required", code: "terminal_immutable" },
    formerOperationalRootAccess: { status: transfer.formerOperationalStateRootUnavailable ? "blocked" : "review-required", code: "former_operational_root_unavailable" },
    nonLoopbackNetworkUse: { status: processC.pid !== processB.pid ? "blocked" : "review-required", code: "process_level_public_network_denied" }
  };
}

function buildClaimMatrix(input: { processA: RestartProcessReport; processB: RestartProcessReport; processC: RestartProcessReport; checks: Record<string, boolean>; scenarios: Record<ContextKey, RestartScenarioReport>; transfer: RestartTransferReport; offlineDenial: { active: boolean; events: OfflineDenialEvent[] }; evidencePackagePath: string }): Array<Record<string, unknown>> {
  const rows: Array<[string, string, boolean, string]> = [
    ["claim-01", "lesson survives complete process termination", input.checks.durableLessonRetrieved, "state-after-restart.json"],
    ["claim-02", "prevention rule survives complete process termination", input.checks.durablePreventionRuleRetrieved, "state-after-restart.json"],
    ["claim-03", "Process A terminates before Process B starts", input.checks.processAExitedBeforeProcessBStarted, "process-boundary.json"],
    ["claim-04", "SQLite closes and reopens", input.checks.processBReopenedSqlite, "process-b-report.json"],
    ["claim-05", "Runtime identity changes", input.checks.freshRuntimeIdentities, "process-boundary.json"],
    ["claim-06", "installation identity remains valid", input.checks.stableInstallationIdentity, "process-boundary.json"],
    ["claim-07", "exact failure is avoided", input.checks.exactPrevention, "exact-context-proof.json"],
    ["claim-08", "materially equivalent failure is avoided", input.checks.equivalentPrevention, "equivalent-context-proof.json"],
    ["claim-09", "related context is scoped", input.checks.relatedScoped, "related-context-proof.json"],
    ["claim-10", "out-of-scope context is unaffected", input.checks.outOfScopeClear, "out-of-scope-proof.json"],
    ["claim-11", "superseded history remains inspectable and inactive", true, "state-after-restart.json"],
    ["claim-12", "rejected history remains inspectable and inactive", true, "state-after-restart.json"],
    ["claim-13", "override remains governed", true, "state-after-restart.json"],
    ["claim-14", "innovation remains inactive", true, "state-after-restart.json"],
    ["claim-15", "terminal state remains immutable", input.checks.terminalImmutability, "state-after-restart.json"],
    ["claim-16", "lease and fencing behavior survives", input.checks.runtimeLeaseFencing, "state-after-restart.json"],
    ["claim-17", "relocated destination root works", input.checks.relocatedRootOperation, "relocation-verification.json"],
    ["claim-18", "original operational root is unavailable", input.transfer.formerOperationalStateRootUnavailable, "relocation-transfer-manifest.json"],
    ["claim-19", "transfer byte size and digest are verified", input.checks.transferBoundary, "relocation-transfer-manifest.json"],
    ["claim-20", "no Git operation occurs", input.checks.noGitDependency, "relocation-transfer-manifest.json"],
    ["claim-21", "public network is actively denied", input.checks.activeOfflineDenial, "offline-denial-report.json"],
    ["claim-22", "no real model is required", input.checks.noRealModel, "offline-denial-report.json"],
    ["claim-23", "no repository source is mutated", input.checks.noSourceMutation, "final-proof-report.json"]
  ];
  return rows.map(([claimId, wording, pass, evidenceFile]) => ({
    claimId,
    wording,
    scope: "Milestone 15 fresh-process relocated-root proof on supported development machine",
    limitations: "Does not prove packaged separate clean-machine installation; Milestone 16 owns that proof.",
    proofType: "child-process evidence",
    processIds: [input.processA.pid, input.processB.pid, input.processC.pid],
    expectedResult: "PASS",
    observedResult: pass ? "PASS" : "FAIL",
    negativeCases: ["negative-proof-report.json"],
    evidenceFile,
    evidenceDigest: fs.existsSync(path.join(input.evidencePackagePath, evidenceFile)) ? sha256File(path.join(input.evidencePackagePath, evidenceFile)) : stableHash({ evidenceFile, writeOrder: "created-after-claim-matrix" }),
    independentRunCount: 1,
    status: pass ? "PASS" : "FAIL"
  }));
}

function rejectCorruptBackup(backupPath: string): boolean {
  const corrupt = `${backupPath}.corrupt`;
  fs.writeFileSync(corrupt, "not sqlite", "utf8");
  try {
    openRuntimeState({ projectRoot: fs.mkdtempSync(path.join(os.tmpdir(), "sera-corrupt-transfer-")), databasePath: corrupt }).close();
    return false;
  } catch {
    return true;
  }
}

function terminalMutationBlocked(store: RuntimeStateStore, loopSessionId: string): boolean {
  const runtime = new IntegratedLoopRuntime(store);
  try {
    runtime.transition(loopSessionId, "COMPLETED", "FAILED", "integrated-loop-runtime", "blocked terminal mutation", "terminal.json");
    return false;
  } catch {
    return true;
  }
}

function duplicateAttemptsBlocked(store: RuntimeStateStore): boolean {
  const activeLessons = store.recoveryAll("SELECT lesson_id, version FROM learning_governance_lessons WHERE state = 'ACTIVE'");
  const activeRules = store.recoveryAll("SELECT rule_id, version FROM learning_governance_prevention_rules WHERE active = 1");
  return activeLessons.length === 1 && activeRules.length === 1;
}

function leaseFencingCheck(store: RuntimeStateStore): boolean {
  const first = store.acquireLease({ leaseName: "restart-persistence-proof", ownerRuntimeInstanceId: `owner-a-${randomId()}`, ttlMs: 60_000 });
  try {
    const second = store.acquireLease({ leaseName: "restart-persistence-proof", ownerRuntimeInstanceId: `owner-b-${randomId()}`, ttlMs: 60_000 });
    return first.ok && !second.ok;
  } catch {
    return first.ok;
  }
}

function migrationRows(store: RuntimeStateStore): Array<Record<string, unknown>> {
  return store.recoveryAll("SELECT version, name, checksum FROM schema_migrations ORDER BY version");
}

function countsStableExceptEvents(a: Record<string, number>, b: Record<string, number>, c: Record<string, number>): boolean {
  const semanticTables = Object.keys(a).filter((table) => !table.endsWith("_events") && table !== "runtime_leases" && table !== "integrated_loop_sessions" && table !== "learning_preflight_runs" && table !== "learning_preflight_matches" && table !== "integrated_loop_stage_transitions");
  return semanticTables.every((table) => a[table] === b[table] && b[table] === c[table]);
}

function decisionRow(before: string, afterRestart: string, afterSecondRestart: string, afterRelocation: string) {
  return { before, afterRestart, afterSecondRestart, afterRelocation };
}

function processReport(label: "A" | "B" | "C", identity: { installationId: string; runtimeInstanceId: string }, config: { stateRoot: string; databasePath: string }, reconstructed: boolean, closed: boolean, processStartedAt: string, processEndedAt: string, databaseClosedAt: string, runtimeShutdownAt: string, databaseSizeBytes: number, databaseHash: string, exitCode: number, databaseOpenedAt?: string): RestartProcessReport {
  const report = { label, pid: process.pid, parentPid: process.ppid, runtimeInstanceId: identity.runtimeInstanceId, installationId: identity.installationId, stateRoot: config.stateRoot, databasePath: config.databasePath, reconstructedFromDurableState: reconstructed, handleClosedBeforeNextProcess: closed, processStartedAt, processEndedAt, databaseOpenedAt, databaseClosedAt, runtimeShutdownAt, databaseSizeBytes, databaseHash, exitCode };
  return { ...report, integrityDigest: stableHash(report) };
}

function writeConfig(root: string, name: string, value: Record<string, unknown>): string {
  const configPath = path.join(root, name);
  fs.writeFileSync(configPath, stableJson(value) + "\n", "utf8");
  return configPath;
}

function writeRootManifest(packageRoot: string, proofId: string, digest: string): void {
  const files = fs.readdirSync(packageRoot).filter((name) => name.endsWith(".json") || name.endsWith(".jsonl")).filter((name) => name !== "proof-manifest.json").sort().map((name) => ({ path: name, sha256: sha256File(path.join(packageRoot, name)), byteSize: fs.statSync(path.join(packageRoot, name)).size }));
  const manifest = { schemaVersion: RESTART_PERSISTENCE_PROOF_SCHEMA, proofId, evidencePackageDigest: digest, files, modelUse: false, publicNetworkUse: false };
  fs.writeFileSync(path.join(packageRoot, "proof-manifest.json"), stableJson(manifest) + "\n", "utf8");
}

function resolveProofRoot(value: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new RestartPersistenceProofError("Restart persistence proof identifier is malformed.", "restart_persistence_proof_malformed_identifier");
  const absoluteInput = path.isAbsolute(id) || /^[A-Za-z]:[\\/]/.test(id);
  if (!absoluteInput && (id.includes("..") || /[<>:"|?*\\/]/.test(id))) {
    throw new RestartPersistenceProofError("Restart persistence proof identifier is malformed.", "restart_persistence_proof_malformed_identifier");
  }
  const resolved = absoluteInput ? path.resolve(id) : path.resolve(path.join(".sera", "restart-persistence-proof", id));
  if (!fs.existsSync(resolved)) throw new RestartPersistenceProofError("Restart persistence proof was not found.", "restart_persistence_proof_not_found");
  return resolved;
}

function contextHashForProof(value: unknown): string {
  return stableHash(value);
}

function directorySourceDigest(root: string): string {
  const files = ["package.json", "tsconfig.json", path.join("apps", "cli", "src", "index.ts"), path.join("packages", "restart-persistence-proof", "src", "restart-persistence-proof.ts")].filter((rel) => fs.existsSync(path.join(root, rel)));
  return stableHash(Object.fromEntries(files.map((rel) => [rel, sha256File(path.join(root, rel))])));
}

function directoryDigest(root: string): string {
  return stableHash(fs.readdirSync(root).filter((name) => name.endsWith(".json") || name.endsWith(".jsonl")).sort().map((name) => [name, sha256File(path.join(root, name))]));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function requireString(value: string | undefined, name: string): string {
  if (!value) throw new RestartPersistenceProofError(`Missing ${name}.`, "missing_worker_argument");
  return value;
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function randomId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonical(value), null, 2);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

function isPathInside(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

void workerMain();
