const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const root = process.cwd();

const registryPath = path.join(
  root,
  "architecture",
  "runtime-capability-registry-v1.json"
);

const contractPath = path.join(
  root,
  "packages",
  "contracts",
  "src",
  "runtime-capability-contract.ts"
);

const architecturePath = path.join(
  root,
  "docs",
  "architecture",
  "RUNTIME_CAPABILITY_COMPOSITION_V1.md"
);

const claimRegistryPath = path.join(root, "architecture", "capability-claim-proof-registry-v1.json");
const groundedQueryEvidencePath = path.join(root, "evidence", "milestone-5", "grounded-query-canonical.json");
const ollamaIdentityEvidencePath = path.join(root, "evidence", "milestone-5", "ollama-model-identity.json");
const ollamaFailureEvidencePath = path.join(root, "evidence", "milestone-5", "ollama-expired-authorization-proof.json");
const knowledgeIntakeEvidencePath = path.join(root, "evidence", "milestone-5", "knowledge-intake-real-resource-proof.json");

const compositionModule = path.join(
  root,
  "packages",
  "runtime-capability-composition",
  "dist",
  "index.js"
);

const gatewayModule = path.join(
  root,
  "packages",
  "operator-gateway",
  "dist",
  "index.js"
);

const executionModule = path.join(
  root,
  "packages",
  "execution-engine",
  "dist",
  "index.js"
);

const runtimeStateModule = path.join(
  root,
  "packages",
  "runtime-state",
  "dist",
  "index.js"
);

const evidenceDir = path.join(
  root,
  "evidence",
  "milestone-5",
  "latest"
);

const workRoot = path.join(
  evidenceDir,
  ".work"
);

const checks = [];
const artifacts = {};

function check(id, pass, detail, data = undefined) {
  const row = {
    id,
    pass: Boolean(pass),
    detail
  };

  if (data !== undefined) {
    row.data = data;
  }

  checks.push(row);

  console.log(
    `${pass ? "PASS" : "FAIL"} ${id} -- ${detail}`
  );
}

function id(prefix) {
  return (
    prefix +
    "_" +
    crypto.randomBytes(12).toString("hex")
  );
}

function sha256Buffer(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(
    fs.readFileSync(filePath)
  );
}

function expectedNormalizedText(input) {
  const normalizedNewlines = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = normalizedNewlines
    .split("\n")
    .map(
      line =>
        line.replace(/[ \t]+$/g, "")
    );

  while (
    lines.length > 0 &&
    lines[lines.length - 1] === ""
  ) {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${label} missing: ${filePath}`
    );
  }
}

async function main() {
  fs.rmSync(
    evidenceDir,
    {
      recursive: true,
      force: true
    }
  );

  fs.mkdirSync(
    evidenceDir,
    {
      recursive: true
    }
  );

  fs.mkdirSync(
    workRoot,
    {
      recursive: true
    }
  );

  // =========================================================
  // M5-01 — CANONICAL TYPED CAPABILITY CONTRACT
  // =========================================================

  requireFile(
    contractPath,
    "Runtime capability contract"
  );

  const contract =
    fs.readFileSync(
      contractPath,
      "utf8"
    );

  const contractPresent =
    contract.includes(
      "RuntimeCapabilityDefinition"
    ) &&
    contract.includes(
      "RuntimeCapabilityProofContract"
    ) &&
    contract.includes(
      "RuntimeResourceTypeClaim"
    ) &&
    contract.includes(
      "selfAuthorizationAllowed: false"
    ) &&
    contract.includes(
      "requiresRealResource"
    );

  check(
    "M5-01",
    contractPresent,
    contractPresent
      ? "canonical typed runtime capability contract present"
      : "runtime capability contract incomplete"
  );

  // =========================================================
  // M5-02 — CANONICAL RUNTIME CAPABILITY REGISTRY
  // =========================================================

  requireFile(
    registryPath,
    "Runtime capability registry"
  );

  requireFile(
    architecturePath,
    "Runtime capability architecture standard"
  );

  const registry =
    JSON.parse(
      fs.readFileSync(
        registryPath,
        "utf8"
      )
    );

  const architecture =
    fs.readFileSync(
      architecturePath,
      "utf8"
    );

  const requiredCapabilities = [
    "planner",
    "worker",
    "tool",
    "local-model",
    "knowledge-intake",
    "memory",
    "capability-engine"
  ];

  const capabilities =
    Array.isArray(registry.capabilities)
      ? registry.capabilities
      : [];

  const ids =
    new Set(
      capabilities.map(
        capability =>
          capability.capabilityId
      )
    );

  const requiredPresent =
    requiredCapabilities.every(
      capabilityId =>
        ids.has(capabilityId)
    );

  const authorityValid =
    capabilities.every(
      capability =>
        capability.authority &&
        capability.authority
          .selfAuthorizationAllowed === false &&
        typeof capability.authority
          .requestAuthority === "string" &&
        typeof capability.authority
          .executionAuthority === "string" &&
        typeof capability.authority
          .stateAuthority === "string" &&
        typeof capability.authority
          .evidenceAuthority === "string"
    );

  const resourcesBounded =
    capabilities.every(
      capability =>
        Array.isArray(
          capability.resourceTypes
        ) &&
        capability.resourceTypes.length > 0 &&
        capability.resourceTypes.every(
          resource =>
            typeof resource.id === "string" &&
            resource.requiresRealResource ===
              true &&
            [
              "required",
              "certified"
            ].includes(
              resource.proofState
            )
        )
    );

  const realResourceRulePresent =
    registry.realResourceProofRule &&
    registry.realResourceProofRule
      .requiredForExternalCapabilityClaims ===
      true &&
    registry.realResourceProofRule
      .syntheticFixtureCanCertifyFormatClaim ===
      false;

  const semanticSeparation =
    architecture.includes(
      "capability-inventory.json"
    ) &&
    architecture.includes(
      "capability-claim-proof-registry-v1.json"
    ) &&
    architecture.includes(
      "runtime-capability-registry-v1.json"
    );

  const registryValid =
    registry.schemaVersion ===
      "sera.runtime-capability-registry.v1" &&
    registry.milestone === 5 &&
    requiredPresent &&
    authorityValid &&
    resourcesBounded &&
    realResourceRulePresent &&
    semanticSeparation;

  check(
    "M5-02",
    registryValid,
    registryValid
      ? "canonical runtime registry identifies bounded capability, authority, resource, proof, and limitation state"
      : "runtime capability registry contract incomplete"
  );

  // =========================================================
  // LOAD REAL COMPILED PRODUCT COMPONENTS
  // =========================================================

  for (const [filePath, label] of [
    [
      compositionModule,
      "Runtime capability composition module"
    ],
    [
      gatewayModule,
      "Operator Gateway module"
    ],
    [
      executionModule,
      "Execution Engine module"
    ],
    [
      runtimeStateModule,
      "Runtime State module"
    ]
  ]) {
    requireFile(
      filePath,
      label
    );
  }

  const {
    RuntimeCapabilityComposition
  } = require(compositionModule);

  const {
    ProductControlPlane
  } = require(gatewayModule);

  const {
    IsolatedExecutionEngine,
    createExecutionAuthorization
  } = require(executionModule);

  const {
    openRuntimeState
  } = require(runtimeStateModule);

  const stateRoot =
    path.join(
      workRoot,
      "runtime-state"
    );

  const executionEvidenceRoot =
    path.join(
      workRoot,
      "execution-evidence"
    );

  const store =
    openRuntimeState({
      projectRoot: root,
      stateRoot,
      installationId:
        "installation_m5_composition_proof",
      runtimeInstanceId:
        id("runtime_m5")
    });

  try {
    const engine =
      new IsolatedExecutionEngine(
        store,
        {
          projectRoot: root,
          evidenceRoot:
            executionEvidenceRoot
        }
      );

    const productPlane =
      new ProductControlPlane(
        store,
        engine
      );

    const composition =
      new RuntimeCapabilityComposition(
        productPlane
      );

    // =======================================================
    // M5-03 — PLANNER COMPOSITION
    //
    // Real durable ProductControlPlane command.
    // Planner must NOT use execution.
    // =======================================================

    const plannerInput = {
      idempotencyKey:
        id("m5_planner_task"),
      capability:
        "planner",
      prompt:
        "Normalize docs/BUILD_VALIDATION.md using governed runtime composition.",
      payload: {
        source:
          "docs/BUILD_VALIDATION.md",
        requestedCapability:
          "text-normalizer-v1"
      }
    };

    const plannerResult =
      composition.planner.createTask(
        plannerInput
      );

    const plannerAttemptId =
      plannerResult.command.attemptId;

    const persistedPlannerAttempt =
      plannerAttemptId
        ? productPlane.recoveryGet(
            "SELECT attempt_id, command_id, capability, current_state FROM attempts WHERE attempt_id = ?",
            [plannerAttemptId]
          )
        : undefined;

    const persistedPlannerCommand =
      plannerResult.command.commandId
        ? productPlane.recoveryGet(
            "SELECT command_id, command_type, attempt_id, status FROM commands WHERE command_id = ?",
            [
              plannerResult.command
                .commandId
            ]
          )
        : undefined;

    const plannerExecutions =
      plannerAttemptId
        ? productPlane.recoveryGet(
            "SELECT COUNT(*) AS count FROM executions WHERE attempt_id = ?",
            [plannerAttemptId]
          )
        : undefined;

    const plannerPass =
      Boolean(
        plannerResult.command.ok &&
        plannerAttemptId &&
        persistedPlannerAttempt &&
        persistedPlannerCommand &&
        persistedPlannerAttempt
          .capability === "planner" &&
        persistedPlannerCommand
          .command_type ===
          "planner.create-task" &&
        plannerResult.executionUsed ===
          false &&
        Number(
          plannerExecutions?.count ?? -1
        ) === 0
      );

    check(
      "M5-03",
      plannerPass,
      plannerPass
        ? "real planner request persisted durably through ProductControlPlane/Runtime State and performed no execution"
        : "planner composition did not satisfy durable control-plane-only contract",
      {
        plannerResult,
        persistedPlannerAttempt,
        persistedPlannerCommand,
        executionCount:
          Number(
            plannerExecutions?.count ?? -1
          )
      }
    );

    artifacts.planner = {
      input:
        plannerInput,
      result:
        plannerResult,
      persistedAttempt:
        persistedPlannerAttempt,
      persistedCommand:
        persistedPlannerCommand,
      executionCount:
        Number(
          plannerExecutions?.count ?? -1
        )
    };

    // =======================================================
    // REAL RESOURCE SHARED BY M5-04 + M5-05
    // =======================================================

    const realSource =
      path.join(
        root,
        "docs",
        "BUILD_VALIDATION.md"
      );

    requireFile(
      realSource,
      "Real M5 proof resource"
    );

    const sourceText =
      fs.readFileSync(
        realSource,
        "utf8"
      );

    const sourceHashBefore =
      sha256File(
        realSource
      );

    const expectedText =
      expectedNormalizedText(
        sourceText
      );

    const expectedHash =
      sha256Buffer(
        Buffer.from(
          expectedText,
          "utf8"
        )
      );

    function createAttempt(
      capability,
      suffix
    ) {
      const command =
        productPlane.acceptCommand({
          idempotencyKey:
            id(
              `m5_${suffix}`
            ),
          commandType:
            `milestone-5.${suffix}`,
          payload: {
            realResource:
              "docs/BUILD_VALIDATION.md",
            executable:
              "text-normalizer-v1"
          },
          capability
        });

      if (!command.attemptId) {
        throw new Error(
          `${suffix} did not receive an attemptId.`
        );
      }

      productPlane.transitionAttempt({
        attemptId:
          command.attemptId,
        fromState:
          "PENDING",
        toState:
          "RUNNING",
        actor:
          "milestone-5-proof",
        reason:
          `${suffix} real-resource proof`
      });

      return command;
    }

    function createRequest(
      attemptId,
      suffix
    ) {
      return {
        executionId:
          id(
            `execution_${suffix}`
          ),

        attemptId,

        authorizationId:
          id(
            `authorization_${suffix}`
          ),

        executableId:
          "text-normalizer-v1",

        args: [
          "input/source.md",
          "out/normalized.md"
        ],

        inputs: [
          {
            id:
              "source",
            sourceType:
              "copy-file",
            source:
              realSource,
            workspacePath:
              "input/source.md"
          }
        ],

        outputs: [
          {
            id:
              "normalized",
            workspacePath:
              "out/normalized.md",
            required:
              true
          }
        ],

        workingDirectory:
          ".",

        environmentProfile:
          "offline-minimal",

        timeoutMs:
          10000,

        gracefulCancellationMs:
          100,

        maxStdoutBytes:
          65536,

        maxStderrBytes:
          65536,

        maxCombinedOutputBytes:
          98304,

        expectedExitCodes: [
          0
        ],

        networkPolicy:
          "offline-strict",

        cleanupPolicy:
          "delete-workspace",

        correlation: {
          milestone: 5,
          suffix,
          resource:
            "docs/BUILD_VALIDATION.md"
        }
      };
    }

    function inspectSuccessfulExecution(
      request,
      governedResult
    ) {
      const result =
        governedResult.result;

      const output =
        result.outputs.find(
          item =>
            item.id ===
            "normalized"
        );

      const evidencePath =
        output?.evidenceReference
          ? path.join(
              result.evidenceRoot,
              output.evidenceReference
            )
          : undefined;

      const actualText =
        evidencePath &&
        fs.existsSync(evidencePath)
          ? fs.readFileSync(
              evidencePath,
              "utf8"
            )
          : undefined;

      const actualHash =
        actualText !== undefined
          ? sha256Buffer(
              Buffer.from(
                actualText,
                "utf8"
              )
            )
          : undefined;

      const executionRow =
        productPlane.recoveryGet(
          "SELECT execution_id, attempt_id, authorization_id, executable_id, state, process_exit_code, evidence_root FROM executions WHERE execution_id = ?",
          [request.executionId]
        );

      const authorizationRow =
        productPlane.recoveryGet(
          "SELECT authorization_id, execution_id, attempt_id, executable_id, request_hash, integrity_hash FROM execution_authorizations WHERE authorization_id = ?",
          [request.authorizationId]
        );

      const outputRow =
        productPlane.recoveryGet(
          "SELECT execution_id, declared_output_identity, workspace_path, hash, size, status, evidence_reference FROM execution_outputs WHERE execution_id = ? AND declared_output_identity = ?",
          [
            request.executionId,
            "normalized"
          ]
        );

      return {
        pass:
          Boolean(
            result.ok &&
            result.status ===
              "SUCCEEDED_PROCESS" &&
            result.workspaceOutsideRepository &&
            result.cleanup.cleaned &&
            result.sourceNotMutated &&
            result.modelUse === false &&
            result.networkUse === false &&
            output &&
            output.status ===
              "harvested" &&
            actualText ===
              expectedText &&
            actualHash ===
              expectedHash &&
            sourceHashBefore ===
              sha256File(
                realSource
              ) &&
            executionRow &&
            authorizationRow &&
            outputRow
          ),

        result,
        output,
        evidencePath,
        actualHash,
        executionRow,
        authorizationRow,
        outputRow
      };
    }

    // =======================================================
    // M5-04 — WORKER COMPOSITION
    //
    // This certifies the canonical WORKER COMPOSITION BOUNDARY:
    // a real resource crossed GovernedWorkerComposition and
    // ExecutionAuthority. It does NOT claim every historical
    // DeveloperWorker behavior is certified yet.
    // =======================================================

    const workerCommand =
      createAttempt(
        "worker",
        "worker-real-resource"
      );

    const workerRequest =
      createRequest(
        workerCommand.attemptId,
        "worker"
      );

    const workerGoverned =
      await composition.worker.run(
        workerRequest
      );

    const workerInspection =
      inspectSuccessfulExecution(
        workerRequest,
        workerGoverned
      );

    const workerEvidenceId =
      productPlane.recordEvidenceReference({
        attemptId:
          workerCommand.attemptId,
        evidenceType:
          "m5-worker-real-resource",
        location:
          workerGoverned.result
            .evidenceRoot,
        integrityHash:
          workerInspection.actualHash ??
          "missing",
        producer:
          "milestone-5-proof",
        metadata: {
          source:
            "docs/BUILD_VALIDATION.md",
          expectedHash,
          actualHash:
            workerInspection.actualHash ??
            null,
          executableId:
            workerRequest.executableId
        }
      });

    productPlane.recordGateOutcome({
      attemptId:
        workerCommand.attemptId,
      gateName:
        "m5-worker-real-resource",
      required:
        true,
      outcome:
        workerInspection.pass
          ? "PASS"
          : "FAIL",
      evidenceReferences: [
        workerEvidenceId
      ],
      message:
        workerInspection.pass
          ? "Worker composition real-resource proof passed."
          : "Worker composition real-resource proof failed.",
      evaluator:
        "milestone-5-proof"
    });

    check(
      "M5-04",
      workerInspection.pass,
      workerInspection.pass
        ? "real BUILD_VALIDATION.md resource traversed GovernedWorkerComposition -> ProductControlPlane -> ExecutionAuthority -> text-normalizer-v1 with exact expected output and retained Runtime State evidence"
        : "worker composition real-resource proof failed",
      {
        source:
          realSource,
        sourceHashBefore,
        expectedHash,
        actualHash:
          workerInspection.actualHash,
        execution:
          workerInspection.executionRow,
        authorization:
          workerInspection.authorizationRow,
        output:
          workerInspection.outputRow,
        evidenceReferenceId:
          workerEvidenceId
      }
    );

    artifacts.worker = {
      request:
        workerRequest,
      source:
        realSource,
      sourceHashBefore,
      expectedHash,
      actualHash:
        workerInspection.actualHash,
      result:
        workerGoverned.result,
      persistedExecution:
        workerInspection.executionRow,
      persistedAuthorization:
        workerInspection.authorizationRow,
      persistedOutput:
        workerInspection.outputRow,
      evidenceReferenceId:
        workerEvidenceId
    };

    // =======================================================
    // M5-05 — TOOL COMPOSITION + ADVERSARIAL AUTHORITY
    // =======================================================

    const toolCommand =
      createAttempt(
        "tool",
        "tool-real-resource"
      );

    const toolRequest =
      createRequest(
        toolCommand.attemptId,
        "tool"
      );

    const toolGoverned =
      await composition.tool.run(
        toolRequest
      );

    const toolInspection =
      inspectSuccessfulExecution(
        toolRequest,
        toolGoverned
      );

    const noAuthRequest =
      createRequest(
        toolCommand.attemptId,
        "no-auth"
      );

    const noAuthResult =
      await engine.execute(
        noAuthRequest
      );

    const tamperedBase =
      createRequest(
        toolCommand.attemptId,
        "request-tamper"
      );

    const tamperedBaseAuth =
      createExecutionAuthorization({
        request:
          tamperedBase,
        requiredGateRefs: [
          "runtime-capability-composition-gate"
        ],
        completedGateRefs: [
          "runtime-capability-composition-gate"
        ]
      });

    const tamperedRequest = {
      ...tamperedBase,
      timeoutMs:
        tamperedBase.timeoutMs + 1
    };

    const tamperedResult =
      await engine.execute(
        tamperedRequest,
        tamperedBaseAuth
      );

    const incompleteGateRequest =
      createRequest(
        toolCommand.attemptId,
        "incomplete-gate"
      );

    const incompleteGateAuth =
      createExecutionAuthorization({
        request:
          incompleteGateRequest,
        requiredGateRefs: [
          "runtime-capability-composition-gate"
        ],
        completedGateRefs: []
      });

    const incompleteGateResult =
      await engine.execute(
        incompleteGateRequest,
        incompleteGateAuth
      );

    const integrityRequest =
      createRequest(
        toolCommand.attemptId,
        "authorization-integrity"
      );

    const validIntegrityAuth =
      createExecutionAuthorization({
        request:
          integrityRequest,
        requiredGateRefs: [
          "runtime-capability-composition-gate"
        ],
        completedGateRefs: [
          "runtime-capability-composition-gate"
        ]
      });

    const corruptedIntegrityAuth = {
      ...validIntegrityAuth,
      integrityHash:
        "0".repeat(64)
    };

    const integrityResult =
      await engine.execute(
        integrityRequest,
        corruptedIntegrityAuth
      );

    const adversarial = {
      missingAuthorization: {
        blocked:
          noAuthResult.status ===
          "BLOCKED",
        processLaunched:
          Boolean(
            noAuthResult.process
          )
      },

      requestMutation: {
        blocked:
          tamperedResult.status ===
          "BLOCKED",
        processLaunched:
          Boolean(
            tamperedResult.process
          )
      },

      incompleteGate: {
        blocked:
          incompleteGateResult.status ===
          "BLOCKED",
        processLaunched:
          Boolean(
            incompleteGateResult.process
          )
      },

      corruptedAuthorizationIntegrity: {
        blocked:
          integrityResult.status ===
          "BLOCKED",
        processLaunched:
          Boolean(
            integrityResult.process
          )
      }
    };

    const adversarialPass =
      Object.values(
        adversarial
      ).every(
        row =>
          row.blocked === true &&
          row.processLaunched === false
      );

    const toolPass =
      Boolean(
        toolInspection.pass &&
        adversarialPass
      );

    const toolEvidenceId =
      productPlane.recordEvidenceReference({
        attemptId:
          toolCommand.attemptId,
        evidenceType:
          "m5-tool-real-resource",
        location:
          toolGoverned.result
            .evidenceRoot,
        integrityHash:
          toolInspection.actualHash ??
          "missing",
        producer:
          "milestone-5-proof",
        metadata: {
          source:
            "docs/BUILD_VALIDATION.md",
          expectedHash,
          actualHash:
            toolInspection.actualHash ??
            null,
          executableId:
            toolRequest.executableId,
          adversarial
        }
      });

    productPlane.recordGateOutcome({
      attemptId:
        toolCommand.attemptId,
      gateName:
        "m5-tool-real-resource-and-authority",
      required:
        true,
      outcome:
        toolPass
          ? "PASS"
          : "FAIL",
      evidenceReferences: [
        toolEvidenceId
      ],
      message:
        toolPass
          ? "Tool composition and adversarial authority proof passed."
          : "Tool composition or adversarial authority proof failed.",
      evaluator:
        "milestone-5-proof"
    });

    check(
      "M5-05",
      toolPass,
      toolPass
        ? "real BUILD_VALIDATION.md resource traversed GovernedToolComposition with exact output; missing/tampered authorization cases were blocked before process launch"
        : "tool composition or adversarial authority proof failed",
      {
        source:
          realSource,
        expectedHash,
        actualHash:
          toolInspection.actualHash,
        execution:
          toolInspection.executionRow,
        authorization:
          toolInspection.authorizationRow,
        output:
          toolInspection.outputRow,
        adversarial,
        evidenceReferenceId:
          toolEvidenceId
      }
    );

    artifacts.tool = {
      request:
        toolRequest,
      source:
        realSource,
      expectedHash,
      actualHash:
        toolInspection.actualHash,
      result:
        toolGoverned.result,
      persistedExecution:
        toolInspection.executionRow,
      persistedAuthorization:
        toolInspection.authorizationRow,
      persistedOutput:
        toolInspection.outputRow,
      adversarial,
      evidenceReferenceId:
        toolEvidenceId
    };

    artifacts.runtimeState = {
      databasePath:
        store.inspect().databasePath,
      plannerAttempt:
        persistedPlannerAttempt,
      workerAttempt:
        productPlane.recoveryGet(
          "SELECT attempt_id, capability, current_state FROM attempts WHERE attempt_id = ?",
          [workerCommand.attemptId]
        ),
      toolAttempt:
        productPlane.recoveryGet(
          "SELECT attempt_id, capability, current_state FROM attempts WHERE attempt_id = ?",
          [toolCommand.attemptId]
        )
    };
  }
  finally {
    store.close();
  }

  // =========================================================
  // M5-06 — LOCAL MODEL RUNTIME
  // =========================================================

  for (const [filePath, label] of [
    [claimRegistryPath, "Capability claim/proof registry"],
    [groundedQueryEvidencePath, "Governed grounded-query evidence"],
    [ollamaIdentityEvidencePath, "Ollama model identity evidence"],
    [ollamaFailureEvidencePath, "Expired-authorization failure evidence"]
  ]) {
    requireFile(filePath, label);
  }

  const claimRegistry = JSON.parse(fs.readFileSync(claimRegistryPath, "utf8"));
  const groundedQuery = JSON.parse(fs.readFileSync(groundedQueryEvidencePath, "utf8"));
  const ollamaIdentity = JSON.parse(fs.readFileSync(ollamaIdentityEvidencePath, "utf8"));
  const ollamaFailure = JSON.parse(fs.readFileSync(ollamaFailureEvidencePath, "utf8"));
  const localModelCapability = capabilities.find(capability => capability.capabilityId === "local-model");
  const localOllamaClaim = claimRegistry.claims.find(claim => claim.claimId === "real-local-ollama-candidate");
  const serializedGroundedQuery = JSON.stringify(groundedQuery);

  const localModelPass = Boolean(
    architecture.includes("M5-06 certifies Local Model Runtime (`local-model`)") &&
    localModelCapability &&
    localModelCapability.compositionState === "certified" &&
    localModelCapability.authority.requestAuthority === "unified-control-plane" &&
    localModelCapability.authority.selfAuthorizationAllowed === false &&
    localModelCapability.resourceTypes.some(resource =>
      resource.id === "installed-local-model" && resource.proofState === "certified"
    ) &&
    localOllamaClaim &&
    ["ollama-tags", "model-digest", "local-model-runtime-invocation"].every(required =>
      localOllamaClaim.proofRequired.includes(required)
    ) &&
    ollamaIdentity.schemaVersion === "sera.m5.local-model-identity.v1" &&
    ollamaIdentity.providerId === "ollama-loopback-local" &&
    ollamaIdentity.modelId === groundedQuery.model.modelId &&
    /^[a-f0-9]{64}$/.test(String(ollamaIdentity.digest)) &&
    ollamaIdentity.localLoopbackUse === true &&
    ollamaIdentity.publicNetworkUse === false &&
    groundedQuery.ok === true &&
    groundedQuery.status === "ANSWERED" &&
    groundedQuery.prompt === "Who is the primary contact for Project Orion?" &&
    groundedQuery.answer === "Maya Chen" &&
    groundedQuery.sources.length > 0 &&
    groundedQuery.sources.every(source =>
      source.candidateStatus === "candidate" &&
      /^[a-f0-9]{64}$/.test(String(source.provenance.contentHash)) &&
      String(source.provenance.sourceReference).startsWith("<REPOSITORY_ROOT>/")
    ) &&
    groundedQuery.model.providerId === "ollama-loopback-local" &&
    /^[a-f0-9]{64}$/.test(String(groundedQuery.model.responseHash)) &&
    String(groundedQuery.model.evidenceRoot).startsWith("<REPOSITORY_ROOT>/.sera/model-runtime/") &&
    groundedQuery.model.candidateIntelligence === true &&
    groundedQuery.model.localLoopbackUse === true &&
    groundedQuery.model.publicNetworkUse === false &&
    !/[A-Za-z]:\\\\Users\\\\/i.test(serializedGroundedQuery) &&
    ollamaFailure.success === true &&
    ollamaFailure.numPassedTests === 1 &&
    ollamaFailure.numFailedTests === 0
  );

  check(
    "M5-06",
    localModelPass,
    localModelPass
      ? "installed Ollama model identity and digest, governed candidate-only invocation, durable hashed evidence, loopback-only boundary, and pre-provider expired-authorization block certified"
      : "local-model certification evidence or authority boundary incomplete",
    {
      modelId: ollamaIdentity.modelId,
      modelDigest: ollamaIdentity.digest,
      invocationId: groundedQuery.model.invocationId,
      responseHash: groundedQuery.model.responseHash,
      failureProof: {
        success: ollamaFailure.success,
        passed: ollamaFailure.numPassedTests,
        failed: ollamaFailure.numFailedTests
      }
    }
  );

  artifacts.localModel = {
    groundedQuery: path.relative(root, groundedQueryEvidencePath),
    modelIdentity: path.relative(root, ollamaIdentityEvidencePath),
    expiredAuthorization: path.relative(root, ollamaFailureEvidencePath)
  };

  // =========================================================
  // M5-07 — KNOWLEDGE AND UNIVERSAL INTAKE RUNTIME
  // =========================================================

  requireFile(knowledgeIntakeEvidencePath, "Knowledge intake real-resource evidence");
  const knowledgeEvidence = JSON.parse(fs.readFileSync(knowledgeIntakeEvidencePath, "utf8"));
  const knowledgeCapability = capabilities.find(capability => capability.capabilityId === "knowledge-intake");
  const expectedResources = new Map([
    ["local-text-file", ["INDEXED"]],
    ["local-directory", ["INDEXED", "OPAQUE_PRESERVED"]],
    ["predownloaded-snapshot", ["INDEXED", "OPAQUE_PRESERVED"]],
    ["opaque-media", ["OPAQUE_PRESERVED"]],
    ["archive", ["OPAQUE_PRESERVED"]],
    ["url-reference", ["INDEXED", "OPAQUE_PRESERVED"]]
  ]);
  const resultByLabel = new Map((knowledgeEvidence.results ?? []).map(result => [result.label, result]));
  const knowledgeSerialized = JSON.stringify(knowledgeEvidence);
  const resourceEvidencePass = [...expectedResources].every(([label, statuses]) => {
    const result = resultByLabel.get(label);
    return Boolean(
      result &&
      statuses.includes(result.actualStatus) &&
      Array.isArray(result.contentHashes) &&
      result.contentHashes.length > 0 &&
      result.contentHashes.every(value => /^[a-f0-9]{64}$/.test(String(value))) &&
      result.candidateStatus === "candidate" &&
      result.publicNetworkUse === false &&
      result.modelUse === false &&
      result.durableEvidenceCreated === true
    );
  });
  const knowledgeAssertions = knowledgeEvidence.assertions ?? {};
  const knowledgePass = Boolean(
    architecture.includes("M5-07 certifies Knowledge and Universal Intake Runtime (`knowledge-intake`)") &&
    knowledgeCapability &&
    knowledgeCapability.compositionState === "certified" &&
    knowledgeCapability.authority.requestAuthority === "unified-control-plane" &&
    knowledgeCapability.authority.stateAuthority === "runtime-state" &&
    knowledgeCapability.authority.evidenceAuthority === "runtime-state" &&
    knowledgeCapability.authority.selfAuthorizationAllowed === false &&
    knowledgeCapability.resourceTypes.length === expectedResources.size &&
    knowledgeCapability.resourceTypes.every(resource => expectedResources.has(resource.id) && resource.proofState === "certified") &&
    knowledgeEvidence.schemaVersion === "sera.m5.knowledge-intake-real-resource-proof.v1" &&
    knowledgeEvidence.gateId === "M5-07" &&
    knowledgeEvidence.capabilityId === "knowledge-intake" &&
    resourceEvidencePass &&
    Object.values(knowledgeAssertions).every(Boolean) &&
    knowledgeEvidence.failurePath?.actualStatus === "BLOCKED" &&
    knowledgeEvidence.failurePath?.contactedPublicNetwork === false &&
    knowledgeEvidence.failurePath?.modelUse === false &&
    knowledgeEvidence.authority?.requestAuthority === "unified-control-plane" &&
    knowledgeEvidence.authority?.stateAuthority === "runtime-state" &&
    knowledgeEvidence.authority?.evidenceAuthority === "runtime-state" &&
    knowledgeEvidence.authority?.selfAuthorizationAllowed === false &&
    /^[a-f0-9]{64}$/.test(String(knowledgeEvidence.evidenceDigest)) &&
    knowledgeEvidence.portablePathsOnly === true &&
    knowledgeEvidence.cleanCloseout === true &&
    !/[A-Za-z]:\\\\Users\\\\/i.test(knowledgeSerialized)
  );

  check(
    "M5-07",
    knowledgePass,
    knowledgePass
      ? "real local text, directory, predownloaded snapshot, opaque media, archive, and no-fetch URL reference traversed governed Knowledge Runtime with hashes, candidate state, failure proof, and clean closeout"
      : "knowledge-intake real-resource certification evidence or authority boundary incomplete",
    {
      resourceCount: resultByLabel.size,
      resourceStatuses: Object.fromEntries([...resultByLabel].map(([label, result]) => [label, result.actualStatus])),
      failureStatus: knowledgeEvidence.failurePath?.actualStatus
    }
  );

  artifacts.knowledgeIntake = {
    realResourceProof: path.relative(root, knowledgeIntakeEvidencePath)
  };

  // =========================================================
  // FINAL REPORT
  // =========================================================

  const passCount =
    checks.filter(
      row => row.pass
    ).length;

  const report = {
    schemaVersion:
      "sera.milestone-proof.v1",

    milestone: 5,

    scope:
      "M5-01-M5-06",

    passCount,

    totalCount:
      checks.length,

    checks,

    artifacts,

    remainingMilestoneGates: [
      "M5-08",
      "M5-09",
      "M5-10",
      "M5-11",
      "M5-12"
    ]
  };

  fs.writeFileSync(
    path.join(
      evidenceDir,
      "proof-report.json"
    ),
    JSON.stringify(
      report,
      null,
      2
    ) + "\n",
    "utf8"
  );

  const complete =
    checks.length === 7 &&
    passCount === 7;

  console.log("");

  console.log(
    complete
      ? "MILESTONE_5_BATCH_2_PASS"
      : `MILESTONE_5_BATCH_2_FAIL ${passCount}/7`
  );

  console.log(
    `M5 OVERALL: ${passCount}/12 certified`
  );

  process.exitCode =
    complete ? 0 : 1;
}

main().catch(error => {
  console.error(
    error instanceof Error
      ? error.stack ?? error.message
      : String(error)
  );

  process.exitCode = 1;
});
