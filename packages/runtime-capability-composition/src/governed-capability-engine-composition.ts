import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CAPABILITY_POLICY_VERSION,
  CapabilityEngine,
  createCapabilityAuthorization,
  type CandidateBundle,
  type CapabilityAuthorization,
  type CapabilityProposal
} from "@sera/capability-engine";
import {
  EvaluationEngine,
  EVALUATION_POLICY_VERSION,
  EVALUATION_PROFILE_VERSION,
  withSpecificationHash
} from "@sera/evaluation-engine";
import {
  createDefaultExecutableRegistry,
  createExecutionAuthorization,
  type ExecutionAuthority,
  type ExecutionRequest
} from "@sera/execution-engine";
import type { RuntimeStateStore } from "@sera/runtime-state";
import {
  M16_A1_CANDIDATE_TESTS,
  M16_A1_EXECUTABLE_ID,
  M16_A1_MAX_INPUT_BYTES,
  M16_A1_OPERATION,
  M16_A1_PROFILE_ID,
  determineCapabilityGap,
  hashBoundedValue,
  resolveBoundedAcquisitionProfile,
  type BoundedCapabilityAcquisitionRequest
} from "./bounded-capability-acquisition";
import {
  ReleaseRelativeRuntimeCapabilityRegistryReader,
  type RuntimeCapabilityRegistryReader
} from "./runtime-capability-registry-reader";

export interface CapabilityControlPlanePort {
  recoveryGet(sql: string, params?: unknown[]): any;
  recordEvidenceReference(input: any): string;
  requireExecutionAuthority(): ExecutionAuthority;
}

export interface GovernedCapabilityEngineAuthorization {
  attemptId: string;
  capabilityId: "capability-engine";
  sourcePath: string;
  sourceSha256: string;
  proposal: Omit<CapabilityProposal, "integrityHash">;
  proposalAuthorization: CapabilityAuthorization;
  experimentAuthorization: CapabilityAuthorization;
  issuedAt: string;
  expiresAt: string;
  integrityHash: string;
}

export interface M16A1OperatorRequestIdentity {
  requestId: string;
  requestHash: string;
  normalizedObjective: string;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

function fileSha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function hashDirectoryTree(root: string): Record<string, string> {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error("Candidate bundle root is unavailable.");
  }

  const files: string[] = [];

  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        throw new Error("Candidate bundle symbolic links are prohibited.");
      }

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  };

  walk(root);

  return Object.fromEntries(
    files
      .sort((a, b) => a.localeCompare(b))
      .map((file) => [
        path.relative(root, file).replace(/\\/g, "/"),
        fileSha256(file)
      ])
  );
}

function directoryBytes(root: string): number {
  let total = 0;

  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        throw new Error("Candidate bundle symbolic links are prohibited.");
      }

      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        total += fs.statSync(full).size;
      }
    }
  };

  walk(root);

  return total;
}

export function createM16A2CertificationReviewSummary(input: {
  candidateDigest: string;
  reviewPacketHash: string;
}): string {
  return [
    "M16-A2 certification review",
    `candidate=${input.candidateDigest}`,
    `review=${input.reviewPacketHash}`,
    "action=CERTIFY_OR_REJECT"
  ].join(" | ");
}
function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function writeJson(filePath: string, value: unknown): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

export function createGovernedCapabilityEngineAuthorization(input: {
  attemptId: string;
  sourcePath: string;
  sourceSha256?: string;
  ttlMs?: number;
  now?: Date;
}): GovernedCapabilityEngineAuthorization {
  const sourcePath = path.resolve(input.sourcePath);
  const sourceSha256 = input.sourceSha256 ?? fileSha256(sourcePath);
  const issued = input.now ?? new Date();
  const sessionId = randomId("m5_learning_session");
  const proposalId = randomId("m5_proposal");
  const candidateRequestHash = digest({
    sourceSha256,
    desiredOutcome: "Assemble an immutable deterministic-transform candidate bundle from real repository evidence."
  });
  const proposal: Omit<CapabilityProposal, "integrityHash"> = {
    proposalId,
    sessionId,
    capabilityId: "capability.m5.real-resource-transform",
    displayName: "M5 Real Resource Transform Candidate",
    source: "operator-request",
    sourceEvidence: [{
      id: "build-validation-real-resource",
      uri: sourcePath,
      sha256: sourceSha256,
      kind: "real-repository-resource"
    }],
    learningLane: "acquisition",
    riskClass: "low",
    requestedType: "deterministic-transform",
    desiredOutcome: "Assemble an immutable deterministic-transform candidate bundle from real repository evidence.",
    candidateRequestHash,
    modelGenerated: false,
    candidateIntelligence: false,
    createdAt: issued.toISOString(),
    policyVersion: CAPABILITY_POLICY_VERSION
  };
  const common = {
    attemptId: input.attemptId,
    sessionId,
    proposalId,
    capabilityId: proposal.capabilityId,
    candidateRequestHash,
    learningLane: proposal.learningLane,
    riskClass: proposal.riskClass,
    ttlMs: input.ttlMs ?? 60_000,
    issuedAt: issued
  };
  const unsigned = {
    attemptId: input.attemptId,
    capabilityId: "capability-engine" as const,
    sourcePath,
    sourceSha256,
    proposal,
    proposalAuthorization: createCapabilityAuthorization({ authorizationType: "proposal", ...common }),
    experimentAuthorization: createCapabilityAuthorization({ authorizationType: "experiment", ...common }),
    issuedAt: issued.toISOString(),
    expiresAt: new Date(issued.getTime() + (input.ttlMs ?? 60_000)).toISOString()
  };
  return { ...unsigned, integrityHash: digest(unsigned) };
}

export class GovernedCapabilityEngineComposition {
  private readonly registryReader: RuntimeCapabilityRegistryReader;

  constructor(
    private readonly controlPlane: CapabilityControlPlanePort,
    private readonly store: RuntimeStateStore,
    private readonly projectRoot: string,
    input: { registryReader?: RuntimeCapabilityRegistryReader } = {}
  ) {
    this.registryReader = input.registryReader ?? new ReleaseRelativeRuntimeCapabilityRegistryReader(projectRoot);
  }

  private requireRunningAttempt(attemptId: string): void {
    const attempt = this.controlPlane.recoveryGet(
      "SELECT capability, current_state FROM attempts WHERE attempt_id = ?",
      [attemptId]
    );
    if (!attempt || attempt.capability !== "capability-engine" || attempt.current_state !== "RUNNING") {
      throw new Error("Governed Capability Engine requires an authoritative RUNNING capability-engine attempt.");
    }
  }

  async acquireBoundedCandidate(input: {
    attemptId: string;
    operatorRequest: M16A1OperatorRequestIdentity;
    acquisitionRequest: BoundedCapabilityAcquisitionRequest;
  }) {
    this.requireRunningAttempt(input.attemptId);
    const { requirement, profileHash } = resolveBoundedAcquisitionProfile(input.acquisitionRequest, input.operatorRequest.normalizedObjective);
    const snapshot = this.registryReader.read();
    const activeRows = this.store.recoveryAll("SELECT capability_id, active_version_digest FROM capability_active_versions ORDER BY capability_id");
    const activeByCapability = Object.fromEntries(activeRows.map((row: any) => [String(row.capability_id), String(row.active_version_digest)]));
    const gap = determineCapabilityGap(snapshot, requirement, activeByCapability);
    const evidenceRoot = path.join(this.projectRoot, ".sera", "capability-engine-composition", input.attemptId);
    const registryEvidencePath = writeJson(path.join(evidenceRoot, "registry-snapshot.json"), {
      schemaVersion: snapshot.schemaVersion,
      registryRelativePath: snapshot.registryRelativePath,
      sha256: snapshot.sha256,
      bytes: snapshot.bytes,
      capabilities: snapshot.document.capabilities
    });
    const gapEvidencePath = writeJson(path.join(evidenceRoot, "gap-determination.json"), {
      operatorRequest: input.operatorRequest,
      acquisitionProfile: { profileId: M16_A1_PROFILE_ID, profileHash },
      ...gap
    });
    const registryEvidenceHash = fileSha256(registryEvidencePath);
    const gapEvidenceHash = fileSha256(gapEvidencePath);
    const registryEvidenceReferenceId = this.controlPlane.recordEvidenceReference({
      attemptId: input.attemptId,
      evidenceType: "runtime-capability-registry-snapshot",
      location: path.relative(this.projectRoot, registryEvidencePath).replace(/\\/g, "/"),
      integrityHash: registryEvidenceHash,
      producer: "governed-capability-engine-composition",
      metadata: { registrySha256: snapshot.sha256, schemaVersion: snapshot.schemaVersion }
    });
    const gapEvidenceReferenceId = this.controlPlane.recordEvidenceReference({
      attemptId: input.attemptId,
      evidenceType: "capability-gap-determination",
      location: path.relative(this.projectRoot, gapEvidencePath).replace(/\\/g, "/"),
      integrityHash: gapEvidenceHash,
      producer: "governed-capability-engine-composition",
      metadata: { gapStatus: gap.gapStatus, determinationHash: gap.determinationHash, registrySha256: snapshot.sha256 }
    });

    if (gap.gapStatus === "SATISFIED") {
      return {
        gap,
        registry: snapshot,
        candidateCreated: false as const,
        evidenceReferenceIds: [registryEvidenceReferenceId, gapEvidenceReferenceId],
        offline: true as const,
        publicNetworkUse: false as const,
        cloudProviderUse: false as const,
        modelUse: false as const,
        externalPackageAcquisition: false as const,
        repositoryMutation: false as const,
        attemptTerminalStateChanged: false as const
      };
    }

    const activeBefore = this.store.recoveryGet("SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?", [requirement.capabilityId]);
    const certifiedBefore = this.store.recoveryAll("SELECT version_digest FROM capability_versions WHERE capability_id = ? AND lifecycle_status = 'CERTIFIED'", [requirement.capabilityId]);
    const promotedBefore = this.store.recoveryAll("SELECT version_digest FROM capability_versions WHERE capability_id = ? AND lifecycle_status = 'PROMOTED'", [requirement.capabilityId]);
    const sessionId = randomId("m16_a1_learning_session");
    const proposalId = randomId("m16_a1_proposal");
    const candidateRequestHash = hashBoundedValue({ requestHash: input.operatorRequest.requestHash, requirement, registrySha256: snapshot.sha256, gapHash: gap.determinationHash });
    const proposalBase: Omit<CapabilityProposal, "integrityHash"> = {
      proposalId,
      sessionId,
      capabilityId: requirement.capabilityId,
      displayName: "Stable Unique Line Sort v1",
      source: "operator-request",
      sourceEvidence: [
        { id: "m16-a1-gap-determination", uri: gapEvidencePath, sha256: gapEvidenceHash, kind: "capability-gap-determination" },
        { id: "m16-a1-registry-snapshot", uri: registryEvidencePath, sha256: registryEvidenceHash, kind: "runtime-capability-registry-snapshot" }
      ],
      learningLane: "acquisition",
      riskClass: "low",
      requestedType: "deterministic-transform",
      desiredOutcome: requirement.objective,
      candidateRequestHash,
      modelGenerated: false,
      candidateIntelligence: false,
      requestHash: input.operatorRequest.requestHash,
      createdAt: new Date().toISOString(),
      policyVersion: CAPABILITY_POLICY_VERSION
    };
    const common = {
      attemptId: input.attemptId,
      sessionId,
      proposalId,
      capabilityId: proposalBase.capabilityId,
      candidateRequestHash,
      learningLane: proposalBase.learningLane,
      riskClass: proposalBase.riskClass,
      approvedExecutableIds: [M16_A1_EXECUTABLE_ID] as [typeof M16_A1_EXECUTABLE_ID]
    };
    const proposalAuthorization = createCapabilityAuthorization({ authorizationType: "proposal", ...common });
    const experimentAuthorization = createCapabilityAuthorization({ authorizationType: "experiment", ...common });
    const engine = new CapabilityEngine(this.store, { projectRoot: this.projectRoot });
    const proposal = engine.createProposal(proposalBase, proposalAuthorization, `m16-a1-proposal:${input.operatorRequest.requestHash}`);
    const bundle = engine.assembleCandidate(proposal, experimentAuthorization, {
      inputSchema: { type: "object", required: ["input"], properties: { input: { type: "string", maxLength: M16_A1_MAX_INPUT_BYTES } } },
      outputSchema: { type: "object", required: ["result"], properties: { result: { type: "string" } } },
      allowedInvocationModes: ["fixture"],
      approvedExecutionRecipe: { executableId: M16_A1_EXECUTABLE_ID, args: [M16_A1_OPERATION, "input/source.txt", "out/result.txt", String(M16_A1_MAX_INPUT_BYTES)], profileId: "offline-minimal", shell: false, timeoutMs: 5000 },
      evaluationProfile: { profileId: "deterministic-default", requiredAssertions: ["expected_output_hash_matches", "source_unchanged", "deterministic_replay"], optionalAssertions: ["stderr_empty"] },
      providerRequirements: { modelRequired: false, allowedProviderProfiles: ["none"], candidateIntelligenceRefs: [] },
      knowledgeRequirements: { required: false, provenanceRefs: proposal.sourceEvidence, trustInferred: false },
      sideEffects: "none",
      networkPolicy: "offline-strict",
      modelUsePolicy: "none",
      resourceLimits: { timeoutMs: 5000, maxCandidateBytes: 512 * 1024 }
    });

    const executable = createDefaultExecutableRegistry().get(M16_A1_EXECUTABLE_ID);
    if (!executable.offlineCompatible || executable.networkCapable) throw new Error("M16-A1 executable policy is not offline-safe.");
    executable.validateArgs(bundle.manifest.approvedExecutionRecipe.args);
    const executionAuthority = this.controlPlane.requireExecutionAuthority();
    const testResults: any[] = [];
    for (const test of M16_A1_CANDIDATE_TESTS) {
      const executionId = randomId(`m16_a1_exec_${test.id.replace(/[^a-z0-9]+/gi, "_")}`);
      const request: ExecutionRequest = {
        executionId,
        attemptId: input.attemptId,
        authorizationId: randomId("m16_a1_exec_auth"),
        executableId: M16_A1_EXECUTABLE_ID,
        args: [...bundle.manifest.approvedExecutionRecipe.args],
        inputs: [{ id: "source", sourceType: "inline-text", workspacePath: "input/source.txt", content: test.input }],
        outputs: [{ id: "result", workspacePath: "out/result.txt", required: test.expectSuccess }],
        workingDirectory: ".",
        environmentProfile: "offline-minimal",
        timeoutMs: 5000,
        gracefulCancellationMs: 100,
        maxStdoutBytes: 16384,
        maxStderrBytes: 16384,
        maxCombinedOutputBytes: 32768,
        expectedExitCodes: [0],
        networkPolicy: "offline-strict",
        cleanupPolicy: "delete-workspace",
        correlation: { operatorRequestId: input.operatorRequest.requestId, candidateDigest: bundle.versionDigest, testId: test.id }
      };
      const executionAuthorization = createExecutionAuthorization({ request, requiredGateRefs: ["m16-a1-candidate-test-gate"], completedGateRefs: ["m16-a1-candidate-test-gate"] });
      const execution = await executionAuthority.execute(request, executionAuthorization);
      const output = execution.outputs.find((candidate) => candidate.id === "result");
      let actual: string | null = null;
      if (output?.evidenceReference) actual = fs.readFileSync(path.join(execution.evidenceRoot, output.evidenceReference), "utf8");
      const successObserved = execution.status === "SUCCEEDED_PROCESS";
      const passed = test.expectSuccess ? successObserved && actual === test.expected : !successObserved;
      testResults.push({
        testId: test.id,
        expectSuccess: test.expectSuccess,
        executionId,
        executionStatus: execution.status,
        expected: test.expected,
        actual,
        expectedHash: test.expected === null ? null : crypto.createHash("sha256").update(test.expected).digest("hex"),
        actualHash: actual === null ? null : crypto.createHash("sha256").update(actual).digest("hex"),
        expectationHash: hashBoundedValue({ expectSuccess: test.expectSuccess, expected: test.expected }),
        resultHash: hashBoundedValue({ status: execution.status, actual }),
        sourceNotMutated: execution.sourceNotMutated,
        workspaceOutsideRepository: execution.workspaceOutsideRepository,
        cleanupCleaned: execution.cleanup.cleaned,
        undeclaredOutputCount: execution.undeclaredOutputs.length,
        passed
      });
    }
    const replayA = testResults.find((item) => item.testId === "duplicate-lines");
    const replayRequest = M16_A1_CANDIDATE_TESTS.find((item) => item.id === "duplicate-lines")!;
    const replayExecutionId = randomId("m16_a1_exec_replay");
    const replayExecRequest: ExecutionRequest = {
      executionId: replayExecutionId,
      attemptId: input.attemptId,
      authorizationId: randomId("m16_a1_exec_auth"),
      executableId: M16_A1_EXECUTABLE_ID,
      args: [...bundle.manifest.approvedExecutionRecipe.args],
      inputs: [{ id: "source", sourceType: "inline-text", workspacePath: "input/source.txt", content: replayRequest.input }],
      outputs: [{ id: "result", workspacePath: "out/result.txt", required: true }],
      workingDirectory: ".",
      environmentProfile: "offline-minimal",
      timeoutMs: 5000,
      gracefulCancellationMs: 100,
      maxStdoutBytes: 16384,
      maxStderrBytes: 16384,
      maxCombinedOutputBytes: 32768,
      expectedExitCodes: [0],
      networkPolicy: "offline-strict",
      cleanupPolicy: "delete-workspace",
      correlation: { operatorRequestId: input.operatorRequest.requestId, candidateDigest: bundle.versionDigest, testId: "deterministic-replay" }
    };
    const replayExecution = await executionAuthority.execute(replayExecRequest, createExecutionAuthorization({ request: replayExecRequest, requiredGateRefs: ["m16-a1-candidate-test-gate"], completedGateRefs: ["m16-a1-candidate-test-gate"] }));
    const replayOutput = replayExecution.outputs.find((candidate) => candidate.id === "result");
    const replayActual = replayOutput?.evidenceReference ? fs.readFileSync(path.join(replayExecution.evidenceRoot, replayOutput.evidenceReference), "utf8") : null;
    const deterministicReplay = replayExecution.status === "SUCCEEDED_PROCESS" && replayActual === replayA?.actual;

    const activeAfter = this.store.recoveryGet("SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?", [requirement.capabilityId]);
    const certifiedAfter = this.store.recoveryAll("SELECT version_digest FROM capability_versions WHERE capability_id = ? AND lifecycle_status = 'CERTIFIED'", [requirement.capabilityId]);
    const promotedAfter = this.store.recoveryAll("SELECT version_digest FROM capability_versions WHERE capability_id = ? AND lifecycle_status = 'PROMOTED'", [requirement.capabilityId]);
    const certification = this.store.recoveryGet("SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?", [requirement.capabilityId, bundle.versionDigest]);
    const promotion = this.store.recoveryGet("SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?", [requirement.capabilityId, bundle.versionDigest]);
    const candidateRow = this.store.recoveryGet("SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?", [requirement.capabilityId, bundle.versionDigest]);
    const executableMaterializedArgs = executable.materializeArgs(
      {
        executableId: M16_A1_EXECUTABLE_ID,
        args: [...bundle.manifest.approvedExecutionRecipe.args]
      } as any,
      path.join(evidenceRoot, ".executable-identity")
    );
    const executableArtifactPath = executableMaterializedArgs[0];
    if (!executableArtifactPath || !fs.existsSync(executableArtifactPath)) {
      throw new Error("M16-A1 bundled executable artifact is unavailable for identity verification.");
    }
    const executableArtifactSha256 = fileSha256(executableArtifactPath);

    const candidateTestsPass = testResults.every((item) => item.passed) && deterministicReplay;
    if (!candidateTestsPass) {
      throw new Error("M16-A1 candidate-local deterministic tests did not pass.");
    }
    if (candidateRow?.lifecycle_status !== "CANDIDATE" || certification || promotion || (activeAfter?.active_version_digest ?? null) !== (activeBefore?.active_version_digest ?? null)) {
      throw new Error("M16-A1 candidate-only state invariant failed.");
    }

    const testReportPath = writeJson(path.join(evidenceRoot, "candidate-test-report.json"), {
      schemaVersion: "sera.m16-a1-candidate-test-report.v1",
      candidateDigest: bundle.versionDigest,
      executable: { id: executable.id, fingerprint: executable.fingerprint, artifactSha256: executableArtifactSha256, offlineCompatible: executable.offlineCompatible, networkCapable: executable.networkCapable, args: bundle.manifest.approvedExecutionRecipe.args },
      tests: testResults,
      deterministicReplay,
      candidateTestsPass
    });
    const stateReportPath = writeJson(path.join(evidenceRoot, "candidate-state-report.json"), {
      before: { activeVersion: activeBefore?.active_version_digest ?? null, certifiedVersions: certifiedBefore.map((row: any) => row.version_digest), promotedVersions: promotedBefore.map((row: any) => row.version_digest) },
      after: { activeVersion: activeAfter?.active_version_digest ?? null, certifiedVersions: certifiedAfter.map((row: any) => row.version_digest), promotedVersions: promotedAfter.map((row: any) => row.version_digest), candidateVersion: bundle.versionDigest, lifecycleStatus: candidateRow?.lifecycle_status ?? null },
      certificationExists: Boolean(certification),
      promotionExists: Boolean(promotion),
      activePointerChanged: (activeAfter?.active_version_digest ?? null) !== (activeBefore?.active_version_digest ?? null),
      selectableForOrdinaryExecution: false
    });
    const testReportHash = fileSha256(testReportPath);
    const stateReportHash = fileSha256(stateReportPath);
    const acquisitionEvidencePath = writeJson(path.join(evidenceRoot, "m16-a1-acquisition-proof.json"), {
      schemaVersion: "sera.m16-a1-governed-capability-acquisition.v1",
      operatorRequest: input.operatorRequest,
      attemptId: input.attemptId,
      registry: { path: snapshot.registryRelativePath, sha256: snapshot.sha256, schemaVersion: snapshot.schemaVersion },
      acquisitionProfile: { profileId: M16_A1_PROFILE_ID, profileHash },
      requirement,
      gap: { status: gap.gapStatus, determinationHash: gap.determinationHash, considered: gap.considered },
      proposal: { proposalId: proposal.proposalId, sessionId: proposal.sessionId, capabilityId: proposal.capabilityId, candidateRequestHash: proposal.candidateRequestHash },
      candidate: { versionDigest: bundle.versionDigest, candidateRoot: bundle.candidateRoot, lifecycleStatus: bundle.manifest.lifecycleStatus, bytes: bundle.bytes },
      executable: { id: executable.id, fingerprint: executable.fingerprint, artifactSha256: executableArtifactSha256, offlineCompatible: executable.offlineCompatible, networkCapable: executable.networkCapable },
      validation: { candidateTestsPass, deterministicReplay, testReportPath, testReportHash, stateReportPath, stateReportHash },
      permissions: requirement.permissions,
      limitations: requirement.limitations,
      offline: true,
      publicNetworkUse: false,
      cloudProviderUse: false,
      modelUse: false,
      externalPackageAcquisition: false,
      repositoryMutation: false,
      candidateOnly: true,
      certified: false,
      promoted: false,
      activePointerChanged: false,
      attemptTerminalStateChanged: false
    });
    const acquisitionEvidenceHash = fileSha256(acquisitionEvidencePath);
    const acquisitionEvidenceReferenceId = this.controlPlane.recordEvidenceReference({
      attemptId: input.attemptId,
      evidenceType: "m16-a1-tested-inactive-candidate",
      location: path.relative(this.projectRoot, acquisitionEvidencePath).replace(/\\/g, "/"),
      integrityHash: acquisitionEvidenceHash,
      producer: "governed-capability-engine-composition",
      metadata: { requestHash: input.operatorRequest.requestHash, registrySha256: snapshot.sha256, candidateDigest: bundle.versionDigest, executableId: executable.id, candidateTestsPass, candidateOnly: true }
    });

    return {
      gap,
      registry: snapshot,
      proposal,
      bundle,
      executable: { id: executable.id, fingerprint: executable.fingerprint },
      candidateTestsPass,
      deterministicReplay,
      testResults,
      candidateCreated: true as const,
      candidateOnly: true as const,
      certified: false as const,
      promoted: false as const,
      activePointerChanged: false as const,
      selectableForOrdinaryExecution: false as const,
      evidencePath: acquisitionEvidencePath,
      evidenceHash: acquisitionEvidenceHash,
      evidenceReferenceIds: [registryEvidenceReferenceId, gapEvidenceReferenceId, acquisitionEvidenceReferenceId],
      offline: true as const,
      publicNetworkUse: false as const,
      cloudProviderUse: false as const,
      modelUse: false as const,
      externalPackageAcquisition: false as const,
      repositoryMutation: false as const,
      attemptTerminalStateChanged: false as const
    };
  }

  async evaluateBoundedCandidate(input: {
    attemptId: string;
    operatorRequestId: string;
    sourceProposalId: string;
    sourceSessionId: string;
    capabilityId: string;
    candidateDigest: string;
  }) {
    this.requireRunningAttempt(input.attemptId);

    const proposal = this.store.recoveryGet(
      "SELECT proposal_id, session_id, capability_id, request_hash FROM capability_proposals WHERE proposal_id = ? AND session_id = ? AND capability_id = ?",
      [
        input.sourceProposalId,
        input.sourceSessionId,
        input.capabilityId
      ]
    );

    if (
      !proposal ||
      String(proposal.proposal_id) !== input.sourceProposalId ||
      String(proposal.session_id) !== input.sourceSessionId ||
      String(proposal.capability_id) !== input.capabilityId
    ) {
      throw new Error(
        "M16-A2 evaluation requires exact durable A1 proposal/session provenance."
      );
    }

    const version = this.store.recoveryGet(
      "SELECT * FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
      [
        input.capabilityId,
        input.candidateDigest
      ]
    );

    if (!version) {
      throw new Error(
        "M16-A2 candidate digest does not exist."
      );
    }

    if (
      String(version.lifecycle_status) !== "CANDIDATE"
    ) {
      throw new Error(
        "M16-A2 evaluation requires an exact inactive CANDIDATE digest."
      );
    }

    const manifest =
      JSON.parse(String(version.manifest_json));

    if (
      manifest.capabilityId !== input.capabilityId ||
      manifest.versionDigest !== input.candidateDigest ||
      manifest.approvedExecutionRecipe?.executableId !== M16_A1_EXECUTABLE_ID ||
      manifest.networkPolicy !== "offline-strict" ||
      manifest.sideEffects !== "none" ||
      manifest.modelUsePolicy !== "none"
    ) {
      throw new Error(
        "M16-A2 candidate manifest does not match the bounded evaluation contract."
      );
    }

    const certificationBefore =
      this.store.recoveryGet(
        "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const promotionBefore =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const activeBefore =
      this.store.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
        [input.capabilityId]
      );

    if (certificationBefore || promotionBefore) {
      throw new Error(
        "M16-A2 requires an uncertified and unpromoted candidate."
      );
    }

    const executable =
      createDefaultExecutableRegistry().get(
        M16_A1_EXECUTABLE_ID
      );

    if (
      !executable.offlineCompatible ||
      executable.networkCapable
    ) {
      throw new Error(
        "M16-A2 candidate executable is not offline-safe."
      );
    }

    executable.validateArgs(
      manifest.approvedExecutionRecipe.args
    );

    const executionAuthority =
      this.controlPlane.requireExecutionAuthority();

    const evaluationEngine =
      new EvaluationEngine(
        this.store,
        {
          projectRoot: this.projectRoot
        }
      );

    const evaluationInput =
      "beta\nalpha\nbeta\n";

    const expectedOutput =
      "alpha\nbeta";

    const expectedOutputHash =
      crypto
        .createHash("sha256")
        .update(expectedOutput)
        .digest("hex");

    const runs: Array<Record<string, any>> = [];

    for (const runId of ["a", "b"] as const) {

      const executionId =
        randomId(`m16_a2_exec_${runId}`);

      const request: ExecutionRequest = {
        executionId,
        attemptId: input.attemptId,
        authorizationId:
          randomId("m16_a2_exec_auth"),
        executableId:
          M16_A1_EXECUTABLE_ID,
        args: [
          ...manifest.approvedExecutionRecipe.args
        ],
        inputs: [
          {
            id: "source",
            sourceType: "inline-text",
            workspacePath:
              "input/source.txt",
            content: evaluationInput
          }
        ],
        outputs: [
          {
            id: "result",
            workspacePath:
              "out/result.txt",
            required: true
          }
        ],
        workingDirectory: ".",
        environmentProfile:
          "offline-minimal",
        timeoutMs: 5000,
        gracefulCancellationMs: 100,
        maxStdoutBytes: 16384,
        maxStderrBytes: 16384,
        maxCombinedOutputBytes: 32768,
        expectedExitCodes: [0],
        networkPolicy: "offline-strict",
        cleanupPolicy: "delete-workspace",
        correlation: {
          operatorRequestId:
            input.operatorRequestId,
          sourceProposalId:
            input.sourceProposalId,
          sourceSessionId:
            input.sourceSessionId,
          capabilityId:
            input.capabilityId,
          candidateDigest:
            input.candidateDigest,
          m16Checkpoint: "M16-A2",
          runId
        }
      };

      const executionAuthorization =
        createExecutionAuthorization({
          request,
          requiredGateRefs: [
            "m16-a2-evaluation-authority"
          ],
          completedGateRefs: [
            "m16-a2-evaluation-authority"
          ]
        });

      const execution =
        await executionAuthority.execute(
          request,
          executionAuthorization
        );

      const output =
        execution.outputs.find(
          (candidate) =>
            candidate.id === "result"
        );

      const actualOutput =
        output?.evidenceReference
          ? fs.readFileSync(
              path.join(
                execution.evidenceRoot,
                output.evidenceReference
              ),
              "utf8"
            )
          : null;

      const specification =
        withSpecificationHash({
          specificationId:
            randomId(
              `m16_a2_spec_${runId}`
            ),
          specificationVersion:
            "evaluation-spec-v1",
          attemptId:
            input.attemptId,
          executionId,
          profileId:
            "deterministic-default",
          profileVersion:
            EVALUATION_PROFILE_VERSION,
          policyVersion:
            EVALUATION_POLICY_VERSION,

          requiredAssertions: [
            {
              assertionId:
                `m16-a2-${runId}-state`,
              evaluatorId:
                "execution_state_equals",
              evaluatorVersion: "v1",
              kind: "required",
              input: {},
              expected: "CLEANED",
              message:
                "Candidate execution must reach CLEANED state."
            },
            {
              assertionId:
                `m16-a2-${runId}-exit`,
              evaluatorId:
                "process_exit_code_in",
              evaluatorVersion: "v1",
              kind: "required",
              input: {},
              expected: [0],
              message:
                "Candidate execution must exit successfully."
            },
            {
              assertionId:
                `m16-a2-${runId}-output-exists`,
              evaluatorId:
                "output_exists",
              evaluatorVersion: "v1",
              kind: "required",
              input: {
                outputId: "result"
              },
              expected: "harvested",
              message:
                "Candidate must produce the declared result output."
            },
            {
              assertionId:
                `m16-a2-${runId}-output-hash`,
              evaluatorId:
                "output_hash_equals",
              evaluatorVersion: "v1",
              kind: "required",
              input: {
                outputId: "result"
              },
              expected:
                expectedOutputHash,
              message:
                "Candidate output must match the exact expected SHA-256."
            },
            {
              assertionId:
                `m16-a2-${runId}-source`,
              evaluatorId:
                "source_unchanged",
              evaluatorVersion: "v1",
              kind: "required",
              input: {},
              expected: true,
              message:
                "Candidate evaluation must not mutate source material."
            }
          ],

          optionalAssertions: [
            {
              assertionId:
                `m16-a2-${runId}-stderr`,
              evaluatorId:
                "stderr_empty",
              evaluatorVersion: "v1",
              kind: "optional",
              input: {},
              expected: "",
              message:
                "Candidate evaluation should emit no stderr."
            }
          ],

          evidenceReferences: [],

          aggregationPolicy: {
            emptyRequiredAllowed: false,
            optionalFailureOutcome:
              "warning"
          },

          createdAt:
            new Date().toISOString(),

          approvalReference:
            "control-plane:m16-a2-evaluation",

          correlation: {
            operatorRequestId:
              input.operatorRequestId,
            sourceProposalId:
              input.sourceProposalId,
            sourceSessionId:
              input.sourceSessionId,
            capabilityId:
              input.capabilityId,
            candidateDigest:
              input.candidateDigest,
            runId
          }
        });

      const evaluation =
        evaluationEngine.evaluate(
          specification,
          `m16-a2-evaluation:${input.candidateDigest}:${runId}`
        );

      if (
        execution.status !==
          "SUCCEEDED_PROCESS" ||
        evaluation.ok !== true ||
        actualOutput !== expectedOutput
      ) {
        throw new Error(
          "M16-A2 governed candidate evaluation did not satisfy the deterministic contract."
        );
      }

      runs.push({
        runId,
        executionId,
        executionStatus:
          execution.status,
        workspaceRoot:
          execution.workspaceRoot,

        evaluationId:
          evaluation.evaluationId,
        evaluationStatus:
          evaluation.status,

        expectedOutput,
        actualOutput,

        expectedOutputHash,
        actualOutputHash:
          output?.hash ?? null,

        sourceNotMutated:
          execution.sourceNotMutated,

        workspaceOutsideRepository:
          execution.workspaceOutsideRepository,

        cleanupCleaned:
          execution.cleanup.cleaned,

        undeclaredOutputCount:
          execution.undeclaredOutputs.length
      });
    }

    const reproducible =
      runs.length === 2 &&
      runs[0].executionId !==
        runs[1].executionId &&
      runs[0].evaluationId !==
        runs[1].evaluationId &&
      runs[0].workspaceRoot !==
        runs[1].workspaceRoot &&
      runs[0].actualOutput ===
        runs[1].actualOutput &&
      runs[0].actualOutputHash ===
        runs[1].actualOutputHash &&
      runs.every(
        (run) =>
          run.evaluationStatus ===
            "PASSED" ||
          run.evaluationStatus ===
            "PASSED_WITH_WARNINGS"
      );

    if (!reproducible) {
      throw new Error(
        "M16-A2 independent reproducibility requirement failed."
      );
    }

    const comparisonHash =
      hashBoundedValue({
        capabilityId:
          input.capabilityId,

        candidateDigest:
          input.candidateDigest,

        expectedOutputHash,

        runs: runs.map((run) => ({
          evaluationStatus:
            run.evaluationStatus,
          actualOutputHash:
            run.actualOutputHash,
          sourceNotMutated:
            run.sourceNotMutated,
          workspaceOutsideRepository:
            run.workspaceOutsideRepository,
          cleanupCleaned:
            run.cleanupCleaned,
          undeclaredOutputCount:
            run.undeclaredOutputCount
        }))
      });

    const candidateAfter =
      this.store.recoveryGet(
        "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const certificationAfter =
      this.store.recoveryGet(
        "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const promotionAfter =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const activeAfter =
      this.store.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
        [input.capabilityId]
      );

    const activePointerChanged =
      (activeBefore?.active_version_digest ??
        null) !==
      (activeAfter?.active_version_digest ??
        null);

    const candidateLifecycleStatus =
      String(
        candidateAfter?.lifecycle_status ??
          ""
      );

    if (
      candidateLifecycleStatus !== "CANDIDATE" ||
      certificationAfter ||
      promotionAfter ||
      activePointerChanged
    ) {
      throw new Error(
        "M16-A2 pre-review candidate-state invariant failed."
      );
    }

    const permissions = [
      "read isolated input",
      "write declared isolated output",
      "emit immutable evaluation evidence"
    ];

    const limitations = [
      "bounded deterministic text transform only",
      "stable unique line sort only",
      "no shell",
      "no public network",
      "no external package acquisition",
      "no model or provider dependency",
      "candidate remains unusable for ordinary execution until explicit later promotion"
    ];

    const evidenceRoot =
      path.join(
        this.projectRoot,
        ".sera",
        "capability-engine-composition",
        input.attemptId
      );

    const reviewPacketPath =
      writeJson(
        path.join(
          evidenceRoot,
          "m16-a2-evaluation-review-packet.json"
        ),
        {
          schemaVersion:
            "sera.m16-a2-evaluation-review-packet.v1",

          attemptId:
            input.attemptId,

          operatorRequestId:
            input.operatorRequestId,

          sourceProvenance: {
            proposalId:
              input.sourceProposalId,
            sessionId:
              input.sourceSessionId
          },

          candidate: {
            capabilityId:
              input.capabilityId,
            versionDigest:
              input.candidateDigest,
            lifecycleStatus:
              candidateLifecycleStatus,
            riskClass:
              version.risk_class,
            bundleRoot:
              version.bundle_root,
            bundleHash:
              version.bundle_hash
          },

          evaluationProfile: {
            profileId:
              "deterministic-default",
            profileVersion:
              EVALUATION_PROFILE_VERSION,
            policyVersion:
              EVALUATION_POLICY_VERSION
          },

          expectedBehavior: {
            input:
              evaluationInput,
            output:
              expectedOutput,
            outputSha256:
              expectedOutputHash
          },

          runs,

          reproducibility: {
            requiredRuns: 2,
            completedRuns:
              runs.length,
            reproducible,
            comparisonHash
          },

          permissions,
          limitations,

          operatorReviewRequired: true,
          operatorDecision: null,

          certificationPerformed: false,
          promotionPerformed: false,

          activePointerChanged,

          selectableForOrdinaryExecution:
            false,

          offline: true,
          publicNetworkUse: false,
          cloudProviderUse: false,
          modelUse: false,
          externalPackageAcquisition:
            false
        }
      );

    const reviewPacketHash =
      fileSha256(reviewPacketPath);

    const evidenceReferenceId =
      this.controlPlane.recordEvidenceReference({
        attemptId:
          input.attemptId,

        evidenceType:
          "m16-a2-candidate-evaluation-review-packet",

        location:
          path
            .relative(
              this.projectRoot,
              reviewPacketPath
            )
            .replace(/\\/g, "/"),

        integrityHash:
          reviewPacketHash,

        producer:
          "governed-capability-engine-composition",

        metadata: {
          capabilityId:
            input.capabilityId,
          candidateDigest:
            input.candidateDigest,
          proposalId:
            input.sourceProposalId,
          sessionId:
            input.sourceSessionId,
          reproducible,
          comparisonHash,
          evaluationRuns: 2,
          certificationPerformed:
            false,
          promotionPerformed: false,
          activePointerChanged
        }
      });

    return {
      capabilityId:
        input.capabilityId,

      candidateDigest:
        input.candidateDigest,

      sourceProposalId:
        input.sourceProposalId,

      sourceSessionId:
        input.sourceSessionId,

      experimentIds:
        runs.map(
          (run) => run.executionId
        ),

      evaluationIds:
        runs.map(
          (run) => run.evaluationId
        ),

      runs,

      comparisonHash,

      reproducibilityRuns: 2,

      reproducible,

      rollbackReady:
        manifest.rollbackCompatibility
          ?.reversible === true,

      permissions,
      limitations,

      riskClass:
        String(version.risk_class),

      reviewPacketPath,
      reviewPacketHash,
      evidenceReferenceId,

      lifecycleStatus:
        candidateLifecycleStatus,

      certificationPerformed:
        false as const,

      promotionPerformed:
        false as const,

      activePointerChanged:
        false as const,

      selectableForOrdinaryExecution:
        false as const,

      offline: true as const,
      publicNetworkUse:
        false as const,
      cloudProviderUse:
        false as const,
      modelUse:
        false as const
    };
  }
  async finalizeBoundedCandidateReview(input: {
    attemptId: string;
    approvalId: string;
    operatorRequestId: string;
    capabilityId: string;
    candidateDigest: string;
    sourceProposalId: string;
    sourceSessionId: string;
    reviewPacketPath: string;
    reviewPacketHash: string;
  }) {
    this.requireRunningAttempt(input.attemptId);

    const approval = this.store.recoveryGet(
      "SELECT * FROM operator_approvals WHERE approval_id = ?",
      [input.approvalId]
    );

    if (!approval) {
      throw new Error("M16-A2 operator approval does not exist.");
    }

    if (
      String(approval.request_id) !== input.operatorRequestId ||
      String(approval.risk_class) !== "HIGH"
    ) {
      throw new Error(
        "M16-A2 operator approval is not bound to the expected governed review request."
      );
    }

    const expectedSummary =
      createM16A2CertificationReviewSummary({
        candidateDigest: input.candidateDigest,
        reviewPacketHash: input.reviewPacketHash
      });

    if (String(approval.summary) !== expectedSummary) {
      throw new Error(
        "M16-A2 operator approval is not bound to the exact candidate digest and review packet."
      );
    }

    const decision = this.store.recoveryGet(
      "SELECT decision, decided_at FROM operator_approval_decisions WHERE approval_id = ? ORDER BY decided_at DESC LIMIT 1",
      [input.approvalId]
    );

    if (
      !decision ||
      !["APPROVED", "REJECTED"].includes(
        String(decision.decision)
      ) ||
      String(approval.status) !==
        String(decision.decision)
    ) {
      throw new Error(
        "M16-A2 requires a durable APPROVED or REJECTED operator decision."
      );
    }

    const reviewPacketPath =
      path.resolve(input.reviewPacketPath);

    const allowedReviewRoot =
      path.resolve(
        this.projectRoot,
        ".sera",
        "capability-engine-composition"
      );

    const relativeReviewPath =
      path.relative(
        allowedReviewRoot,
        reviewPacketPath
      );

    if (
      relativeReviewPath.startsWith("..") ||
      path.isAbsolute(relativeReviewPath)
    ) {
      throw new Error(
        "M16-A2 review packet escapes the governed evidence root."
      );
    }

    if (
      !fs.existsSync(reviewPacketPath) ||
      !fs.statSync(reviewPacketPath).isFile()
    ) {
      throw new Error(
        "M16-A2 review packet is unavailable."
      );
    }

    const actualReviewPacketHash =
      fileSha256(reviewPacketPath);

    if (
      actualReviewPacketHash !==
      input.reviewPacketHash
    ) {
      throw new Error(
        "M16-A2 review packet hash does not match the operator-approved evidence."
      );
    }

    const reviewPacket =
      JSON.parse(
        fs.readFileSync(
          reviewPacketPath,
          "utf8"
        )
      );

    if (
      reviewPacket.schemaVersion !==
        "sera.m16-a2-evaluation-review-packet.v1" ||
      reviewPacket.candidate?.capabilityId !==
        input.capabilityId ||
      reviewPacket.candidate?.versionDigest !==
        input.candidateDigest ||
      reviewPacket.sourceProvenance?.proposalId !==
        input.sourceProposalId ||
      reviewPacket.sourceProvenance?.sessionId !==
        input.sourceSessionId ||
      reviewPacket.reproducibility?.reproducible !==
        true ||
      reviewPacket.reproducibility?.completedRuns !==
        2 ||
      reviewPacket.operatorReviewRequired !==
        true ||
      reviewPacket.certificationPerformed !==
        false ||
      reviewPacket.promotionPerformed !==
        false
    ) {
      throw new Error(
        "M16-A2 review packet is incomplete, mismatched, or ineligible for operator decision."
      );
    }

    const version =
      this.store.recoveryGet(
        "SELECT * FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    if (
      !version ||
      String(version.lifecycle_status) !==
        "CANDIDATE" ||
      Number(version.terminal) !== 0
    ) {
      throw new Error(
        "M16-A2 finalization requires the exact nonterminal CANDIDATE digest."
      );
    }

    const candidateRoot =
      path.resolve(String(version.bundle_root));

    const manifestPath =
      path.join(
        candidateRoot,
        "capability-manifest.json"
      );

    const integrityManifestPath =
      path.join(
        candidateRoot,
        "integrity-manifest.json"
      );

    if (
      !fs.existsSync(manifestPath) ||
      !fs.existsSync(integrityManifestPath)
    ) {
      throw new Error(
        "M16-A2 durable candidate bundle is incomplete."
      );
    }

    const manifest =
      JSON.parse(
        fs.readFileSync(
          manifestPath,
          "utf8"
        )
      );

    const durableManifest =
      JSON.parse(
        String(version.manifest_json)
      );

    if (
      digest(manifest) !==
        digest(durableManifest) ||
      manifest.capabilityId !==
        input.capabilityId ||
      manifest.versionDigest !==
        input.candidateDigest
    ) {
      throw new Error(
        "M16-A2 candidate manifest does not match durable Runtime State."
      );
    }

    const integrityManifest =
      JSON.parse(
        fs.readFileSync(
          integrityManifestPath,
          "utf8"
        )
      ) as Record<string, string>;

    const finalIntegrity =
      hashDirectoryTree(candidateRoot);

    if (
      digest(finalIntegrity) !==
        String(version.bundle_hash) ||
      directoryBytes(candidateRoot) !==
        Number(version.candidate_bytes)
    ) {
      throw new Error(
        "M16-A2 candidate bundle integrity does not match the durable version record."
      );
    }

    const bundle: CandidateBundle = {
      capabilityId:
        input.capabilityId,
      version:
        String(version.version),
      versionDigest:
        input.candidateDigest,
      candidateRoot,
      manifest,
      integrityManifest,
      bytes:
        Number(version.candidate_bytes)
    };

    const activeBefore =
      this.store.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
        [input.capabilityId]
      );

    const promotionBefore =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    if (promotionBefore) {
      throw new Error(
        "M16-A2 candidate was already promoted."
      );
    }

    const engine =
      new CapabilityEngine(
        this.store,
        {
          projectRoot:
            this.projectRoot
        }
      );

    const decisionValue =
      String(decision.decision) as
        | "APPROVED"
        | "REJECTED";

    let certification:
      | Record<string, unknown>
      | null = null;

    if (decisionValue === "APPROVED") {
      const runs =
        Array.isArray(reviewPacket.runs)
          ? reviewPacket.runs
          : [];

      const experimentIds =
        runs.map(
          (run: any) =>
            String(run.executionId)
        );

      const evaluationIds =
        runs.map(
          (run: any) =>
            String(run.evaluationId)
        );

      if (
        new Set(experimentIds).size !== 2 ||
        new Set(evaluationIds).size !== 2
      ) {
        throw new Error(
          "M16-A2 certification requires two independent execution and evaluation records."
        );
      }

      for (
        let index = 0;
        index < 2;
        index += 1
      ) {
        const evaluation =
          this.store.recoveryGet(
            "SELECT state, aggregate_outcome, execution_id FROM evaluations WHERE evaluation_id = ?",
            [evaluationIds[index]]
          );

        if (
          !evaluation ||
          ![
            "PASSED",
            "PASSED_WITH_WARNINGS"
          ].includes(
            String(
              evaluation.aggregate_outcome
            )
          ) ||
          String(
            evaluation.execution_id
          ) !== experimentIds[index]
        ) {
          throw new Error(
            "M16-A2 certification evidence does not match durable passing evaluations."
          );
        }
      }

      certification =
        engine.certifyCandidate(
          input.sourceSessionId,
          bundle,
          {
            experimentIds,
            evaluationIds,
            comparisonHash:
              String(
                reviewPacket
                  .reproducibility
                  .comparisonHash
              ),
            reproducibilityRuns: 2,
            rollbackReady:
              manifest
                .rollbackCompatibility
                ?.reversible === true
          }
        );
    } else {
      engine.transitionVersion(
        input.capabilityId,
        input.candidateDigest,
        "REJECTED"
      );
    }

    const versionAfter =
      this.store.recoveryGet(
        "SELECT lifecycle_status, terminal FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const certificationAfter =
      this.store.recoveryGet(
        "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const promotionAfter =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const activeAfter =
      this.store.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
        [input.capabilityId]
      );

    const activePointerChanged =
      (
        activeBefore?.active_version_digest ??
        null
      ) !==
      (
        activeAfter?.active_version_digest ??
        null
      );

    const expectedLifecycle =
      decisionValue === "APPROVED"
        ? "CERTIFIED"
        : "REJECTED";

    if (
      String(
        versionAfter?.lifecycle_status ??
          ""
      ) !== expectedLifecycle ||
      Number(
        versionAfter?.terminal ?? 0
      ) !== 1 ||
      Boolean(certificationAfter) !==
        (decisionValue ===
          "APPROVED") ||
      promotionAfter ||
      activePointerChanged
    ) {
      throw new Error(
        "M16-A2 post-decision certification/rejection invariant failed."
      );
    }

    const evidenceRoot =
      path.join(
        this.projectRoot,
        ".sera",
        "capability-engine-composition",
        input.attemptId
      );

    const decisionEvidencePath =
      writeJson(
        path.join(
          evidenceRoot,
          "m16-a2-certification-decision.json"
        ),
        {
          schemaVersion:
            "sera.m16-a2-certification-decision.v1",
          attemptId:
            input.attemptId,
          operatorRequestId:
            input.operatorRequestId,
          approvalId:
            input.approvalId,
          operatorDecision:
            decisionValue,
          reviewPacket: {
            path:
              reviewPacketPath,
            sha256:
              actualReviewPacketHash
          },
          sourceProvenance: {
            proposalId:
              input.sourceProposalId,
            sessionId:
              input.sourceSessionId
          },
          candidate: {
            capabilityId:
              input.capabilityId,
            versionDigest:
              input.candidateDigest,
            finalLifecycleStatus:
              expectedLifecycle
          },
          certification,
          certificationExists:
            Boolean(
              certificationAfter
            ),
          promotionExists: false,
          activePointerChanged: false,
          selectableForOrdinaryExecution:
            false,
          offline: true,
          publicNetworkUse: false,
          cloudProviderUse: false,
          modelUse: false
        }
      );

    const decisionEvidenceHash =
      fileSha256(
        decisionEvidencePath
      );

    const evidenceReferenceId =
      this.controlPlane
        .recordEvidenceReference({
          attemptId:
            input.attemptId,
          evidenceType:
            "m16-a2-operator-certification-decision",
          location:
            path
              .relative(
                this.projectRoot,
                decisionEvidencePath
              )
              .replace(/\\/g, "/"),
          integrityHash:
            decisionEvidenceHash,
          producer:
            "governed-capability-engine-composition",
          metadata: {
            approvalId:
              input.approvalId,
            operatorDecision:
              decisionValue,
            capabilityId:
              input.capabilityId,
            candidateDigest:
              input.candidateDigest,
            reviewPacketHash:
              input.reviewPacketHash,
            lifecycleStatus:
              expectedLifecycle,
            certificationExists:
              Boolean(
                certificationAfter
              ),
            promotionExists: false,
            activePointerChanged:
              false
          }
        });

    return {
      approvalId:
        input.approvalId,
      operatorDecision:
        decisionValue,
      capabilityId:
        input.capabilityId,
      candidateDigest:
        input.candidateDigest,
      lifecycleStatus:
        expectedLifecycle,
      certified:
        decisionValue ===
          "APPROVED",
      rejected:
        decisionValue ===
          "REJECTED",
      promoted:
        false as const,
      activePointerChanged:
        false as const,
      selectableForOrdinaryExecution:
        false as const,
      reviewPacketHash:
        input.reviewPacketHash,
      decisionEvidencePath,
      decisionEvidenceHash,
      evidenceReferenceId,
      offline: true as const,
      publicNetworkUse:
        false as const,
      cloudProviderUse:
        false as const,
      modelUse:
        false as const
    };
  }
  assembleRealResource(input: {
    attemptId: string;
    sourcePath: string;
    authorization: GovernedCapabilityEngineAuthorization;
  }) {
    const sourcePath = path.resolve(input.sourcePath);
    const { integrityHash, ...unsigned } = input.authorization;
    if (
      digest(unsigned) !== integrityHash ||
      input.authorization.attemptId !== input.attemptId ||
      input.authorization.capabilityId !== "capability-engine" ||
      input.authorization.sourcePath !== sourcePath ||
      Date.parse(input.authorization.expiresAt) <= Date.now()
    ) {
      throw new Error("Governed Capability Engine authorization is missing, expired, mismatched, or tampered.");
    }
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error("Governed Capability Engine requires a real file resource.");
    }
    const actualSourceSha256 = fileSha256(sourcePath);
    if (actualSourceSha256 !== input.authorization.sourceSha256) {
      throw new Error("Governed Capability Engine source resource hash does not match authorization.");
    }
    this.requireRunningAttempt(input.attemptId);

    const engine = new CapabilityEngine(this.store, { projectRoot: this.projectRoot });
    const proposal = engine.createProposal(
      input.authorization.proposal,
      input.authorization.proposalAuthorization,
      `m5-09-proposal:${input.attemptId}`
    );
    const bundle = engine.assembleCandidate(proposal, input.authorization.experimentAuthorization);
    const active = this.controlPlane.recoveryGet(
      "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?",
      [bundle.capabilityId]
    );
    const evidencePath = path.join(
      this.projectRoot,
      ".sera",
      "capability-engine-composition",
      input.attemptId,
      "candidate-bundle-proof.json"
    );
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify({
      schemaVersion: "sera.governed-capability-engine-composition.v1",
      attemptId: input.attemptId,
      source: { path: sourcePath, sha256: actualSourceSha256 },
      expectedResult: "CANDIDATE",
      actualResult: bundle.manifest.lifecycleStatus,
      candidate: {
        capabilityId: bundle.capabilityId,
        versionDigest: bundle.versionDigest,
        candidateRoot: bundle.candidateRoot,
        bytes: bundle.bytes,
        integrityManifest: bundle.integrityManifest
      },
      candidateOnly: true,
      activeVersionDigest: active?.active_version_digest ?? null,
      modelUse: false,
      publicNetworkUse: false,
      attemptTerminalStateChanged: false
    }, null, 2)}\n`, "utf8");
    const evidenceHash = fileSha256(evidencePath);
    const evidenceReferenceId = this.controlPlane.recordEvidenceReference({
      attemptId: input.attemptId,
      evidenceType: "capability-candidate-bundle",
      location: path.relative(this.projectRoot, evidencePath).replace(/\\/g, "/"),
      integrityHash: evidenceHash,
      producer: "governed-capability-engine-composition",
      metadata: {
        sourceSha256: actualSourceSha256,
        candidateDigest: bundle.versionDigest,
        candidateOnly: true,
        promoted: false
      }
    });
    return {
      proposal,
      bundle,
      sourceSha256: actualSourceSha256,
      evidencePath,
      evidenceHash,
      evidenceReferenceId,
      candidateOnly: true as const,
      promoted: false as const,
      attemptTerminalStateChanged: false as const,
      modelUse: false as const,
      publicNetworkUse: false as const
    };
  }
}
