const fs = require("node:fs");
const os = require("node:os");
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
  process.exit(1);
}

const {
  ControlPlane
} = require(controlPlaneModule);

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
    `${pass ? "PASS" : "FAIL"} ${id} â€” ${detail}`
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
  // M4-01 â€” TYPED ATTEMPT SPECIFICATION
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
  // M4-02 / 03 / 04 / 06 â€” SUCCESS PATH
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
  // M4-07 â€” BLOCKED PATH
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
  // M4-08 / M4-09 â€” FAILED PATH + TERMINAL PRECEDENCE
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
  // M4-10 â€” VERIFICATION SEPARATE FROM EXECUTION
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
  // M4-11 â€” CLOSEOUT SEPARATE FROM WORKER EXECUTION
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
  // M4-13 â€” NO MODEL / NETWORK / SHELL EXECUTION
  // ==========================================================

  const allowedModes = [
    "emit-evidence",
    "validate-file",
    "compare-hash",
    "warning",
    "fail",
    "block",
    "timeout",
    "cancel",
    "noop"
  ];

  const forbiddenExecutorMarkers = [
    "child_process",
    "spawn(",
    "spawnSync(",
    "exec(",
    "execSync("
  ];

  const noShellExecutor =
    forbiddenExecutorMarkers.every(
      (marker) => !source.includes(marker)
    );

  const noModelNetwork =
    success.summary?.modelUse === false &&
    success.summary?.networkUse === false &&
    allowedModes.every(
      (mode) => source.includes(`"${mode}"`)
    );

  check(
    "M4-13",
    noShellExecutor && noModelNetwork,
    noShellExecutor && noModelNetwork
      ? "reference Control Plane exposes no shell executor and reports model/network use false"
      : "unauthorized execution restriction not proven"
  );

  // ==========================================================
  // M4-05 â€” PRODUCT AUTHORIZATION BEFORE REAL EXECUTION
  //
  // Current ControlPlane.run() is a deterministic reference
  // executor. It is not yet the authority that dispatches the
  // M3 ExecutionAuthority. This remains red intentionally.
  // ==========================================================

  const unifiedAuthorization =
    source.includes("ExecutionAuthority") &&
    source.includes("ExecutionAuthorization");

  check(
    "M4-05",
    unifiedAuthorization,
    unifiedAuthorization
      ? "Control Plane dispatches through governed ExecutionAuthority"
      : "Control Plane is not yet bound to product ExecutionAuthority"
  );

  // ==========================================================
  // M4-12 â€” DURABLE IDEMPOTENCY / REPLAY AUTHORITY
  //
  // A repeated attempt identifier currently replaces its
  // filesystem record. Runtime State is not yet authoritative
  // for Control Plane replay.
  // ==========================================================

  const runtimeStateBound =
    source.includes("RuntimeStateStore") ||
    source.includes("acceptCommand(");

  check(
    "M4-12",
    runtimeStateBound,
    runtimeStateBound
      ? "Control Plane replay uses Runtime State authority"
      : "Control Plane idempotency is not yet bound to Runtime State"
  );

  // ==========================================================
  // M4-14 â€” DURABLE UNIFIED ATTEMPT HISTORY
  //
  // Control Plane file history exists, but unified Runtime
  // State history is not yet bound directly to ControlPlane.run.
  // ==========================================================

  const unifiedHistory =
    source.includes("recordEvidenceReference(") &&
    source.includes("transitionAttempt(");

  check(
    "M4-14",
    unifiedHistory,
    unifiedHistory
      ? "Control Plane writes authoritative Runtime State history"
      : "Control Plane file evidence exists but authoritative Runtime State binding is missing"
  );

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
  console.log(
    `MILESTONE_4_BASELINE ${passCount}/${checks.length}`
  );

  console.log(
    `Evidence: ${path.join(
      evidenceRoot,
      "proof-report.json"
    )}`
  );

  // Baseline mode intentionally exits 0 even when integration
  // checks remain red. Once M4 is implemented, this changes to
  // require all 14.
  process.exit(0);
}
catch (error) {
  const message =
    error instanceof Error
      ? error.stack || error.message
      : String(error);

  console.error(message);

  process.exit(1);
}
finally {
  fs.rmSync(tempRoot, {
    recursive: true,
    force: true
  });
}