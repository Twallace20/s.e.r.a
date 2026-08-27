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

  private requireRunningAttempt(
    attemptId: string,
    expectedCapability = "capability-engine"
  ): void {
    const attempt = this.controlPlane.recoveryGet(
      "SELECT capability, current_state FROM attempts WHERE attempt_id = ?",
      [attemptId]
    );

    if (
      !attempt ||
      String(attempt.capability) !== expectedCapability ||
      String(attempt.current_state) !== "RUNNING"
    ) {
      throw new Error(
        `Governed Capability Engine requires an authoritative RUNNING ${expectedCapability} attempt.`
      );
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
    let gap = determineCapabilityGap(
      snapshot,
      requirement,
      activeByCapability
    );

    if (gap.gapStatus === "UNSATISFIED") {
      const runtimeActive =
        this.store.recoveryGet(
          `SELECT
             av.active_version_digest,
             av.authority_identity,
             v.lifecycle_status,
             v.manifest_json
           FROM capability_active_versions av
           JOIN capability_versions v
             ON v.capability_id = av.capability_id
            AND v.version_digest = av.active_version_digest
           WHERE av.capability_id = ?
             AND av.activation_scope = ?`,
          [requirement.capabilityId, "catalog"]
        );

      if (runtimeActive) {
        const runtimeManifest =
          JSON.parse(
            String(runtimeActive.manifest_json)
          );

        const recipe =
          runtimeManifest
            .approvedExecutionRecipe;


        const runtimeExecutableContractMatches =
          recipe?.executableId ===
            requirement.executableId ||
          (
            requirement.capabilityId ===
              "stable-unique-line-sort-v1" &&
            requirement.executableId ===
              M16_A1_EXECUTABLE_ID &&
            requirement.operation ===
              M16_A1_OPERATION &&
            recipe?.executableId ===
              "deterministic-text-transform-v2"
          );

        const runtimeExpectedArgs = [
          requirement.operation,
          "input/source.txt",
          "out/result.txt",
          String(
            M16_A1_MAX_INPUT_BYTES
          )
        ];

        const runtimeContractMatches =
          String(
            runtimeActive.lifecycle_status
          ) === "PROMOTED" &&
          String(
            runtimeActive.authority_identity
          ) === "control-plane" &&
          runtimeManifest.capabilityId ===
            requirement.capabilityId &&
          runtimeManifest.networkPolicy ===
            requirement.networkPolicy &&
          runtimeManifest.sideEffects ===
            requirement.sideEffectPolicy &&
          runtimeManifest.modelUsePolicy ===
            requirement.modelPolicy &&
          runtimeExecutableContractMatches &&
          recipe?.profileId ===
            "offline-minimal" &&
          recipe?.shell === false &&
          Array.isArray(recipe?.args) &&
          JSON.stringify(
            recipe.args
          ) ===
            JSON.stringify(
              runtimeExpectedArgs
            );

        if (!runtimeContractMatches) {
          throw new Error(
            "Active runtime capability exists but does not match the bounded requested contract."
          );
        }

        const dynamicComparison = {
          capabilityId:
            requirement.capabilityId,
          compositionState:
            "promoted-runtime",
          activeStatus:
            "ACTIVE" as const,
          certifiedContract: {
            capabilityId:
              requirement.capabilityId,
            lifecycleStatus:
              "PROMOTED",
            operation:
              requirement.operation,
            executableId:
              String(recipe.executableId),
            networkPolicy:
              requirement.networkPolicy,
            sideEffects:
              requirement.sideEffectPolicy,
            modelUsePolicy:
              requirement.modelPolicy,
            selfAuthorizationAllowed:
              false,
            activeVersion:
              String(
                runtimeActive
                  .active_version_digest
              ),
            authorityIdentity:
              "control-plane"
          },
          comparedFields: [
            "lifecycleStatus",
            "operation",
            "executableId",
            "networkPolicy",
            "sideEffects",
            "modelUsePolicy",
            "authorityIdentity"
          ],
          unsatisfiedFields: [],
          sufficient: true
        };

        const unsignedRuntimeGap = {
          schemaVersion:
            gap.schemaVersion,
          profileId:
            gap.profileId,
          profileVersion:
            gap.profileVersion,
          profileHash:
            gap.profileHash,
          requirement:
            gap.requirement,
          registrySchemaVersion:
            gap.registrySchemaVersion,
          registrySha256:
            gap.registrySha256,
          registryRelativePath:
            gap.registryRelativePath,
          considered: [
            ...gap.considered,
            dynamicComparison
          ],
          gapStatus:
            "SATISFIED" as const,
          satisfyingCapabilityId:
            requirement.capabilityId
        };

        gap = {
          ...unsignedRuntimeGap,
          determinationHash:
            hashBoundedValue(
              unsignedRuntimeGap
            )
        };
      }
    }
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

    const candidateExecutableId =
      String(
        manifest
          .approvedExecutionRecipe
          ?.executableId ??
        ""
      );

    const boundedEvaluationExecutableIds =
      new Set<string>([
        M16_A1_EXECUTABLE_ID,
        "deterministic-text-transform-v2"
      ]);
    if (
      manifest.capabilityId !== input.capabilityId ||
      manifest.versionDigest !== input.candidateDigest ||
      !boundedEvaluationExecutableIds.has(
        candidateExecutableId
      ) ||
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
        candidateExecutableId
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
          candidateExecutableId,
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
  async promoteBoundedCertifiedCandidate(input: {
    attemptId: string;
    operatorRequestId: string;
    sourceProposalId: string;
    sourceSessionId: string;
    capabilityId: string;
    candidateDigest: string;
  }) {
    this.requireRunningAttempt(
      input.attemptId
    );

    if (
      input.capabilityId !==
      "stable-unique-line-sort-v1"
    ) {
      throw new Error(
        "M16-A3 promotion is bounded to stable-unique-line-sort-v1."
      );
    }

    const proposal =
      this.store.recoveryGet(
        "SELECT proposal_id, session_id, capability_id, learning_lane, risk_class FROM capability_proposals WHERE proposal_id = ? AND session_id = ? AND capability_id = ?",
        [
          input.sourceProposalId,
          input.sourceSessionId,
          input.capabilityId
        ]
      );

    if (!proposal) {
      throw new Error(
        "M16 governed promotion requires exact proposal and session provenance."
      );
    }

    const proposalLearningLane =
      String(
        proposal.learning_lane ??
        ""
      );

    const proposalRiskClass =
      String(
        proposal.risk_class ??
        ""
      );

    if (
      ![
        "acquisition",
        "repair"
      ].includes(
        proposalLearningLane
      ) ||
      proposalRiskClass !==
        "low"
    ) {
      throw new Error(
        "M16 governed promotion requires an authorized acquisition or repair proposal with low bounded risk."
      );
    }

    const version =
      this.store.recoveryGet(
        "SELECT lifecycle_status, terminal, manifest_json, learning_lane, risk_class, baseline_version_digest FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    if (
      !version ||
      String(
        version.lifecycle_status
      ) !== "CERTIFIED" ||
      Number(version.terminal) !== 1
    ) {
      throw new Error(
        "M16-A3 promotion requires the exact certified candidate digest."
      );
    }

    if (
      String(
        version.learning_lane ??
        ""
      ) !== proposalLearningLane ||
      String(
        version.risk_class ??
        ""
      ) !== proposalRiskClass
    ) {
      throw new Error(
        "M16 governed promotion proposal provenance does not match the exact candidate version."
      );
    }

    const certification =
      this.store.recoveryGet(
        "SELECT certification_id, rollback_ready FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    if (
      !certification ||
      Number(
        certification.rollback_ready
      ) !== 1
    ) {
      throw new Error(
        "M16-A3 promotion requires durable certification and rollback-readiness evidence."
      );
    }

    const existingPromotion =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    if (existingPromotion) {
      const active =
        this.store.recoveryGet(
          "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
          [
            input.capabilityId,
            "catalog"
          ]
        );

      if (
        String(
          active?.active_version_digest ??
            ""
        ) !== input.candidateDigest ||
        String(
          active?.authority_identity ??
            ""
        ) !== "control-plane"
      ) {
        throw new Error(
          "M16-A3 existing promotion does not match the authoritative active pointer."
        );
      }

      return {
        capabilityId:
          input.capabilityId,
        candidateDigest:
          input.candidateDigest,
        lifecycleStatus:
          "PROMOTED" as const,
        promoted:
          true as const,
        activeVersionDigest:
          input.candidateDigest,
        activePointerChanged:
          false as const,
        idempotent:
          true as const,
        evidenceReferenceIds:
          [] as string[],
        offline:
          true as const,
        publicNetworkUse:
          false as const,
        cloudProviderUse:
          false as const,
        modelUse:
          false as const
      };
    }

    const manifest =
      JSON.parse(
        String(version.manifest_json)
      );

    const recipe =
      manifest
        .approvedExecutionRecipe;


    const candidateExecutableId =
      String(
        recipe?.executableId ??
        ""
      ) as
        | typeof M16_A1_EXECUTABLE_ID
        | "deterministic-text-transform-v2";

    const boundedPromotionExecutableIds =
      new Set<string>([
        M16_A1_EXECUTABLE_ID,
        "deterministic-text-transform-v2"
      ]);

    const expectedPromotionArgs = [
      M16_A1_OPERATION,
      "input/source.txt",
      "out/result.txt",
      String(
        M16_A1_MAX_INPUT_BYTES
      )
    ];
if (
      manifest.capabilityId !==
        input.capabilityId ||
      manifest.versionDigest !==
        input.candidateDigest ||
      manifest.networkPolicy !==
        "offline-strict" ||
      manifest.sideEffects !==
        "none" ||
      manifest.modelUsePolicy !==
        "none" ||
      !boundedPromotionExecutableIds.has(
        candidateExecutableId
      ) ||
      recipe?.profileId !==
        "offline-minimal" ||
      recipe?.shell !== false ||
      !Array.isArray(recipe?.args) ||
      JSON.stringify(
        recipe.args
      ) !==
        JSON.stringify(
          expectedPromotionArgs
        )
    ) {
      throw new Error(
        "M16-A3 certified candidate manifest does not match the bounded promotion contract."
      );
    }

    const activeBefore =
      this.store.recoveryGet(
        "SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
        [
          input.capabilityId,
          "catalog"
        ]
      );

    const activeBeforeDigest =
      activeBefore
        ?.active_version_digest
        ? String(
            activeBefore
              .active_version_digest
          )
        : undefined;

    const candidateBaselineDigest =
      version
        .baseline_version_digest
        ? String(
            version
              .baseline_version_digest
          )
        : undefined;

    if (
      proposalLearningLane ===
        "repair" &&
      (
        !activeBeforeDigest ||
        !candidateBaselineDigest ||
        candidateBaselineDigest !==
          activeBeforeDigest
      )
    ) {
      throw new Error(
        "M16-A4 repair promotion requires the candidate baseline digest to equal the exact currently active version."
      );
    }

    if (
      proposalLearningLane ===
        "acquisition" &&
      candidateBaselineDigest
    ) {
      throw new Error(
        "M16-A3 acquisition promotion cannot claim repair baseline provenance."
      );
    }

    const authorization =
      createCapabilityAuthorization({
        authorizationType:
          "promotion",
        attemptId:
          input.attemptId,
        sessionId:
          input.sourceSessionId,
        proposalId:
          input.sourceProposalId,
        capabilityId:
          input.capabilityId,
        candidateRequestHash:
          input.candidateDigest,
        learningLane:
          proposalLearningLane as
            "acquisition" |
            "repair",
        riskClass:
          proposalRiskClass as
            "low",
        approvedExecutableIds: [
          candidateExecutableId
        ],
        baselineVersionDigest:
          proposalLearningLane ===
            "repair"
            ? activeBeforeDigest
            : undefined
      });

    const engine =
      new CapabilityEngine(
        this.store,
        {
          projectRoot:
            this.projectRoot
        }
      );

    const promotion =
      engine.promote(
        input.sourceSessionId,
        input.capabilityId,
        input.candidateDigest,
        authorization,
        `m16-a3-promotion:${input.operatorRequestId}:${input.candidateDigest}`
      );

    const activeAfter =
      this.store.recoveryGet(
        "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
        [
          input.capabilityId,
          "catalog"
        ]
      );

    const versionAfter =
      this.store.recoveryGet(
        "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const promotionAfter =
      this.store.recoveryGet(
        "SELECT promotion_id, authorization_id, certification_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.candidateDigest
        ]
      );

    const activePointerChanged =
      String(
        activeBefore
          ?.active_version_digest ??
          ""
      ) !==
      String(
        activeAfter
          ?.active_version_digest ??
          ""
      );

    if (
      String(
        versionAfter
          ?.lifecycle_status ??
          ""
      ) !== "PROMOTED" ||
      String(
        activeAfter
          ?.active_version_digest ??
          ""
      ) !== input.candidateDigest ||
      String(
        activeAfter
          ?.authority_identity ??
          ""
      ) !== "control-plane" ||
      !promotionAfter
    ) {
      throw new Error(
        "M16-A3 post-promotion active-pointer invariant failed."
      );
    }

    const evidenceRoot =
      path.join(
        this.projectRoot,
        ".sera",
        "capability-engine-composition",
        input.attemptId
      );

    const evidencePath =
      writeJson(
        path.join(
          evidenceRoot,
          "m16-a3-promotion.json"
        ),
        {
          schemaVersion:
            "sera.m16-a3-promotion.v1",
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
          capabilityId:
            input.capabilityId,
          candidateDigest:
            input.candidateDigest,
          certificationId:
            String(
              certification
                .certification_id
            ),
          authorizationId:
            authorization
              .authorizationId,
          promotion,
          before: {
            activeVersionDigest:
              activeBefore
                ?.active_version_digest ??
              null
          },
          after: {
            lifecycleStatus:
              "PROMOTED",
            activeVersionDigest:
              input.candidateDigest,
            authorityIdentity:
              "control-plane"
          },
          activePointerChanged,
          promotionPerformed:
            true,
          rollbackPerformed:
            false,
          offline:
            true,
          publicNetworkUse:
            false,
          cloudProviderUse:
            false,
          modelUse:
            false
        }
      );

    const evidenceHash =
      fileSha256(evidencePath);

    const evidenceReferenceId =
      this.controlPlane
        .recordEvidenceReference({
          attemptId:
            input.attemptId,
          evidenceType:
            "m16-a3-explicit-promotion",
          location:
            path
              .relative(
                this.projectRoot,
                evidencePath
              )
              .replace(/\\/g, "/"),
          integrityHash:
            evidenceHash,
          producer:
            "governed-capability-engine-composition",
          metadata: {
            capabilityId:
              input.capabilityId,
            candidateDigest:
              input.candidateDigest,
            activeVersionDigest:
              input.candidateDigest,
            activePointerChanged,
            authorizationId:
              authorization
                .authorizationId,
            promotionPerformed:
              true,
            rollbackPerformed:
              false
          }
        });

    return {
      capabilityId:
        input.capabilityId,
      candidateDigest:
        input.candidateDigest,
      lifecycleStatus:
        "PROMOTED" as const,
      promoted:
        true as const,
      activeVersionDigest:
        input.candidateDigest,
      activePointerChanged,
      idempotent:
        false as const,
      authorizationId:
        authorization
          .authorizationId,
      evidencePath,
      evidenceHash,
      evidenceReferenceIds: [
        evidenceReferenceId
      ],
      offline:
        true as const,
      publicNetworkUse:
        false as const,
      cloudProviderUse:
        false as const,
      modelUse:
        false as const
    };
  }

  async createBoundedRepairCandidate(input: {
    attemptId: string;
    operatorRequestId: string;
    capabilityId: string;
    baselineDigest: string;
    regressionEvidencePath: string;
    regressionEvidenceHash: string;
  }) {
    this.requireRunningAttempt(
      input.attemptId,
      input.capabilityId
    );

    if (
      input.capabilityId !==
      "stable-unique-line-sort-v1"
    ) {
      throw new Error(
        "M16-A4 repair construction is bounded to stable-unique-line-sort-v1."
      );
    }

    if (
      !/^[a-f0-9]{64}$/.test(
        input.baselineDigest
      ) ||
      !/^[a-f0-9]{64}$/.test(
        input.regressionEvidenceHash
      )
    ) {
      throw new Error(
        "M16-A4 repair construction requires exact lowercase SHA-256 digests."
      );
    }

    const activeBefore =
      this.store.recoveryGet(
        "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
        [
          input.capabilityId,
          "catalog"
        ]
      );

    if (
      !activeBefore ||
      String(
        activeBefore
          .active_version_digest ??
        ""
      ) !== input.baselineDigest ||
      String(
        activeBefore
          .authority_identity ??
        ""
      ) !== "control-plane"
    ) {
      throw new Error(
        "M16-A4 repair requires the exact Control Plane-owned active baseline digest."
      );
    }

    const baseline =
      this.store.recoveryGet(
        "SELECT lifecycle_status, manifest_json, risk_class FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.baselineDigest
        ]
      );

    if (
      !baseline ||
      String(
        baseline.lifecycle_status ??
        ""
      ) !== "PROMOTED" ||
      String(
        baseline.risk_class ??
        ""
      ) !== "low"
    ) {
      throw new Error(
        "M16-A4 repair baseline must be the exact active low-risk promoted version."
      );
    }

    const baselineCertification =
      this.store.recoveryGet(
        "SELECT certification_id, rollback_ready FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.baselineDigest
        ]
      );

    const baselinePromotion =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.baselineDigest
        ]
      );

    if (
      !baselineCertification ||
      Number(
        baselineCertification
          .rollback_ready
      ) !== 1 ||
      !baselinePromotion
    ) {
      throw new Error(
        "M16-A4 repair requires a certified rollback-ready promoted baseline."
      );
    }

    const baselineManifest =
      JSON.parse(
        String(
          baseline.manifest_json
        )
      );

    if (
      baselineManifest.capabilityId !==
        input.capabilityId ||
      baselineManifest.versionDigest !==
        input.baselineDigest ||
      baselineManifest.networkPolicy !==
        "offline-strict" ||
      baselineManifest.sideEffects !==
        "none" ||
      baselineManifest.modelUsePolicy !==
        "none" ||
      baselineManifest
        .approvedExecutionRecipe
        ?.executableId !==
        M16_A1_EXECUTABLE_ID ||
      baselineManifest
        .approvedExecutionRecipe
        ?.args?.[0] !==
        M16_A1_OPERATION ||
      baselineManifest
        .approvedExecutionRecipe
        ?.shell !== false
    ) {
      throw new Error(
        "M16-A4 repair baseline manifest violates the bounded certified contract."
      );
    }

    const regressionEvidencePath =
      path.resolve(
        input.regressionEvidencePath
      );

    const relativeRegressionPath =
      path.relative(
        this.projectRoot,
        regressionEvidencePath
      );

    if (
      relativeRegressionPath ===
        ".." ||
      relativeRegressionPath.startsWith(
        `..${path.sep}`
      ) ||
      path.isAbsolute(
        relativeRegressionPath
      )
    ) {
      throw new Error(
        "M16-A4 repair regression evidence must remain inside the governed release root."
      );
    }

    if (
      !fs.existsSync(
        regressionEvidencePath
      ) ||
      !fs.statSync(
        regressionEvidencePath
      ).isFile()
    ) {
      throw new Error(
        "M16-A4 repair requires an existing deterministic regression evidence file."
      );
    }

    const actualRegressionHash =
      fileSha256(
        regressionEvidencePath
      );

    if (
      actualRegressionHash !==
        input.regressionEvidenceHash
    ) {
      throw new Error(
        "M16-A4 repair regression evidence hash mismatch."
      );
    }

    const regressionRecord =
      JSON.parse(
        fs.readFileSync(
          regressionEvidencePath,
          "utf8"
        )
      );

    if (
      regressionRecord.schemaVersion !==
        "sera.m16-a4-deterministic-regression.v1" ||
      regressionRecord.capabilityId !==
        input.capabilityId ||
      regressionRecord.activeVersionDigest !==
        input.baselineDigest ||
      regressionRecord.deterministic !==
        true ||
      regressionRecord.regressionObserved !==
        true ||
      typeof regressionRecord
        .observedDeficiency !==
        "string" ||
      regressionRecord
        .observedDeficiency
        .trim().length === 0
    ) {
      throw new Error(
        "M16-A4 repair requires deterministic regression evidence bound to the exact active baseline."
      );
    }

    const repairExecutableId =
      "deterministic-text-transform-v2" as const;

    const regressionEvidence = {
      id:
        randomId(
          "m16_a4_regression"
        ),
      uri:
        regressionEvidencePath,
      sha256:
        actualRegressionHash,
      kind:
        "m16-a4-deterministic-regression"
    };

    const engine =
      new CapabilityEngine(
        this.store,
        {
          projectRoot:
            this.projectRoot
        }
      );

    const learningSignal =
      engine.createLearningSignal({
        signalId:
          randomId(
            "m16_a4_learning_signal"
          ),
        signalType:
          "regression",
        capabilityId:
          input.capabilityId,
        baselineVersionDigest:
          input.baselineDigest,
        evidenceReferences: [
          regressionEvidence
        ],
        observedDeficiency:
          regressionRecord
            .observedDeficiency,
        desiredOutcome:
          "Repair the bounded stable unique line sort capability while preserving offline governance and rollback compatibility.",
        severity:
          "low",
        confidenceSource:
          "deterministic-fixture",
        trustStatus:
          "evidence-backed",
        candidateStatus:
          "candidate",
        createdAt:
          new Date()
            .toISOString(),
        policyVersion:
          CAPABILITY_POLICY_VERSION
      });

    const sessionId =
      randomId(
        "m16_a4_repair_session"
      );

    const proposalId =
      randomId(
        "m16_a4_repair_proposal"
      );

    const candidateRequestHash =
      hashBoundedValue({
        operatorRequestId:
          input.operatorRequestId,
        capabilityId:
          input.capabilityId,
        baselineDigest:
          input.baselineDigest,
        regressionEvidenceHash:
          actualRegressionHash,
        learningSignalId:
          learningSignal.signalId,
        requestedAction:
          "repair"
      });

    const proposalBase:
      Omit<
        CapabilityProposal,
        "integrityHash"
      > = {
        proposalId,
        sessionId,
        capabilityId:
          input.capabilityId,
        displayName:
          "Stable Unique Line Sort v1 Repair",
        source:
          "regression",
        sourceEvidence: [
          regressionEvidence
        ],
        learningLane:
          "repair",
        riskClass:
          "low",
        requestedType:
          "deterministic-transform",
        desiredOutcome:
          "Repair the evidence-backed deterministic regression while retaining the bounded offline stable unique line sort contract.",
        candidateRequestHash,
        modelGenerated:
          false,
        candidateIntelligence:
          false,
        requestHash:
          hashBoundedValue({
            operatorRequestId:
              input.operatorRequestId,
            regressionEvidenceHash:
              actualRegressionHash
          }),
        createdAt:
          new Date()
            .toISOString(),
        policyVersion:
          CAPABILITY_POLICY_VERSION
      };

    const common = {
      attemptId:
        input.attemptId,
      sessionId,
      proposalId,
      capabilityId:
        input.capabilityId,
      candidateRequestHash,
      learningLane:
        "repair" as const,
      riskClass:
        "low" as const,
      approvedExecutableIds: [
        repairExecutableId
      ] as [
        typeof repairExecutableId
      ],
      baselineVersionDigest:
        input.baselineDigest
    };

    const proposalAuthorization =
      createCapabilityAuthorization({
        authorizationType:
          "proposal",
        ...common
      });

    const experimentAuthorization =
      createCapabilityAuthorization({
        authorizationType:
          "experiment",
        ...common
      });

    const proposal =
      engine.createProposal(
        proposalBase,
        proposalAuthorization,
        `m16-a4-repair-proposal:${input.operatorRequestId}:${input.baselineDigest}:${actualRegressionHash}`
      );

    const bundle =
      engine.assembleCandidate(
        proposal,
        experimentAuthorization,
        {
          version:
            "1.0.1",
          inputSchema: {
            type:
              "object",
            required: [
              "input"
            ],
            properties: {
              input: {
                type:
                  "string",
                maxLength:
                  M16_A1_MAX_INPUT_BYTES
              }
            }
          },
          outputSchema: {
            type:
              "object",
            required: [
              "result"
            ],
            properties: {
              result: {
                type:
                  "string"
              }
            }
          },
          allowedInvocationModes: [
            "fixture"
          ],
          approvedExecutionRecipe: {
            executableId:
              repairExecutableId,
            args: [
              M16_A1_OPERATION,
              "input/source.txt",
              "out/result.txt",
              String(
                M16_A1_MAX_INPUT_BYTES
              )
            ],
            profileId:
              "offline-minimal",
            shell:
              false,
            timeoutMs:
              5000
          },
          evaluationProfile: {
            profileId:
              "deterministic-default",
            requiredAssertions: [
              "expected_output_hash_matches",
              "source_unchanged",
              "deterministic_replay"
            ],
            optionalAssertions: [
              "stderr_empty"
            ]
          },
          providerRequirements: {
            modelRequired:
              false,
            allowedProviderProfiles: [
              "none"
            ],
            candidateIntelligenceRefs: []
          },
          knowledgeRequirements: {
            required:
              false,
            provenanceRefs:
              proposal.sourceEvidence,
            trustInferred:
              false
          },
          sideEffects:
            "none",
          networkPolicy:
            "offline-strict",
          modelUsePolicy:
            "none",
          resourceLimits: {
            timeoutMs:
              5000,
            maxCandidateBytes:
              512 * 1024
          },
          rollbackCompatibility: {
            compatibleWith: [
              input.baselineDigest
            ],
            reversible:
              true
          }
        }
      );

    const candidateRow =
      this.store.recoveryGet(
        "SELECT lifecycle_status, learning_lane, risk_class, baseline_version_digest FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          bundle.versionDigest
        ]
      );

    if (
      !candidateRow ||
      String(
        candidateRow
          .lifecycle_status ??
        ""
      ) !== "CANDIDATE" ||
      String(
        candidateRow
          .learning_lane ??
        ""
      ) !== "repair" ||
      String(
        candidateRow
          .risk_class ??
        ""
      ) !== "low" ||
      String(
        candidateRow
          .baseline_version_digest ??
        ""
      ) !== input.baselineDigest
    ) {
      throw new Error(
        "M16-A4 repair candidate provenance invariant failed."
      );
    }

    const executable =
      createDefaultExecutableRegistry()
        .get(
          repairExecutableId
        );

    if (
      !executable.offlineCompatible ||
      executable.networkCapable
    ) {
      throw new Error(
        "M16-A4 repair candidate executable is not offline-safe."
      );
    }

    executable.validateArgs(
      bundle.manifest
        .approvedExecutionRecipe
        .args
    );

    const executionAuthority =
      this.controlPlane
        .requireExecutionAuthority();

    const testResults:
      any[] = [];

    for (
      const test of
      M16_A1_CANDIDATE_TESTS
    ) {
      const executionId =
        randomId(
          `m16_a4_repair_exec_${test.id.replace(/[^a-z0-9]+/gi, "_")}`
        );

      const request:
        ExecutionRequest = {
          executionId,
          attemptId:
            input.attemptId,
          authorizationId:
            randomId(
              "m16_a4_exec_auth"
            ),
          executableId:
            repairExecutableId,
          args: [
            ...bundle.manifest
              .approvedExecutionRecipe
              .args
          ],
          inputs: [
            {
              id:
                "source",
              sourceType:
                "inline-text",
              workspacePath:
                "input/source.txt",
              content:
                test.input
            }
          ],
          outputs: [
            {
              id:
                "result",
              workspacePath:
                "out/result.txt",
              required:
                test.expectSuccess
            }
          ],
          workingDirectory:
            ".",
          environmentProfile:
            "offline-minimal",
          timeoutMs:
            5000,
          gracefulCancellationMs:
            100,
          maxStdoutBytes:
            16384,
          maxStderrBytes:
            16384,
          maxCombinedOutputBytes:
            32768,
          expectedExitCodes: [
            0
          ],
          networkPolicy:
            "offline-strict",
          cleanupPolicy:
            "delete-workspace",
          correlation: {
            operatorRequestId:
              input.operatorRequestId,
            candidateDigest:
              bundle.versionDigest,
            baselineDigest:
              input.baselineDigest,
            testId:
              test.id,
            learningLane:
              "repair"
          }
        };

      const execution =
        await executionAuthority
          .execute(
            request,
            createExecutionAuthorization({
              request,
              requiredGateRefs: [
                "m16-a4-repair-candidate-test-gate"
              ],
              completedGateRefs: [
                "m16-a4-repair-candidate-test-gate"
              ]
            })
          );

      const output =
        execution.outputs.find(
          (candidate) =>
            candidate.id ===
            "result"
        );

      let actual:
        string |
        null =
          null;

      if (
        output
          ?.evidenceReference
      ) {
        actual =
          fs.readFileSync(
            path.join(
              execution.evidenceRoot,
              output.evidenceReference
            ),
            "utf8"
          );
      }

      const successObserved =
        execution.status ===
          "SUCCEEDED_PROCESS";

      const passed =
        test.expectSuccess
          ? (
              successObserved &&
              actual ===
                test.expected
            )
          : !successObserved;

      testResults.push({
        testId:
          test.id,
        expectSuccess:
          test.expectSuccess,
        executionId,
        executionStatus:
          execution.status,
        expected:
          test.expected,
        actual,
        expectationHash:
          hashBoundedValue({
            expectSuccess:
              test.expectSuccess,
            expected:
              test.expected
          }),
        resultHash:
          hashBoundedValue({
            status:
              execution.status,
            actual
          }),
        sourceNotMutated:
          execution
            .sourceNotMutated,
        workspaceOutsideRepository:
          execution
            .workspaceOutsideRepository,
        cleanupCleaned:
          execution
            .cleanup
            .cleaned,
        undeclaredOutputCount:
          execution
            .undeclaredOutputs
            .length,
        passed
      });
    }

    const replayTest =
      M16_A1_CANDIDATE_TESTS
        .find(
          (test) =>
            test.id ===
            "duplicate-lines"
        );

    if (!replayTest) {
      throw new Error(
        "M16-A4 deterministic replay fixture is missing."
      );
    }

    const replayBaseline =
      testResults.find(
        (item) =>
          item.testId ===
          "duplicate-lines"
      );

    const replayExecutionId =
      randomId(
        "m16_a4_repair_exec_replay"
      );

    const replayRequest:
      ExecutionRequest = {
        executionId:
          replayExecutionId,
        attemptId:
          input.attemptId,
        authorizationId:
          randomId(
            "m16_a4_exec_auth"
          ),
        executableId:
          repairExecutableId,
        args: [
          ...bundle.manifest
            .approvedExecutionRecipe
            .args
        ],
        inputs: [
          {
            id:
              "source",
            sourceType:
              "inline-text",
            workspacePath:
              "input/source.txt",
            content:
              replayTest.input
          }
        ],
        outputs: [
          {
            id:
              "result",
            workspacePath:
              "out/result.txt",
            required:
              true
          }
        ],
        workingDirectory:
          ".",
        environmentProfile:
          "offline-minimal",
        timeoutMs:
          5000,
        gracefulCancellationMs:
          100,
        maxStdoutBytes:
          16384,
        maxStderrBytes:
          16384,
        maxCombinedOutputBytes:
          32768,
        expectedExitCodes: [
          0
        ],
        networkPolicy:
          "offline-strict",
        cleanupPolicy:
          "delete-workspace",
        correlation: {
          operatorRequestId:
            input.operatorRequestId,
          candidateDigest:
            bundle.versionDigest,
          baselineDigest:
            input.baselineDigest,
          testId:
            "deterministic-replay",
          learningLane:
            "repair"
        }
      };

    const replayExecution =
      await executionAuthority
        .execute(
          replayRequest,
          createExecutionAuthorization({
            request:
              replayRequest,
            requiredGateRefs: [
              "m16-a4-repair-candidate-test-gate"
            ],
            completedGateRefs: [
              "m16-a4-repair-candidate-test-gate"
            ]
          })
        );

    const replayOutput =
      replayExecution.outputs.find(
        (candidate) =>
          candidate.id ===
          "result"
      );

    const replayActual =
      replayOutput
        ?.evidenceReference
        ? fs.readFileSync(
            path.join(
              replayExecution
                .evidenceRoot,
              replayOutput
                .evidenceReference
            ),
            "utf8"
          )
        : null;

    const deterministicReplay =
      replayExecution.status ===
        "SUCCEEDED_PROCESS" &&
      replayActual ===
        replayBaseline
          ?.actual;

    const candidateTestsPass =
      testResults.every(
        (item) =>
          item.passed
      ) &&
      deterministicReplay;

    if (!candidateTestsPass) {
      throw new Error(
        "M16-A4 repair candidate-local deterministic tests did not pass."
      );
    }

    const activeAfter =
      this.store.recoveryGet(
        "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
        [
          input.capabilityId,
          "catalog"
        ]
      );

    const certification =
      this.store.recoveryGet(
        "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          bundle.versionDigest
        ]
      );

    const promotion =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          bundle.versionDigest
        ]
      );

    const candidateAfter =
      this.store.recoveryGet(
        "SELECT lifecycle_status, learning_lane, baseline_version_digest FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          bundle.versionDigest
        ]
      );

    if (
      String(
        candidateAfter
          ?.lifecycle_status ??
        ""
      ) !== "CANDIDATE" ||
      String(
        candidateAfter
          ?.learning_lane ??
        ""
      ) !== "repair" ||
      String(
        candidateAfter
          ?.baseline_version_digest ??
        ""
      ) !== input.baselineDigest ||
      certification ||
      promotion ||
      String(
        activeAfter
          ?.active_version_digest ??
        ""
      ) !== input.baselineDigest ||
      String(
        activeAfter
          ?.authority_identity ??
        ""
      ) !== "control-plane"
    ) {
      throw new Error(
        "M16-A4 repair candidate-only state invariant failed."
      );
    }

    const executableMaterializedArgs =
      executable.materializeArgs(
        {
          executableId:
            repairExecutableId,
          args: [
            ...bundle.manifest
              .approvedExecutionRecipe
              .args
          ]
        } as any,
        path.join(
          this.projectRoot,
          ".sera",
          "capability-engine-composition",
          input.attemptId,
          ".m16-a4-repair-executable-identity"
        )
      );

    const executableArtifactPath =
      executableMaterializedArgs[0];

    if (
      !executableArtifactPath ||
      !fs.existsSync(
        executableArtifactPath
      )
    ) {
      throw new Error(
        "M16-A4 repair executable artifact is unavailable for identity verification."
      );
    }

    const executableArtifactSha256 =
      fileSha256(
        executableArtifactPath
      );

    const evidenceRoot =
      path.join(
        this.projectRoot,
        ".sera",
        "capability-engine-composition",
        input.attemptId
      );

    const evidencePath =
      writeJson(
        path.join(
          evidenceRoot,
          "m16-a4-repair-candidate.json"
        ),
        {
          schemaVersion:
            "sera.m16-a4-repair-candidate.v1",
          attemptId:
            input.attemptId,
          operatorRequestId:
            input.operatorRequestId,
          capabilityId:
            input.capabilityId,
          baseline: {
            versionDigest:
              input.baselineDigest,
            lifecycleStatus:
              "PROMOTED",
            authorityIdentity:
              "control-plane",
            rollbackReady:
              true
          },
          regressionEvidence: {
            path:
              regressionEvidencePath,
            sha256:
              actualRegressionHash,
            observedDeficiency:
              regressionRecord
                .observedDeficiency
          },
          learningSignal: {
            signalId:
              learningSignal
                .signalId,
            signalType:
              learningSignal
                .signalType,
            baselineVersionDigest:
              learningSignal
                .baselineVersionDigest,
            confidenceSource:
              learningSignal
                .confidenceSource,
            trustStatus:
              learningSignal
                .trustStatus
          },
          proposal: {
            proposalId:
              proposal.proposalId,
            sessionId:
              proposal.sessionId,
            source:
              proposal.source,
            learningLane:
              proposal.learningLane,
            riskClass:
              proposal.riskClass,
            candidateRequestHash:
              proposal
                .candidateRequestHash
          },
          candidate: {
            versionDigest:
              bundle.versionDigest,
            version:
              bundle.version,
            candidateRoot:
              bundle.candidateRoot,
            lifecycleStatus:
              "CANDIDATE",
            learningLane:
              "repair",
            baselineVersionDigest:
              input.baselineDigest,
            rollbackCompatibility:
              bundle.manifest
                .rollbackCompatibility,
            bytes:
              bundle.bytes
          },
          executable: {
            id:
              executable.id,
            fingerprint:
              executable.fingerprint,
            artifactSha256:
              executableArtifactSha256,
            args:
              bundle.manifest
                .approvedExecutionRecipe
                .args,
            offlineCompatible:
              executable
                .offlineCompatible,
            networkCapable:
              executable
                .networkCapable
          },
          validation: {
            candidateTestsPass,
            deterministicReplay,
            tests:
              testResults
          },
          state: {
            activeVersionDigest:
              input.baselineDigest,
            candidateCertified:
              false,
            candidatePromoted:
              false,
            activePointerChanged:
              false
          },
          offline:
            true,
          publicNetworkUse:
            false,
          cloudProviderUse:
            false,
          modelUse:
            false,
          externalPackageAcquisition:
            false,
          repositoryMutation:
            false
        }
      );

    const evidenceHash =
      fileSha256(
        evidencePath
      );

    const evidenceReferenceId =
      this.controlPlane
        .recordEvidenceReference({
          attemptId:
            input.attemptId,
          evidenceType:
            "m16-a4-tested-repair-candidate",
          location:
            path
              .relative(
                this.projectRoot,
                evidencePath
              )
              .replace(/\\/g, "/"),
          integrityHash:
            evidenceHash,
          producer:
            "governed-capability-engine-composition",
          metadata: {
            capabilityId:
              input.capabilityId,
            baselineDigest:
              input.baselineDigest,
            candidateDigest:
              bundle.versionDigest,
            regressionEvidenceHash:
              actualRegressionHash,
            learningSignalId:
              learningSignal.signalId,
            learningLane:
              "repair",
            candidateTestsPass,
            deterministicReplay,
            candidateOnly:
              true,
            activePointerChanged:
              false
          }
        });

    return {
      capabilityId:
        input.capabilityId,
      baselineDigest:
        input.baselineDigest,
      regressionEvidencePath,
      regressionEvidenceHash:
        actualRegressionHash,
      learningSignal,
      proposal,
      bundle,
      candidateDigest:
        bundle.versionDigest,
      lifecycleStatus:
        "CANDIDATE" as const,
      learningLane:
        "repair" as const,
      candidateTestsPass,
      deterministicReplay,
      testResults,
      certified:
        false as const,
      promoted:
        false as const,
      activeVersionDigest:
        input.baselineDigest,
      activePointerChanged:
        false as const,
      selectableForOrdinaryExecution:
        false as const,
      evidencePath,
      evidenceHash,
      evidenceReferenceIds: [
        evidenceReferenceId
      ],
      offline:
        true as const,
      publicNetworkUse:
        false as const,
      cloudProviderUse:
        false as const,
      modelUse:
        false as const,
      externalPackageAcquisition:
        false as const,
      repositoryMutation:
        false as const
    };
  }
  async rollbackPromotedBoundedCapability(input: {
    attemptId: string;
    operatorRequestId: string;
    sourceProposalId: string;
    sourceSessionId: string;
    capabilityId: string;
    currentDigest: string;
    targetDigest: string;
    reason: string;
    regressionEvidencePath: string;
    regressionEvidenceHash: string;
  }) {
    this.requireRunningAttempt(
      input.attemptId,
      input.capabilityId
    );

    if (
      input.capabilityId !==
      "stable-unique-line-sort-v1"
    ) {
      throw new Error(
        "M16-A4 rollback is bounded to stable-unique-line-sort-v1."
      );
    }

    if (
      !/^[a-f0-9]{64}$/.test(
        input.currentDigest
      ) ||
      !/^[a-f0-9]{64}$/.test(
        input.targetDigest
      ) ||
      !/^[a-f0-9]{64}$/.test(
        input.regressionEvidenceHash
      )
    ) {
      throw new Error(
        "M16-A4 rollback requires exact lowercase SHA-256 digests."
      );
    }

    if (
      input.currentDigest ===
      input.targetDigest
    ) {
      throw new Error(
        "M16-A4 rollback current and target digests must be distinct."
      );
    }

    if (
      typeof input.reason !==
        "string" ||
      input.reason.trim().length ===
        0
    ) {
      throw new Error(
        "M16-A4 rollback requires an explicit operator reason."
      );
    }

    const active =
      this.store.recoveryGet(
        "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
        [
          input.capabilityId,
          "catalog"
        ]
      );

    if (
      !active ||
      String(
        active.active_version_digest ??
        ""
      ) !== input.currentDigest ||
      String(
        active.authority_identity ??
        ""
      ) !== "control-plane"
    ) {
      throw new Error(
        "M16-A4 rollback requires the exact Control Plane-owned active current digest."
      );
    }

    const current =
      this.store.recoveryGet(
        "SELECT lifecycle_status, manifest_json, learning_lane, risk_class, baseline_version_digest FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.currentDigest
        ]
      );

    if (
      !current ||
      String(
        current.lifecycle_status ??
        ""
      ) !== "PROMOTED" ||
      String(
        current.learning_lane ??
        ""
      ) !== "repair" ||
      String(
        current.risk_class ??
        ""
      ) !== "low" ||
      String(
        current.baseline_version_digest ??
        ""
      ) !== input.targetDigest
    ) {
      throw new Error(
        "M16-A4 rollback current version must be the exact promoted repair candidate whose baseline is the target digest."
      );
    }

    const target =
      this.store.recoveryGet(
        "SELECT lifecycle_status, manifest_json, risk_class FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.targetDigest
        ]
      );

    if (
      !target ||
      ![
        "CERTIFIED",
        "PROMOTED",
        "SUPERSEDED",
        "ROLLED_BACK"
      ].includes(
        String(
          target.lifecycle_status ??
          ""
        )
      ) ||
      String(
        target.risk_class ??
        ""
      ) !== "low"
    ) {
      throw new Error(
        "M16-A4 rollback target must be an exact prior low-risk certified version."
      );
    }

    const currentCertification =
      this.store.recoveryGet(
        "SELECT certification_id, rollback_ready FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.currentDigest
        ]
      );

    const targetCertification =
      this.store.recoveryGet(
        "SELECT certification_id, rollback_ready FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.targetDigest
        ]
      );

    const currentPromotion =
      this.store.recoveryGet(
        "SELECT promotion_id, rollback_target_digest FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.currentDigest
        ]
      );

    const targetPromotion =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.targetDigest
        ]
      );

    if (
      !currentCertification ||
      Number(
        currentCertification
          .rollback_ready
      ) !== 1 ||
      !targetCertification ||
      Number(
        targetCertification
          .rollback_ready
      ) !== 1 ||
      !currentPromotion ||
      String(
        currentPromotion
          .rollback_target_digest ??
        ""
      ) !== input.targetDigest ||
      !targetPromotion
    ) {
      throw new Error(
        "M16-A4 rollback requires certified rollback-ready current and target versions with exact promotion history."
      );
    }

    const proposal =
      this.store.recoveryGet(
        "SELECT proposal_id, session_id, capability_id, learning_lane, risk_class FROM capability_proposals WHERE proposal_id = ? AND session_id = ? AND capability_id = ?",
        [
          input.sourceProposalId,
          input.sourceSessionId,
          input.capabilityId
        ]
      );

    if (
      !proposal ||
      String(
        proposal.learning_lane ??
        ""
      ) !== "repair" ||
      String(
        proposal.risk_class ??
        ""
      ) !== "low"
    ) {
      throw new Error(
        "M16-A4 rollback requires exact low-risk repair proposal provenance."
      );
    }

    const currentManifest =
      JSON.parse(
        String(
          current.manifest_json
        )
      );

    const targetManifest =
      JSON.parse(
        String(
          target.manifest_json
        )
      );

    for (
      const manifest of [
        currentManifest,
        targetManifest
      ]
    ) {
      if (
        manifest.capabilityId !==
          input.capabilityId ||
        manifest.networkPolicy !==
          "offline-strict" ||
        manifest.sideEffects !==
          "none" ||
        manifest.modelUsePolicy !==
          "none" ||
        manifest
          .approvedExecutionRecipe
          ?.shell !== false ||
        manifest
          .approvedExecutionRecipe
          ?.args?.[0] !==
          M16_A1_OPERATION
      ) {
        throw new Error(
          "M16-A4 rollback version manifest violates the bounded offline capability contract."
        );
      }
    }

    if (
      currentManifest.versionDigest !==
        input.currentDigest ||
      targetManifest.versionDigest !==
        input.targetDigest
    ) {
      throw new Error(
        "M16-A4 rollback manifest identity does not match exact current and target digests."
      );
    }

    const regressionEvidencePath =
      path.resolve(
        input.regressionEvidencePath
      );

    const relativeRegressionPath =
      path.relative(
        this.projectRoot,
        regressionEvidencePath
      );

    if (
      relativeRegressionPath ===
        ".." ||
      relativeRegressionPath.startsWith(
        `..${path.sep}`
      ) ||
      path.isAbsolute(
        relativeRegressionPath
      )
    ) {
      throw new Error(
        "M16-A4 rollback regression evidence must remain inside the governed release root."
      );
    }

    if (
      !fs.existsSync(
        regressionEvidencePath
      ) ||
      !fs.statSync(
        regressionEvidencePath
      ).isFile()
    ) {
      throw new Error(
        "M16-A4 rollback requires an existing durable regression evidence file."
      );
    }

    const actualRegressionHash =
      fileSha256(
        regressionEvidencePath
      );

    if (
      actualRegressionHash !==
        input.regressionEvidenceHash
    ) {
      throw new Error(
        "M16-A4 rollback regression evidence hash mismatch."
      );
    }

    const regressionRecord =
      JSON.parse(
        fs.readFileSync(
          regressionEvidencePath,
          "utf8"
        )
      );

    if (
      regressionRecord.schemaVersion !==
        "sera.m16-a4-deterministic-regression.v1" ||
      regressionRecord.capabilityId !==
        input.capabilityId ||
      regressionRecord.activeVersionDigest !==
        input.currentDigest ||
      regressionRecord.deterministic !==
        true ||
      regressionRecord.regressionObserved !==
        true ||
      typeof regressionRecord
        .observedDeficiency !==
        "string" ||
      regressionRecord
        .observedDeficiency
        .trim().length === 0
    ) {
      throw new Error(
        "M16-A4 rollback requires deterministic regression evidence bound to the exact active current digest."
      );
    }

    const regressionEvidence = {
      id:
        randomId(
          "m16_a4_rollback_regression"
        ),
      uri:
        regressionEvidencePath,
      sha256:
        actualRegressionHash,
      kind:
        "m16-a4-deterministic-regression"
    };

    const authorization =
      createCapabilityAuthorization({
        authorizationType:
          "rollback",
        attemptId:
          input.attemptId,
        sessionId:
          input.sourceSessionId,
        proposalId:
          input.sourceProposalId,
        capabilityId:
          input.capabilityId,
        candidateRequestHash:
          input.targetDigest,
        learningLane:
          "repair",
        riskClass:
          "low",
        approvedExecutableIds: [
          M16_A1_EXECUTABLE_ID
        ],
        baselineVersionDigest:
          input.currentDigest
      });

    const engine =
      new CapabilityEngine(
        this.store,
        {
          projectRoot:
            this.projectRoot
        }
      );

    const rollback =
      engine.rollback({
        sessionId:
          input.sourceSessionId,
        capabilityId:
          input.capabilityId,
        currentDigest:
          input.currentDigest,
        targetDigest:
          input.targetDigest,
        reason:
          input.reason.trim(),
        regressionEvidence: [
          regressionEvidence
        ],
        authorization,
        idempotencyKey:
          `m16-a4-rollback:${input.operatorRequestId}:${input.currentDigest}:${input.targetDigest}:${actualRegressionHash}`
      });

    const activeAfter =
      this.store.recoveryGet(
        "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
        [
          input.capabilityId,
          "catalog"
        ]
      );

    const targetAfter =
      this.store.recoveryGet(
        "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.targetDigest
        ]
      );

    const currentAfter =
      this.store.recoveryGet(
        "SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          input.currentDigest
        ]
      );

    const catalogAfter =
      this.store.recoveryGet(
        "SELECT active_version_digest, status FROM capability_catalog WHERE capability_id = ?",
        [
          input.capabilityId
        ]
      );

    const rollbackRecord =
      this.store.recoveryGet(
        "SELECT rollback_id, current_version_digest, target_version_digest, authorization_id, regression_evidence_json FROM capability_rollbacks WHERE capability_id = ? AND current_version_digest = ? AND target_version_digest = ? ORDER BY rolled_back_at DESC LIMIT 1",
        [
          input.capabilityId,
          input.currentDigest,
          input.targetDigest
        ]
      );

    if (
      String(
        activeAfter
          ?.active_version_digest ??
        ""
      ) !== input.targetDigest ||
      String(
        activeAfter
          ?.authority_identity ??
        ""
      ) !== "control-plane" ||
      String(
        targetAfter
          ?.lifecycle_status ??
        ""
      ) !== "PROMOTED" ||
      String(
        currentAfter
          ?.lifecycle_status ??
        ""
      ) !== "ROLLED_BACK" ||
      String(
        catalogAfter
          ?.active_version_digest ??
        ""
      ) !== input.targetDigest ||
      String(
        catalogAfter
          ?.status ??
        ""
      ) !== "PROMOTED" ||
      !rollbackRecord ||
      String(
        rollbackRecord
          .current_version_digest ??
        ""
      ) !== input.currentDigest ||
      String(
        rollbackRecord
          .target_version_digest ??
        ""
      ) !== input.targetDigest ||
      String(
        rollbackRecord
          .authorization_id ??
        ""
      ) !== authorization
        .authorizationId
    ) {
      throw new Error(
        "M16-A4 post-rollback state invariant failed."
      );
    }

    const storedRegressionEvidence =
      JSON.parse(
        String(
          rollbackRecord
            .regression_evidence_json
        )
      );

    if (
      !Array.isArray(
        storedRegressionEvidence
      ) ||
      storedRegressionEvidence.length !==
        1 ||
      storedRegressionEvidence[0]
        ?.sha256 !==
        actualRegressionHash ||
      storedRegressionEvidence[0]
        ?.uri !==
        regressionEvidencePath
    ) {
      throw new Error(
        "M16-A4 rollback record does not retain the exact regression evidence identity."
      );
    }

    const evidenceRoot =
      path.join(
        this.projectRoot,
        ".sera",
        "capability-engine-composition",
        input.attemptId
      );

    const evidencePath =
      writeJson(
        path.join(
          evidenceRoot,
          "m16-a4-rollback.json"
        ),
        {
          schemaVersion:
            "sera.m16-a4-rollback.v1",
          attemptId:
            input.attemptId,
          operatorRequestId:
            input.operatorRequestId,
          sourceProvenance: {
            proposalId:
              input.sourceProposalId,
            sessionId:
              input.sourceSessionId,
            learningLane:
              "repair"
          },
          capabilityId:
            input.capabilityId,
          currentDigest:
            input.currentDigest,
          targetDigest:
            input.targetDigest,
          reason:
            input.reason.trim(),
          regressionEvidence: {
            path:
              regressionEvidencePath,
            sha256:
              actualRegressionHash,
            observedDeficiency:
              regressionRecord
                .observedDeficiency
          },
          authorizationId:
            authorization
              .authorizationId,
          rollbackId:
            String(
              rollbackRecord
                .rollback_id
            ),
          rollback,
          after: {
            activeVersionDigest:
              input.targetDigest,
            activeAuthority:
              "control-plane",
            targetLifecycleStatus:
              "PROMOTED",
            currentLifecycleStatus:
              "ROLLED_BACK",
            catalogStatus:
              "PROMOTED"
          },
          exactRollbackRecord:
            true,
          offline:
            true,
          publicNetworkUse:
            false,
          cloudProviderUse:
            false,
          modelUse:
            false
        }
      );

    const evidenceHash =
      fileSha256(
        evidencePath
      );

    const evidenceReferenceId =
      this.controlPlane
        .recordEvidenceReference({
          attemptId:
            input.attemptId,
          evidenceType:
            "m16-a4-explicit-rollback",
          location:
            path
              .relative(
                this.projectRoot,
                evidencePath
              )
              .replace(/\\/g, "/"),
          integrityHash:
            evidenceHash,
          producer:
            "governed-capability-engine-composition",
          metadata: {
            capabilityId:
              input.capabilityId,
            currentDigest:
              input.currentDigest,
            targetDigest:
              input.targetDigest,
            regressionEvidenceHash:
              actualRegressionHash,
            authorizationId:
              authorization
                .authorizationId,
            exactRollbackRecord:
              true,
            targetRestoredPromoted:
              true,
            currentMarkedRolledBack:
              true,
            authorityIdentity:
              "control-plane"
          }
        });

    return {
      capabilityId:
        input.capabilityId,
      currentDigest:
        input.currentDigest,
      targetDigest:
        input.targetDigest,
      activeVersionDigest:
        input.targetDigest,
      targetLifecycleStatus:
        "PROMOTED" as const,
      currentLifecycleStatus:
        "ROLLED_BACK" as const,
      authorizationId:
        authorization
          .authorizationId,
      rollbackId:
        String(
          rollbackRecord
            .rollback_id
        ),
      regressionEvidencePath,
      regressionEvidenceHash:
        actualRegressionHash,
      evidencePath,
      evidenceHash,
      evidenceReferenceIds: [
        evidenceReferenceId
      ],
      rollbackPerformed:
        true as const,
      exactRollbackRecord:
        true as const,
      pointerAuthorityPreserved:
        true as const,
      catalogRestoredPromoted:
        true as const,
      offline:
        true as const,
      publicNetworkUse:
        false as const,
      cloudProviderUse:
        false as const,
      modelUse:
        false as const
    };
  }
  async executePromotedBoundedCapability(input: {
    attemptId: string;
    operatorRequestId: string;
    capabilityId: string;
    sourceText: string;
  }) {
    this.requireRunningAttempt(
      input.attemptId,
      input.capabilityId
    );

    if (
      input.capabilityId !==
      "stable-unique-line-sort-v1"
    ) {
      throw new Error(
        "M16-A3 promoted execution is bounded to stable-unique-line-sort-v1."
      );
    }

    const inputBytes =
      Buffer.byteLength(
        input.sourceText,
        "utf8"
      );

    if (
      inputBytes >
      M16_A1_MAX_INPUT_BYTES
    ) {
      throw new Error(
        "M16-A3 promoted execution input exceeds the certified bound."
      );
    }

    const active =
      this.store.recoveryGet(
        "SELECT active_version_digest, authority_identity FROM capability_active_versions WHERE capability_id = ? AND activation_scope = ?",
        [
          input.capabilityId,
          "catalog"
        ]
      );

    if (
      !active ||
      String(
        active.authority_identity
      ) !== "control-plane"
    ) {
      throw new Error(
        "M16-A3 ordinary execution requires a Control Plane-owned active pointer."
      );
    }

    const activeDigest =
      String(
        active.active_version_digest
      );

    const version =
      this.store.recoveryGet(
        "SELECT lifecycle_status, manifest_json FROM capability_versions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          activeDigest
        ]
      );

    const certification =
      this.store.recoveryGet(
        "SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          activeDigest
        ]
      );

    const promotion =
      this.store.recoveryGet(
        "SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?",
        [
          input.capabilityId,
          activeDigest
        ]
      );

    if (
      !version ||
      String(
        version.lifecycle_status
      ) !== "PROMOTED" ||
      !certification ||
      !promotion
    ) {
      throw new Error(
        "M16-A3 ordinary execution requires the exact active promoted and certified digest."
      );
    }

    const manifest =
      JSON.parse(
        String(version.manifest_json)
      );

    const recipe =
      manifest
        .approvedExecutionRecipe;


    const activeExecutableId =
      String(
        recipe?.executableId ??
        ""
      );

    const boundedPromotedExecutableIds =
      new Set<string>([
        M16_A1_EXECUTABLE_ID,
        "deterministic-text-transform-v2"
      ]);
const expectedArgs = [
      M16_A1_OPERATION,
      "input/source.txt",
      "out/result.txt",
      String(
        M16_A1_MAX_INPUT_BYTES
      )
    ];

    if (
      manifest.capabilityId !==
        input.capabilityId ||
      manifest.versionDigest !==
        activeDigest ||
      manifest.networkPolicy !==
        "offline-strict" ||
      manifest.sideEffects !==
        "none" ||
      manifest.modelUsePolicy !==
        "none" ||
      !boundedPromotedExecutableIds.has(
        activeExecutableId
      ) ||
      recipe?.shell !== false ||
      JSON.stringify(
        recipe?.args
      ) !==
        JSON.stringify(
          expectedArgs
        )
    ) {
      throw new Error(
        "M16-A3 active promoted manifest does not match the certified bounded execution recipe."
      );
    }

    const executable =
      createDefaultExecutableRegistry()
        .get(
          activeExecutableId
        );

    if (
      !executable.offlineCompatible ||
      executable.networkCapable
    ) {
      throw new Error(
        "M16-A3 promoted executable is not offline-safe."
      );
    }

    executable.validateArgs(
      expectedArgs
    );

    const request: ExecutionRequest = {
      executionId:
        randomId(
          "m16_a3_reattempt_exec"
        ),
      attemptId:
        input.attemptId,
      authorizationId:
        randomId(
          "m16_a3_reattempt_auth"
        ),
      executableId:
        activeExecutableId,
      args:
        expectedArgs,
      inputs: [
        {
          id: "source",
          sourceType:
            "inline-text",
          workspacePath:
            "input/source.txt",
          content:
            input.sourceText
        }
      ],
      outputs: [
        {
          id: "result",
          workspacePath:
            "out/result.txt",
          required:
            true
        }
      ],
      workingDirectory:
        ".",
      environmentProfile:
        "offline-minimal",
      timeoutMs:
        5000,
      gracefulCancellationMs:
        100,
      maxStdoutBytes:
        16384,
      maxStderrBytes:
        16384,
      maxCombinedOutputBytes:
        32768,
      expectedExitCodes:
        [0],
      networkPolicy:
        "offline-strict",
      cleanupPolicy:
        "delete-workspace",
      correlation: {
        operatorRequestId:
          input.operatorRequestId,
        capabilityId:
          input.capabilityId,
        activeVersionDigest:
          activeDigest,
        m16Checkpoint:
          "M16-A3"
      }
    };

    const executionAuthority =
      this.controlPlane
        .requireExecutionAuthority();

    const execution =
      await executionAuthority
        .execute(
          request,
          createExecutionAuthorization({
            request,
            requiredGateRefs: [
              "m16-a3-active-promoted-capability-gate"
            ],
            completedGateRefs: [
              "m16-a3-active-promoted-capability-gate"
            ]
          })
        );

    const output =
      execution.outputs.find(
        (candidate) =>
          candidate.id ===
          "result"
      );

    if (
      execution.ok !== true ||
      execution.status !==
        "SUCCEEDED_PROCESS" ||
      execution
        .workspaceOutsideRepository !==
        true ||
      execution.cleanup.cleaned !==
        true ||
      execution.sourceNotMutated !==
        true ||
      execution
        .attemptSuccessManufactured !==
        false ||
      execution
        .undeclaredOutputs.length !==
        0 ||
      output?.status !==
        "harvested" ||
      !output.evidenceReference
    ) {
      throw new Error(
        "M16-A3 promoted capability execution did not satisfy required evidence conditions."
      );
    }

    const outputPath =
      path.join(
        execution.evidenceRoot,
        output.evidenceReference
      );

    const actualOutput =
      fs.readFileSync(
        outputPath,
        "utf8"
      );

    const evidenceRoot =
      path.join(
        this.projectRoot,
        ".sera",
        "capability-engine-composition",
        input.attemptId
      );

    const evidencePath =
      writeJson(
        path.join(
          evidenceRoot,
          "m16-a3-promoted-task-reattempt.json"
        ),
        {
          schemaVersion:
            "sera.m16-a3-promoted-task-reattempt.v1",
          attemptId:
            input.attemptId,
          operatorRequestId:
            input.operatorRequestId,
          capabilityId:
            input.capabilityId,
          activeVersionDigest:
            activeDigest,
          lifecycleStatus:
            "PROMOTED",
          certificationId:
            String(
              certification
                .certification_id
            ),
          promotionId:
            String(
              promotion
                .promotion_id
            ),
          executable: {
            id:
              executable.id,
            fingerprint:
              executable.fingerprint
          },
          input: {
            bytes:
              inputBytes,
            sha256:
              digest(
                input.sourceText
              )
          },
          output: {
            value:
              actualOutput,
            sha256:
              output.hash
          },
          executionId:
            execution.executionId,
          workspaceOutsideRepository:
            execution
              .workspaceOutsideRepository,
          cleanupCleaned:
            execution.cleanup.cleaned,
          sourceNotMutated:
            execution.sourceNotMutated,
          attemptSuccessManufactured:
            execution
              .attemptSuccessManufactured,
          undeclaredOutputCount:
            execution
              .undeclaredOutputs.length,
          rollbackPerformed:
            false,
          offline:
            true,
          publicNetworkUse:
            false,
          cloudProviderUse:
            false,
          modelUse:
            false
        }
      );

    const evidenceHash =
      fileSha256(evidencePath);

    const evidenceReferenceId =
      this.controlPlane
        .recordEvidenceReference({
          attemptId:
            input.attemptId,
          evidenceType:
            "m16-a3-promoted-task-reattempt",
          location:
            path
              .relative(
                this.projectRoot,
                evidencePath
              )
              .replace(/\\/g, "/"),
          integrityHash:
            evidenceHash,
          producer:
            "governed-capability-engine-composition",
          metadata: {
            capabilityId:
              input.capabilityId,
            activeVersionDigest:
              activeDigest,
            executionId:
              execution.executionId,
            outputHash:
              output.hash
          }
        });

    return {
      capabilityId:
        input.capabilityId,
      activeVersionDigest:
        activeDigest,
      lifecycleStatus:
        "PROMOTED" as const,
      executionId:
        execution.executionId,
      output:
        actualOutput,
      outputHash:
        output.hash,
      evidencePath,
      evidenceHash,
      evidenceReferenceId,
      offline:
        true as const,
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
