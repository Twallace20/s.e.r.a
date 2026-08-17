import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  CAPABILITY_POLICY_VERSION,
  CapabilityEngine,
  createCapabilityAuthorization,
  type CapabilityAuthorization,
  type CapabilityProposal
} from "@sera/capability-engine";
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
