import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAPABILITY_POLICY_VERSION,
  CapabilityEngine,
  createCapabilityAuthorization,
  type CapabilityProposal
} from "@sera/capability-engine";
import { IsolatedExecutionEngine, createExecutionAuthorization, type ExecutionRequest } from "@sera/execution-engine";
import { OperatorGateway } from "@sera/operator-gateway";
import {
  M16_A1_EXECUTABLE_ID,
  M16_A1_PROFILE_ID,
  ReleaseRelativeRuntimeCapabilityRegistryReader,
  determineCapabilityGap,
  resolveBoundedAcquisitionProfile
} from "@sera/runtime-capability-composition";
import { openRuntimeState } from "@sera/runtime-state";

const canonicalRegistry = path.join(process.cwd(), "architecture", "runtime-capability-registry-v1.json");

function hashFile(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function tempRelease(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `sera-m16-a1-${label}-`));
  fs.mkdirSync(path.join(root, "architecture"), { recursive: true });
  fs.copyFileSync(canonicalRegistry, path.join(root, "architecture", "runtime-capability-registry-v1.json"));
  fs.writeFileSync(path.join(root, "architecture", "runtime-capability-registry-v1.sha256"), `${hashFile(canonicalRegistry)}\n`, "utf8");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ private: true }), "utf8");
  return root;
}

async function post(port: number, route: string, body: unknown, headers: Record<string, string> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const request = http.request({ host: "127.0.0.1", port, path: route, method: "POST", headers: { "content-type": "application/json", "content-length": String(payload.length), host: `127.0.0.1:${port}`, ...headers } }, (response) => {
      let text = "";
      response.on("data", (chunk) => { text += String(chunk); });
      response.on("end", () => resolve(JSON.parse(text)));
    });
    request.on("error", reject);
    request.end(payload);
  });
}

async function withGateway<T>(label: string, fn: (input: { root: string; gateway: OperatorGateway; port: number; executionStore: ReturnType<typeof openRuntimeState> }) => Promise<T>): Promise<T> {
  const root = tempRelease(label);
  const executionStore = openRuntimeState({ projectRoot: root, installationId: `installation_${label}`, runtimeInstanceId: `execution_${label}` });
  const executionAuthority = new IsolatedExecutionEngine(executionStore, { projectRoot: root });
  const gateway = new OperatorGateway({ projectRoot: root, executionAuthority, installationId: `installation_${label}`, runtimeInstanceId: `gateway_${label}` });
  const { port } = await gateway.start();
  try {
    return await fn({ root, gateway, port, executionStore });
  } finally {
    await gateway.stop();
    gateway.close();
    executionStore.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function authenticatedRequest(port: number, acquisitionRequest: Record<string, unknown>, objective = "Acquire a deterministic offline capability that returns unique non-empty lines in lexicographic order while preserving each exact retained line."): Promise<any> {
  const sessionEnvelope = await post(port, "/api/v1/operator/session", { idempotencyKey: `m16-a1-session-${Math.random()}` });
  const session = sessionEnvelope.data;
  return post(port, "/api/v1/operator/requests", {
    category: "propose-capability",
    text: objective,
    idempotencyKey: `m16-a1-request-${Math.random()}`,
    acquisitionRequest
  }, {
    authorization: `Bearer ${session.token}`,
    "x-sera-csrf": session.csrfToken,
    origin: `http://127.0.0.1:${port}`
  });
}

describe("M16-A1 usable governed capability acquisition", () => {
  it("routes an authenticated structured request through the Control Plane into a tested inactive candidate and preserves it across restart", async () => {
    await withGateway("success", async ({ root, port }) => {
      const envelope = await authenticatedRequest(port, { profileId: M16_A1_PROFILE_ID });
      expect(envelope.ok).toBe(true);
      const result = envelope.data;
      expect(result.status).toBe("COMPLETED");
      expect(result.offline).toBe(true);
      expect(result.publicNetworkUse).toBe(false);
      expect(result.cloudProviderUse).toBe(false);
      expect(result.modelUse).toBe(false);
      expect(result.externalPackageAcquisition).toBe(false);
      expect(result.repositoryMutation).toBe(false);
      expect(result.acquisition.gapStatus).toBe("UNSATISFIED");
      expect(result.acquisition.candidateCreated).toBe(true);
      expect(result.acquisition.lifecycleStatus).toBe("CANDIDATE");
      expect(result.acquisition.candidateTestsPass).toBe(true);
      expect(result.acquisition.deterministicReplay).toBe(true);
      expect(result.acquisition.executableId).toBe(M16_A1_EXECUTABLE_ID);
      expect(result.acquisition.certified).toBe(false);
      expect(result.acquisition.promoted).toBe(false);
      expect(result.acquisition.activePointerChanged).toBe(false);
      expect(result.acquisition.selectableForOrdinaryExecution).toBe(false);
      expect(result.acquisition.candidateDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(fs.existsSync(result.acquisition.evidencePath)).toBe(true);
      expect(hashFile(result.acquisition.evidencePath)).toBe(result.acquisition.evidenceHash);

      const state = openRuntimeState({ projectRoot: root, installationId: "installation_restart", runtimeInstanceId: "runtime_restart" });
      try {
        const candidate = state.recoveryGet("SELECT lifecycle_status FROM capability_versions WHERE capability_id = ? AND version_digest = ?", [result.acquisition.capabilityId, result.acquisition.candidateDigest]);
        expect(candidate?.lifecycle_status).toBe("CANDIDATE");
        expect(state.recoveryGet("SELECT certification_id FROM capability_certifications WHERE capability_id = ? AND version_digest = ?", [result.acquisition.capabilityId, result.acquisition.candidateDigest])).toBeUndefined();
        expect(state.recoveryGet("SELECT promotion_id FROM capability_promotions WHERE capability_id = ? AND version_digest = ?", [result.acquisition.capabilityId, result.acquisition.candidateDigest])).toBeUndefined();
        expect(state.recoveryGet("SELECT active_version_digest FROM capability_active_versions WHERE capability_id = ?", [result.acquisition.capabilityId])).toBeUndefined();
        expect(state.recoveryGet("SELECT current_state FROM attempts WHERE attempt_id = ?", [result.attemptId])?.current_state).toBe("COMPLETED");
      } finally {
        state.close();
      }
    });
  }, 30_000);

  it("computes a SATISFIED gap from registry fields without creating a candidate", () => {
    const root = tempRelease("satisfied");
    try {
      const snapshot = new ReleaseRelativeRuntimeCapabilityRegistryReader(root).read();
      const { requirement } = resolveBoundedAcquisitionProfile({ profileId: M16_A1_PROFILE_ID }, "bounded requirement");
      const syntheticRequirement = { ...requirement, operation: "text-normalization" as any };
      const report = determineCapabilityGap(snapshot, syntheticRequirement);
      expect(report.gapStatus).toBe("SATISFIED");
      expect(["worker", "tool"]).toContain(report.satisfyingCapabilityId);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  const blockedRequests: Array<[string, Record<string, unknown>]> = [
    ["unknown executable IDs", { profileId: M16_A1_PROFILE_ID, requestedExecutableId: "arbitrary-executable" }],
    ["public network", { profileId: M16_A1_PROFILE_ID, networkPolicy: "online" }],
    ["shell", { profileId: M16_A1_PROFILE_ID, shell: true }],
    ["package acquisition", { profileId: M16_A1_PROFILE_ID, packageAcquisition: true }],
    ["cloud model", { profileId: M16_A1_PROFILE_ID, cloudProviderUse: true }],
    ["model use", { profileId: M16_A1_PROFILE_ID, modelUse: true }],
    ["side effects", { profileId: M16_A1_PROFILE_ID, sideEffectPolicy: "external-write" }],
    ["outside profile", { profileId: "unbounded-dynamic-acquisition-v1" }]
  ];

  it.each(blockedRequests)("blocks %s before candidate creation", async (_name, acquisitionRequest) => {
    await withGateway(`blocked-${String(_name).replace(/[^a-z]+/gi, "-")}`, async ({ port }) => {
      const envelope = await authenticatedRequest(port, acquisitionRequest);
      expect(envelope.ok).toBe(true);
      expect(envelope.data.status).toBe("BLOCKED");
      expect(envelope.data.failureCode).toBe("capability_acquisition_blocked");
    });
  });

  it("blocks registry hash mismatch before candidate construction", async () => {
    await withGateway("registry-mismatch", async ({ root, port }) => {
      fs.writeFileSync(path.join(root, "architecture", "runtime-capability-registry-v1.sha256"), `${"0".repeat(64)}\n`, "utf8");
      const envelope = await authenticatedRequest(port, { profileId: M16_A1_PROFILE_ID });
      expect(envelope.data.status).toBe("BLOCKED");
      expect(envelope.data.safeMessage).toContain("registry hash mismatch");
      const store = openRuntimeState({ projectRoot: root, installationId: "inspect", runtimeInstanceId: "inspect" });
      try {
        expect(store.recoveryGet("SELECT version_digest FROM capability_versions WHERE capability_id = ?", ["stable-unique-line-sort-v1"])).toBeUndefined();
      } finally {
        store.close();
      }
    });
  });

  it("retains Capability Engine authorization and closed executable policy boundaries", () => {
    const root = tempRelease("authorization");
    const store = openRuntimeState({ projectRoot: root });
    const engine = new CapabilityEngine(store, { projectRoot: root });
    try {
      const proposal: Omit<CapabilityProposal, "integrityHash"> = {
        proposalId: "proposal_m16_a1_negative",
        sessionId: "session_m16_a1_negative",
        capabilityId: "negative.authorization.test",
        displayName: "Negative Authorization Test",
        source: "operator-request",
        sourceEvidence: [{ id: "registry", uri: canonicalRegistry, sha256: hashFile(canonicalRegistry), kind: "test" }],
        learningLane: "acquisition",
        riskClass: "low",
        requestedType: "deterministic-transform",
        desiredOutcome: "authorization negative proof",
        candidateRequestHash: "a".repeat(64),
        modelGenerated: false,
        candidateIntelligence: false,
        createdAt: new Date().toISOString(),
        policyVersion: CAPABILITY_POLICY_VERSION
      };
      expect(() => engine.createProposal(proposal, undefined)).toThrow();
      const valid = createCapabilityAuthorization({ authorizationType: "proposal", attemptId: "attempt", sessionId: proposal.sessionId, proposalId: proposal.proposalId, capabilityId: proposal.capabilityId, candidateRequestHash: proposal.candidateRequestHash, learningLane: proposal.learningLane, riskClass: proposal.riskClass, approvedExecutableIds: [M16_A1_EXECUTABLE_ID] });
      expect(() => engine.createProposal(proposal, { ...valid, expiresAt: "2000-01-01T00:00:00.000Z" } as any)).toThrow();
      expect(() => engine.createProposal(proposal, { ...valid, integrityHash: "0".repeat(64) } as any)).toThrow();
      expect(() => engine.validateManifest({ approvedExecutionRecipe: { executableId: "arbitrary" as any, args: [], profileId: "offline-minimal", shell: false, timeoutMs: 1 } } as any)).toThrow();
    } finally {
      store.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("blocks deterministic candidate execution outside its declared argument bounds", async () => {
    const root = tempRelease("execution-bounds");
    const store = openRuntimeState({ projectRoot: root });
    try {
      const command = store.acceptCommand({ idempotencyKey: "m16-a1-exec-bound", commandType: "candidate-test", payload: {}, capability: "capability-engine" });
      const attemptId = command.attemptId!;
      store.transitionAttempt({ attemptId, fromState: "PENDING", toState: "RUNNING", actor: "control-plane" });
      const engine = new IsolatedExecutionEngine(store, { projectRoot: root });
      const request: ExecutionRequest = {
        executionId: "execution_m16_a1_outside_bounds",
        attemptId,
        authorizationId: "authorization_m16_a1_outside_bounds",
        executableId: M16_A1_EXECUTABLE_ID,
        args: ["stable-unique-line-sort", "../escape.txt", "out/result.txt", "65536"],
        inputs: [{ id: "source", sourceType: "inline-text", workspacePath: "input/source.txt", content: "b\na" }],
        outputs: [{ id: "result", workspacePath: "out/result.txt", required: true }],
        workingDirectory: ".",
        environmentProfile: "offline-minimal",
        timeoutMs: 5000,
        gracefulCancellationMs: 100,
        maxStdoutBytes: 1024,
        maxStderrBytes: 1024,
        maxCombinedOutputBytes: 2048,
        expectedExitCodes: [0],
        networkPolicy: "offline-strict",
        cleanupPolicy: "delete-workspace",
        correlation: {}
      };
      const blocked = await engine.execute(
        request,
        createExecutionAuthorization({
          request,
          requiredGateRefs: ["candidate-test"],
          completedGateRefs: ["candidate-test"]
        })
      );
      expect(blocked.ok).toBe(false);
      expect(blocked.status).toBe("BLOCKED");
      expect(blocked.outputs).toEqual([]);
    } finally {
      store.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
