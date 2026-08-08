const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");

const root = process.cwd();
const evidenceRoot = path.join(
  root,
  "evidence",
  "milestone-3",
  "latest"
);

fs.rmSync(evidenceRoot, {
  recursive: true,
  force: true
});

fs.mkdirSync(evidenceRoot, {
  recursive: true
});

const checks = [];
const artifacts = {};
const startedAt = new Date().toISOString();

function check(id, pass, detail = "", data = undefined) {
  checks.push({
    id,
    pass: Boolean(pass),
    detail,
    data
  });

  process.stdout.write(
    `${pass ? "PASS" : "FAIL"} ${id}${detail ? ` â€” ${detail}` : ""}\n`
  );
}

function run(command, args = []) {
  const result = childProcess.spawnSync(
    command,
    args,
    {
      cwd: root,
      encoding: "utf8",
      shell: false
    }
  );

  return {
    command: [command, ...args],
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function findDatabases(dir) {
  if (!fs.existsSync(dir)) return [];

  const results = [];

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findDatabases(absolute));
    }
    else if (
      entry.isFile() &&
      entry.name === "sera-operational.db"
    ) {
      results.push(absolute);
    }
  }

  return results;
}

function inspectDatabase(databasePath) {
  const db = new DatabaseSync(
    databasePath,
    { readOnly: true }
  );

  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all()
      .map(row => row.name);

    return {
      databasePath,
      tables,
      attemptCount:
        tables.includes("attempts")
          ? Number(
              db.prepare(
                "SELECT COUNT(*) count FROM attempts"
              ).get().count
            )
          : null,
      executionCount:
        tables.includes("executions")
          ? Number(
              db.prepare(
                "SELECT COUNT(*) count FROM executions"
              ).get().count
            )
          : null,
      foreignKeys:
        tables.includes("executions")
          ? db
              .prepare(
                "PRAGMA foreign_key_list(executions)"
              )
              .all()
          : []
    };
  }
  finally {
    db.close();
  }
}

async function httpJson(
  url,
  options = {}
) {
  const response = await fetch(url, options);

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  }
  catch {
    data = {
      raw: text
    };
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

async function main() {
  // =========================================================
  // A. SOURCE / BUILD
  // =========================================================

  const build =
    process.platform === "win32"
      ? run(
          "cmd.exe",
          [
            "/d",
            "/s",
            "/c",
            "npx tsc --build --pretty false"
          ]
        )
      : run(
          "npx",
          [
            "tsc",
            "--build",
            "--pretty",
            "false"
          ]
        );

  artifacts.build = build;

  check(
    "typescript_build",
    build.status === 0,
    build.status === 0
      ? "TypeScript build clean"
      : build.stderr || build.stdout
  );

  const diffCheck = run(
    "git.exe",
    [
      "diff",
      "--check"
    ]
  );

  artifacts.diffCheck = diffCheck;

  check(
    "git_diff_check",
    diffCheck.status === 0,
    diffCheck.status === 0
      ? "diff clean"
      : diffCheck.stderr || diffCheck.stdout
  );

  // =========================================================
  // B. PRODUCT STATE AUTHORITY
  // =========================================================

  const dbFiles = findDatabases(
    path.join(root, ".sera")
  );

  const dbInspection =
    dbFiles.map(inspectDatabase);

  artifacts.databases = dbInspection;

  const liveDbPaths =
    dbInspection
      .filter(item =>
        !item.databasePath.includes(
          `${path.sep}backups${path.sep}`
        )
      )
      .map(item =>
        path.resolve(item.databasePath)
      );

  const runtimeHostDb = path.resolve(
    root,
    ".sera",
    "runtime-host",
    "state",
    "sera-operational.db"
  );

  check(
    "runtime_host_state_exists",
    fs.existsSync(runtimeHostDb),
    runtimeHostDb
  );

  // Architecture goal:
  // all product runtime participants must resolve against
  // the Runtime Host's authoritative state path.
  //
  // Having an old .sera/state DB on disk is not by itself
  // failure. The runtime proof below determines which DB the
  // live governed request actually uses.
  check(
    "state_schema_fk_enabled",
    dbInspection.some(item =>
      item.foreignKeys.some(fk =>
        fk.table === "attempts" &&
        fk.from === "attempt_id"
      )
    ),
    "executions.attempt_id -> attempts.attempt_id present"
  );

  // =========================================================
  // C. FIND LIVE PRODUCT RUNTIME
  // =========================================================

  const psScript = `
$runtime = @(
  Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -match 'apps[/\\\\]cli[/\\\\]dist[/\\\\]index\\.js\\s+runtime\\s+start'
  }
)

if ($runtime.Count -ne 1) {
  Write-Error "Expected exactly one Runtime Host; found $($runtime.Count)"
  exit 2
}

$pidValue = $runtime[0].ProcessId

$listener = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object OwningProcess -eq $pidValue |
  Select-Object -First 1

if (-not $listener) {
  Write-Error "No Runtime Host listener found."
  exit 3
}

[pscustomobject]@{
  pid = $pidValue
  port = $listener.LocalPort
} | ConvertTo-Json -Compress
`;

  const discovery = run(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      psScript
    ]
  );

  artifacts.runtimeDiscovery =
    discovery;

  let runtimeInfo;

  try {
    runtimeInfo =
      JSON.parse(discovery.stdout.trim());
  }
  catch {
    runtimeInfo = null;
  }

  check(
    "single_runtime_host",
    discovery.status === 0 &&
      runtimeInfo &&
      runtimeInfo.pid,
    runtimeInfo
      ? `PID ${runtimeInfo.pid}`
      : discovery.stderr || discovery.stdout
  );

  if (!runtimeInfo) {
    finalize();
    return;
  }

  const baseUri =
    `http://127.0.0.1:${runtimeInfo.port}`;

  artifacts.runtime = {
    pid: runtimeInfo.pid,
    baseUri
  };

  const status = await httpJson(
    `${baseUri}/api/v1/operator/status`
  );

  artifacts.status = status;

  check(
    "operator_gateway_healthy",
    status.ok &&
      status.data?.ok === true,
    `HTTP ${status.status}`
  );

  // =========================================================
  // D. AUTHENTICATED SESSION
  // =========================================================

  const sessionKey =
    `milestone-3-${crypto.randomUUID()}`;

  const sessionResponse = await httpJson(
    `${baseUri}/api/v1/operator/session`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json"
      },
      body: JSON.stringify({
        idempotencyKey:
          sessionKey
      })
    }
  );

  artifacts.session = {
    status: sessionResponse.status,
    ok: sessionResponse.ok,
    sessionId:
      sessionResponse.data?.data?.sessionId ?? null
  };

  const session =
    sessionResponse.data?.data;

  check(
    "authenticated_session",
    sessionResponse.ok &&
      sessionResponse.data?.ok === true &&
      Boolean(session?.token) &&
      Boolean(session?.csrfToken),
    `HTTP ${sessionResponse.status}`
  );

  if (
    !session?.token ||
    !session?.csrfToken
  ) {
    finalize();
    return;
  }

  // =========================================================
  // E. NEGATIVE REQUEST
  // =========================================================

  const negative = await httpJson(
    `${baseUri}/api/v1/operator/requests`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        authorization:
          `Bearer ${session.token}`,
        "x-sera-csrf":
          session.csrfToken
      },
      body: JSON.stringify({
        category:
          "run-certified-capability",
        text:
          "THIS_REQUEST_MUST_BE_REJECTED",
        idempotencyKey:
          `negative-${crypto.randomUUID()}`
      })
    }
  );

  artifacts.negativeRequest =
    negative;

  const negativeData =
    negative.data?.data;

  check(
    "unsupported_request_fails_closed",
    negative.ok &&
      negativeData?.status === "BLOCKED" &&
      negativeData?.modelUse === false &&
      negativeData?.networkUse === false,
    negativeData?.failureCode ??
      `HTTP ${negative.status}`
  );

  // =========================================================
  // F. REAL GOVERNED TASK
  // =========================================================

  const sourcePath = path.join(
    root,
    "docs",
    "BUILD_VALIDATION.md"
  );

  const sourceBefore =
    fs.existsSync(sourcePath)
      ? {
          sha256:
            sha256(sourcePath),
          bytes:
            fs.statSync(sourcePath).size
        }
      : null;

  artifacts.sourceBefore =
    sourceBefore;

  check(
    "real_source_exists",
    Boolean(sourceBefore),
    sourcePath
  );

  const real = await httpJson(
    `${baseUri}/api/v1/operator/requests`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        authorization:
          `Bearer ${session.token}`,
        "x-sera-csrf":
          session.csrfToken
      },
      body: JSON.stringify({
        category:
          "run-certified-capability",
        text:
          "Normalize docs/BUILD_VALIDATION.md with text-normalizer-v1.",
        idempotencyKey:
          `real-${crypto.randomUUID()}`
      })
    }
  );

  artifacts.realRequest = real;

  const result =
    real.data?.data;

  check(
    "governed_request_completed",
    real.ok &&
      result?.status === "COMPLETED",
    result?.failureCode ??
      result?.terminalDecision ??
      `HTTP ${real.status}`
  );

  check(
    "real_process_succeeded",
    result?.terminalDecision ===
      "SUCCEEDED_PROCESS",
    String(
      result?.terminalDecision ??
      "missing"
    )
  );

  check(
    "offline_execution",
    result?.networkUse === false,
    `networkUse=${String(result?.networkUse)}`
  );

  check(
    "model_free_execution",
    result?.modelUse === false,
    `modelUse=${String(result?.modelUse)}`
  );

  const sourceAfter =
    fs.existsSync(sourcePath)
      ? {
          sha256:
            sha256(sourcePath),
          bytes:
            fs.statSync(sourcePath).size
        }
      : null;

  artifacts.sourceAfter =
    sourceAfter;

  check(
    "source_unchanged",
    sourceBefore &&
      sourceAfter &&
      sourceBefore.sha256 ===
        sourceAfter.sha256 &&
      sourceBefore.bytes ===
        sourceAfter.bytes,
    sourceAfter?.sha256 ?? "missing"
  );

  // =========================================================
  // G. PROVE ATTEMPT + EXECUTION SHARE A DATABASE
  // =========================================================

  let requestAttemptId =
    result?.attemptId ?? null;

  const databaseIdentity = [];

  for (const databasePath of dbFiles) {
    if (
      databasePath.includes(
        `${path.sep}backups${path.sep}`
      )
    ) {
      continue;
    }

    const db = new DatabaseSync(
      databasePath,
      { readOnly: true }
    );

    try {
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table'"
        )
        .all()
        .map(row => row.name);

      let attempt = null;
      let execution = null;

      if (
        requestAttemptId &&
        tables.includes("attempts")
      ) {
        attempt =
          db.prepare(
            "SELECT attempt_id,current_state FROM attempts WHERE attempt_id=?"
          ).get(requestAttemptId) ??
          null;
      }

      if (
        requestAttemptId &&
        tables.includes("executions")
      ) {
        execution =
          db.prepare(
            "SELECT execution_id,attempt_id,state FROM executions WHERE attempt_id=? ORDER BY created_at DESC LIMIT 1"
          ).get(requestAttemptId) ??
          null;
      }

      databaseIdentity.push({
        databasePath,
        attempt,
        execution
      });
    }
    finally {
      db.close();
    }
  }

  artifacts.databaseIdentity =
    databaseIdentity;

  const sharedAuthority =
    databaseIdentity.find(item =>
      item.attempt &&
      item.execution &&
      item.attempt.attempt_id ===
        item.execution.attempt_id
    );

  check(
    "shared_runtime_state_authority",
    Boolean(sharedAuthority),
    sharedAuthority
      ? sharedAuthority.databasePath
      : "attempt/execution not co-located"
  );

  check(
    "runtime_host_state_authoritative",
    Boolean(
      sharedAuthority &&
      path.resolve(
        sharedAuthority.databasePath
      ) === runtimeHostDb
    ),
    sharedAuthority?.databasePath ??
      "missing"
  );

  finalize();

  function finalize() {
    const passed =
      checks.every(item => item.pass);

    const report = {
      milestone: 3,
      generatedAt:
        new Date().toISOString(),
      startedAt,
      result:
        passed ? "PASS" : "FAIL",
      summary: {
        total:
          checks.length,
        passed:
          checks.filter(
            item => item.pass
          ).length,
        failed:
          checks.filter(
            item => !item.pass
          ).length
      },
      checks,
      artifacts
    };

    const reportPath =
      path.join(
        evidenceRoot,
        "proof-report.json"
      );

    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        report,
        null,
        2
      ),
      "utf8"
    );

    process.stdout.write(
      `\nMILESTONE_3_${report.result}\n`
    );

    process.stdout.write(
      `Evidence: ${reportPath}\n`
    );

    if (!passed) {
      process.exitCode = 1;
    }
  }
}

main().catch(error => {
  const failure = {
    milestone: 3,
    result: "ERROR",
    generatedAt:
      new Date().toISOString(),
    message:
      error instanceof Error
        ? error.message
        : String(error),
    stack:
      error instanceof Error
        ? error.stack
        : undefined
  };

  fs.writeFileSync(
    path.join(
      evidenceRoot,
      "proof-error.json"
    ),
    JSON.stringify(
      failure,
      null,
      2
    ),
    "utf8"
  );

  console.error(error);
  process.exitCode = 2;
});