const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();

const controlPlaneModule = path.join(
  root,
  "packages",
  "control-plane",
  "dist",
  "control-plane.js"
);

if (!fs.existsSync(controlPlaneModule)) {
  console.error(
    "MILESTONE_4_FAIL: compiled Control Plane is missing."
  );
  process.exitCode = 1;
}

const {
  ControlPlane
} = require(controlPlaneModule);

const productControlPlaneModule = path.join(
  root,
  "packages",
  "operator-gateway",
  "dist",
  "product-control-plane.js"
);

const runtimeStateModule = path.join(
  root,
  "packages",
  "runtime-state",
  "dist",
  "index.js"
);

if (!fs.existsSync(productControlPlaneModule)) {
  console.error(
    "MILESTONE_4_FAIL: compiled Product Control Plane is missing."
  );
  process.exitCode = 1;
}

if (!fs.existsSync(runtimeStateModule)) {
  console.error(
    "MILESTONE_4_FAIL: compiled Runtime State module is missing."
  );
  process.exitCode = 1;
}

const {
  ProductControlPlane
} = require(productControlPlaneModule);

const {
  openRuntimeState
} = require(runtimeStateModule);

const evidenceRoot = path.join(
  root,
  "evidence",
  "milestone-4",
  "latest"
);

fs.rmSync(evidenceRoot, {
  recursive: true,
  force: true
});

fs.mkdirSync(evidenceRoot, {
  recursive: true
});

const tempRoot = path.join(
  evidenceRoot,
  ".work"
);

fs.rmSync(tempRoot, {
  recursive: true,
  force: true
});

fs.mkdirSync(tempRoot, {
  recursive: true
});

const controlRoot = path.join(
  tempRoot,
  "control-plane"
);

const checks = [];
const artifacts = {};

function check(id, pass, detail, data) {
  checks.push({
    id,
    pass: Boolean(pass),
    detail,
    data
  });

  console.log(
    `${pass ? "PASS" : "FAIL"} ${id} -- ${detail}`
  );
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runBuild() {
  if (process.platform === "win32") {
    return spawnSync(
      "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        "npx tsc --build --pretty false"
      ],
      {
        cwd: root,
        encoding: "utf8"
      }
    );
  }

  return spawnSync(
    "npx",
    [
      "tsc",
      "--build",
      "--pretty",
      "false"
    ],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
}

try {
  // ----------------------------------------------------------
  // Build first so the harness tests current source.
  // ----------------------------------------------------------

  const build = runBuild();

  if (build.status !== 0) {
    throw new Error(
      `TypeScript build failed: ${build.stderr || build.stdout}`
    );
  }

  const cp = new ControlPlane({
    repositoryRoot: root,
    outputRoot: controlRoot
  });

  // ==========================================================
  // M4-01 -- TYPED ATTEMPT SPECIFICATION
  // ==========================================================

  const source = fs.readFileSync(
    path.join(
      root,
      "packages",
      "control-plane",
      "src",
      "control-plane.ts"
    ),
    "utf8"
  );

  const typedSpec =
    source.includes(
      "export interface ControlPlaneAttemptSpec"
    ) &&
    source.includes(
      "export interface ControlPlaneStageSpec"
    ) &&
    source.includes(
      "export interface ControlPlaneGateSpec"
    );

  check(
    "M4-01",
    typedSpec,
    typedSpec
      ? "typed attempt, stage, and gate contracts present"
      : "typed Control Plane contract missing"
  );

  // ==========================================================
  // M4-02 / 03 / 04 / 06 -- SUCCESS PATH
  // ==========================================================

  const successSpec = {
    attemptId: "m4_success",
    title: "M4 deterministic successful attempt",
    stages: [
      {
        id: "stage-a",
        executionMode: "emit-evidence",
        required: true,
        evidence: [
          {
            id: "evidence-a",
            required: true
          }
        ],
        input: {
          evidenceId: "evidence-a",
          value: "stage-a-complete"
        }
      },
      {
        id: "stage-b",
        dependsOn: ["stage-a"],
        executionMode: "emit-evidence",
        required: true,
        evidence: [
          {
            id: "evidence-b",
            required: true
          }
        ],
        input: {
          evidenceId: "evidence-b",
          value: "stage-b-complete"
        }
      }
    ],
    gates: [
      {
        id: "verification-gate",
        gateType: "verification",
        required: true,
        evaluationTiming: "after",
        evidenceRequirements: [
          {
            id: "evidence-b",
            required: true
          }
        ],
        passCriteria: {
          kind: "evidence-valid",
          evidenceIds: ["evidence-b"]
        }
      }
    ],
    requiredEvidence: [
      {
        id: "evidence-a",
        required: true
      },
      {
        id: "evidence-b",
        required: true
      }
    ],
    closeoutPolicy: {
      requireOwnerApproval: true,
      ownerApproved: false,
      promotionAllowed: false,
      mergeAllowed: false
    }
  };

  const success = cp.run(successSpec);

  artifacts.success = success;

  const successRoot = path.join(
    controlRoot,
    "attempts",
    "m4_success"
  );

  const successStages = readJson(
    path.join(successRoot, "stage-results.json")
  ).stages;

  const successGates = readJson(
    path.join(successRoot, "gate-results.json")
  ).gates;

  const successEvidence = readJson(
    path.join(successRoot, "evidence-index.json")
  ).evidence;

  const deterministicOrder =
    successStages.length === 2 &&
    successStages[0].stageId === "stage-a" &&
    successStages[1].stageId === "stage-b" &&
    successStages.every(
      (stage) => stage.status === "COMPLETED"
    );

  check(
    "M4-02",
    deterministicOrder,
    deterministicOrder
      ? "stage-a -> stage-b dependency ordering proven"
      : "deterministic stage ordering not proven",
    successStages
  );

  const explicitGate =
    successGates.length === 1 &&
    successGates[0].gateId === "verification-gate" &&
    successGates[0].required === true &&
    successGates[0].status === "PASS";

  check(
    "M4-03",
    explicitGate,
    explicitGate
      ? "required explicit verification gate passed"
      : "required explicit gate did not pass",
    successGates
  );

  const evidenceIds = new Set(
    successEvidence
      .filter((item) => item.valid)
      .map((item) => item.evidenceId)
  );

  const requiredEvidence =
    evidenceIds.has("evidence-a") &&
    evidenceIds.has("evidence-b");

  check(
    "M4-04",
    requiredEvidence,
    requiredEvidence
      ? "required evidence references persisted and valid"
      : "required evidence contract failed",
    successEvidence
  );

  const successPath =
    success.ok === true &&
    success.status === "COMPLETED" &&
    success.terminalDecision === "COMPLETE";

  check(
    "M4-06",
    successPath,
    successPath
      ? "successful attempt reached COMPLETE"
      : `${success.status}/${success.terminalDecision}`,
    success
  );

  // ==========================================================
  // M4-07 -- BLOCKED PATH
  // ==========================================================

  const blocked = cp.run({
    attemptId: "m4_blocked",
    title: "M4 blocked attempt",
    stages: [
      {
        id: "blocked-stage",
        executionMode: "block",
        required: true,
        input: {
          message: "Permission intentionally absent."
        }
      }
    ]
  });

  artifacts.blocked = blocked;

  const blockedAttempt = readJson(
    path.join(
      controlRoot,
      "attempts",
      "m4_blocked",
      "attempt.json"
    )
  );

  const blockedPath =
    blocked.ok === false &&
    blocked.status === "BLOCKED" &&
    blocked.terminalDecision === "BLOCK" &&
    Boolean(blockedAttempt.blockedHandoff);

  check(
    "M4-07",
    blockedPath,
    blockedPath
      ? "required blocked path produced structured blocked handoff"
      : "blocked attempt contract failed",
    blockedAttempt.blockedHandoff
  );

  // ==========================================================
  // M4-08 / M4-09 -- FAILED PATH + TERMINAL PRECEDENCE
  // ==========================================================

  const failed = cp.run({
    attemptId: "m4_failed",
    title: "M4 failed attempt",
    stages: [
      {
        id: "failure",
        executionMode: "fail",
        required: true,
        input: {
          message: "Required stage intentionally failed."
        }
      },
      {
        id: "blocked-after-failure",
        executionMode: "block",
        required: true,
        safeAfterFailure: true
      }
    ]
  });

  artifacts.failed = failed;

  const failedPath =
    failed.ok === false &&
    failed.status === "FAILED" &&
    failed.terminalDecision === "FAIL";

  check(
    "M4-08",
    failedPath,
    failedPath
      ? "required stage failure produced FAIL"
      : `${failed.status}/${failed.terminalDecision}`,
    failed
  );

  const terminalPrecedence =
    failed.terminalDecision === "FAIL";

  check(
    "M4-09",
    terminalPrecedence,
    terminalPrecedence
      ? "FAIL precedence over later BLOCK proven"
      : "terminal precedence not proven"
  );

  // ==========================================================
  // M4-10 -- VERIFICATION SEPARATE FROM EXECUTION
  // ==========================================================

  const verification = cp.verify("m4_success");

  artifacts.verification = verification;

  const separateVerification =
    verification.ok === true &&
    verification.status === "VERIFIED" &&
    verification.execution.commandId
      .endsWith(":verify");

  check(
    "M4-10",
    separateVerification,
    separateVerification
      ? "independent verification operation succeeded"
      : "verification boundary failed",
    verification
  );

  // ==========================================================
  // M4-11 -- CLOSEOUT SEPARATE FROM WORKER EXECUTION
  // ==========================================================

  const preCloseout = readJson(
    path.join(successRoot, "closeout.json")
  );

  const closeout = cp.closeout("m4_success");

  artifacts.closeout = closeout;

  const separateCloseout =
    preCloseout.status === "CLOSEOUT_BLOCKED" &&
    closeout.status === "CLOSEOUT_BLOCKED" &&
    closeout.execution.commandId
      .endsWith(":closeout");

  check(
    "M4-11",
    separateCloseout,
    separateCloseout
      ? "closeout remained separate and owner-gated"
      : "closeout authority separation failed",
    {
      before: preCloseout,
      after: closeout
    }
  );

  // ==========================================================
  // M4-13 -- NO MODEL / NETWORK / SHELL EXECUTION
  // ==========================================================
  // M4-05 / M4-12 / M4-14 -- REAL PRODUCT INTEGRATION
  //
  // This proof exercises ProductControlPlane against an actual
  // RuntimeStateStore. It does not pass from source inspection.
  // ==========================================================

  const productStateRoot = path.join(
    tempRoot,
    "product-runtime-state"
  );

  fs.mkdirSync(productStateRoot, {
    recursive: true
  });

  const productDatabasePath = path.join(
    productStateRoot,
    "sera-operational.db"
  );

  const productStore = openRuntimeState({
    projectRoot: root,
    stateRoot: productStateRoot,
    databasePath: productDatabasePath,
    installationId: "installation_m4_product_proof",
    runtimeInstanceId: "runtime_m4_product_proof"
  });

  const executionSentinel = {
    authorityType: "m4-real-execution-authority-sentinel"
  };

  const productPlane = new ProductControlPlane(
    productStore,
    executionSentinel
  );

  artifacts.productIntegration = {
    databasePath: productDatabasePath
  };

  // ----------------------------------------------------------
  // M4-05 -- Product Control Plane owns the supplied execution
  // authority rather than bypassing or manufacturing authority.
  // ----------------------------------------------------------

  const boundAuthority =
    productPlane.getExecutionAuthority();

  const requiredAuthority =
    productPlane.requireExecutionAuthority();

  const authorityBound =
    boundAuthority === executionSentinel &&
    requiredAuthority === executionSentinel &&
    productPlane.runtimeStateAuthority() === productStore;

  check(
    "M4-05",
    authorityBound,
    authorityBound
      ? "real Product Control Plane is bound to supplied ExecutionAuthority and Runtime State authority"
      : "real Product Control Plane authority binding failed",
    {
      sameExecutionAuthority:
        boundAuthority === executionSentinel,
      sameRequiredAuthority:
        requiredAuthority === executionSentinel,
      sameRuntimeStateAuthority:
        productPlane.runtimeStateAuthority() === productStore
    }
  );

  // ----------------------------------------------------------
  // Create one real durable product command and prove replay.
  // ----------------------------------------------------------

  const productCommandInput = {
    idempotencyKey: "m4-product-idempotency",
    commandType: "m4-product-proof",
    payload: {
      milestone: 4,
      purpose: "runtime-state-integration"
    },
    capability: "unified-control-plane"
  };

  const firstCommand =
    productPlane.acceptCommand(productCommandInput);

  const replayCommand =
    productPlane.acceptCommand(productCommandInput);

  if (!firstCommand.attemptId) {
    throw new Error(
      "M4 product proof did not receive an attemptId."
    );
  }

  const productAttemptId =
    firstCommand.attemptId;

  const idempotentReplay =
    replayCommand.attemptId === productAttemptId;

  check(
    "M4-12",
    idempotentReplay,
    idempotentReplay
      ? "real Product Control Plane replay reused authoritative Runtime State attempt"
      : "real Product Control Plane idempotency replay diverged",
    {
      firstAttemptId: productAttemptId,
      replayAttemptId: replayCommand.attemptId
    }
  );

  // ----------------------------------------------------------
  // M4-14 -- Persist transitions, evidence and gate outcome
  // through ProductControlPlane, then query authoritative state.
  // ----------------------------------------------------------

  productPlane.transitionAttempt({
    attemptId: productAttemptId,
    fromState: "PENDING",
    toState: "RUNNING",
    actor: "control-plane",
    reason: "M4 real product integration proof started."
  });

  const productEvidenceId =
    productPlane.recordEvidenceReference({
      attemptId: productAttemptId,
      evidenceType: "m4-product-proof",
      location: "evidence/milestone-4/latest/proof-report.json",
      integrityHash:
        "m4_product_integration_evidence",
      producer: "milestone-4-proof",
      metadata: {
        milestone: 4,
        behavioral: true
      }
    });

  productPlane.recordGateOutcome({
    attemptId: productAttemptId,
    gateName: "m4-product-integration-gate",
    required: true,
    outcome: "PASS",
    evidenceReferences: [
      productEvidenceId
    ],
    evaluator: "milestone-4-proof",
    message:
      "Product Control Plane Runtime State integration proven."
  });

  productPlane.transitionAttempt({
    attemptId: productAttemptId,
    fromState: "RUNNING",
    toState: "COMPLETED",
    actor: "control-plane",
    reason:
      "M4 real product integration proof completed.",
    correlation: {
      evidenceId: productEvidenceId
    }
  });

  const persistedAttempt =
    productPlane.recoveryGet(
      [
        "SELECT attempt_id, current_state",
        "FROM attempts",
        "WHERE attempt_id = ?"
      ].join(" "),
      [productAttemptId]
    );

  const persistedEvidence =
    productPlane.recoveryGet(
      [
        "SELECT evidence_reference_id, attempt_id",
        "FROM evidence_references",
        "WHERE evidence_reference_id = ?"
      ].join(" "),
      [productEvidenceId]
    );

  const persistedGate =
    productPlane.recoveryGet(
      [
        "SELECT attempt_id, gate_name, outcome",
        "FROM gate_outcomes",
        "WHERE attempt_id = ?",
        "AND gate_name = ?"
      ].join(" "),
      [
        productAttemptId,
        "m4-product-integration-gate"
      ]
    );

  const unifiedHistory =
    persistedAttempt?.attempt_id ===
      productAttemptId &&
    persistedAttempt?.current_state === "COMPLETED" &&
    persistedEvidence?.evidence_reference_id ===
      productEvidenceId &&
    persistedEvidence?.attempt_id ===
      productAttemptId &&
    persistedGate?.attempt_id ===
      productAttemptId &&
    persistedGate?.gate_name ===
      "m4-product-integration-gate" &&
    persistedGate?.outcome === "PASS";

  check(
    "M4-14",
    unifiedHistory,
    unifiedHistory
      ? "real Product Control Plane persisted authoritative attempt, evidence, and gate history"
      : "real Product Control Plane Runtime State history proof failed",
    {
      attempt: persistedAttempt,
      evidence: persistedEvidence,
      gate: persistedGate
    }
  );

  // ==========================================================
  // M4-13 -- SAFETY BOUNDARY
  // ==========================================================

  const referenceSafety =
    typeof cp.shell !== "function" &&
    typeof cp.exec !== "function" &&
    typeof cp.executeShell !== "function" &&
    success.summary?.modelUse === false &&
    success.summary?.networkUse === false;

  check(
    "M4-13",
    referenceSafety,
    referenceSafety
      ? "reference Control Plane exposes no shell executor and reports model/network use false"
      : "reference Control Plane safety boundary failed"
  );
  // ==========================================================
  // PRODUCT PROOF RESOURCE CLOSEOUT
  // ==========================================================

  productStore.close();

  // ==========================================================
  // RESULT
  // ==========================================================

  const passCount = checks.filter(
    (item) => item.pass
  ).length;

  const report = {
    schemaVersion: "sera.milestone-proof.v1",
    milestone: 4,
    title: "Unified Control Plane v1",
    generatedAt: new Date().toISOString(),
    repositoryRoot: root,
    passCount,
    totalCount: checks.length,
    checks,
    artifacts
  };

  fs.writeFileSync(
    path.join(evidenceRoot, "proof-report.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf8"
  );

  console.log("");

  const complete =
    passCount === checks.length &&
    checks.length === 14;

  console.log(
    complete
      ? "MILESTONE_4_PASS"
      : `MILESTONE_4_FAIL ${passCount}/${checks.length}`
  );

  console.log(
    `Evidence: ${path.join(
      evidenceRoot,
      "proof-report.json"
    )}`
  );

  process.exitCode =
    complete ? 0 : 1;
}
catch (error) {
  const message =
    error instanceof Error
      ? error.stack || error.message
      : String(error);

  console.error(message);

  process.exitCode = 1;
}
finally {
  fs.rmSync(tempRoot, {
    recursive: true,
    force: true
  });
}
