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
import type { ProductControlPlane } from "@sera/operator-gateway";
import type { RuntimeStateStore } from "@sera/runtime-state";

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
  constructor(
    private readonly controlPlane: ProductControlPlane,
    private readonly store: RuntimeStateStore,
    private readonly projectRoot: string
  ) {}

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
    const attempt = this.controlPlane.recoveryGet(
      "SELECT capability, current_state FROM attempts WHERE attempt_id = ?",
      [input.attemptId]
    );
    if (!attempt || attempt.capability !== "capability-engine" || attempt.current_state !== "RUNNING") {
      throw new Error("Governed Capability Engine requires an authoritative RUNNING capability-engine attempt.");
    }

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
