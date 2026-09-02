import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { OperatorGateway } from "@sera/operator-gateway";
import { verifyPreparationAuthority } from "./restricted-user-production-bindings";

const HOST = "127.0.0.1";
const PORT = 4317;
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const TEST_LISTENER_SEQUENCE = "SERA_DESKTOP_OPERATOR_TEST_LISTENER_SEQUENCE";
const TEST_PROCESS_DETAILS = "SERA_DESKTOP_OPERATOR_TEST_PROCESS_DETAILS";
const TEST_START_TIMEOUT = "SERA_DESKTOP_OPERATOR_TEST_START_TIMEOUT_MS";
const TEST_SERVE_DELAY = "SERA_DESKTOP_OPERATOR_TEST_SERVE_DELAY_MS";
const LIFECYCLE_TOKEN_ENV = "SERA_DESKTOP_OPERATOR_LIFECYCLE_TOKEN";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256File = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
class LifecycleError extends Error { constructor(readonly reasonCode: string, readonly detail?: unknown) { super(reasonCode); } }
const reject = (reasonCode: string, detail?: unknown): never => { throw new LifecycleError(reasonCode, detail); };
const value = (name: string) => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : undefined;
};
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const request = (pathname: string, token: string, timeoutMs = 1_000): Promise<any> => new Promise((resolve, reject) => {
  const req = http.get({ host: HOST, port: PORT, path: pathname, timeout: timeoutMs, headers: { "x-sera-lifecycle-token": token } }, (response) => {
    let body = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => { body += chunk; });
    response.on("end", () => {
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
  });
  req.once("timeout", () => req.destroy(new Error("timeout")));
  req.once("error", reject);
});
const post = (pathname: string, token: string, timeoutMs = 1_000): Promise<any> => new Promise((resolve, reject) => {
  const req = http.request({ host: HOST, port: PORT, path: pathname, method: "POST", timeout: timeoutMs, headers: { "x-sera-lifecycle-token": token } }, (response) => {
    let body = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => { body += chunk; });
    response.on("end", () => {
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
  });
  req.once("timeout", () => req.destroy(new Error("timeout")));
  req.once("error", reject);
  req.end();
});
const pidExists = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};

function context() {
  const preparationPath = path.resolve(value("--preparation") ?? reject("PREPARATION_MANIFEST_REQUIRED"));
  const stage = value("--stage");
  if (!["PRE_RESTART", "POST_RESTART"].includes(String(stage))) reject("DESKTOP_OPERATOR_STAGE_REQUIRED");
  const prep = readJson(preparationPath);
  if (prep.invocationMode !== "REAL_RESTRICTED_USER_PROOF" && prep.invocationMode !== "NON_PROMOTABLE_PRODUCTION_ROUNDTRIP_TEST") reject("DESKTOP_OPERATOR_INVOCATION_PROHIBITED");
  const releaseRoot = fs.realpathSync(path.resolve(prep.release.expectedExtractionRoot));
  const runtimePath = path.join(releaseRoot, "runtime", "node.exe");
  const entrypointPath = path.join(releaseRoot, "app", "desktop-operator-host.cjs");
  const normalize = (file: string) => path.resolve(file).replaceAll("/", "\\").toLowerCase();
  if (normalize(process.execPath) !== normalize(runtimePath) || normalize(String(process.argv[1] ?? "")) !== normalize(entrypointPath)) reject("PACKAGED_DESKTOP_OPERATOR_REQUIRED");
  for (const file of [runtimePath, entrypointPath]) {
    const lexical = fs.lstatSync(file), resolved = fs.realpathSync(file);
    if (!lexical.isFile() || lexical.isSymbolicLink() || normalize(resolved) !== normalize(file) || fs.statSync(file).nlink !== 1) reject("PACKAGED_DESKTOP_OPERATOR_PATH_ALIAS");
  }
  const manifestPath = path.join(releaseRoot, "release-manifest.json");
  if (normalize(prep.release.releaseManifestPath) !== normalize(manifestPath) || sha256File(manifestPath) !== prep.release.releaseManifestDigest) reject("PACKAGED_DESKTOP_OPERATOR_RELEASE_MANIFEST_MISMATCH");
  const manifest = readJson(manifestPath), generic = manifest.files?.find((x:any)=>x.path === "app/desktop-operator-host.cjs"), dedicated = manifest.desktopOperator?.host;
  const runtime = manifest.runtime;
  if (manifest.version !== prep.installationBinding?.releaseIdentity || prep.release.runtimeRelativePath !== "runtime/node.exe" || runtime?.path !== "runtime/node.exe" || runtime?.size !== fs.statSync(runtimePath).size || runtime?.sha256 !== sha256File(runtimePath) || prep.release.runtimeSha256 !== runtime.sha256) reject("PACKAGED_DESKTOP_OPERATOR_RUNTIME_MANIFEST_MISMATCH");
  if (dedicated?.path !== "app/desktop-operator-host.cjs" || generic?.path !== dedicated.path || dedicated.size !== generic.size || dedicated.sha256 !== generic.sha256 || dedicated.size !== fs.statSync(entrypointPath).size || dedicated.sha256 !== sha256File(entrypointPath)) reject("PACKAGED_DESKTOP_OPERATOR_ENTRYPOINT_MANIFEST_MISMATCH");
  const installationPath = path.resolve(String(prep.installationIdentityRecord?.path ?? ""));
  const installation = readJson(installationPath);
  if (installation.installationId !== prep.installationIdentity || installation.proofSessionId !== prep.sessionId || installation.nonce !== prep.nonce || normalize(installation.preparationPath) !== normalize(preparationPath) || installation.releaseManifestDigest !== prep.release.releaseManifestDigest) reject("PACKAGED_DESKTOP_OPERATOR_PREPARATION_BINDING_MISMATCH");
  try { verifyPreparationAuthority(preparationPath); } catch (error) { reject((error as Error).message); }
  const evidenceRoot = path.dirname(preparationPath);
  const controlRoot = path.join(path.dirname(evidenceRoot), "State", "desktop-operator");
  const evidenceLifecycleRoot = path.join(evidenceRoot, "desktop-operator");
  const prefix = stage === "PRE_RESTART" ? "pre" : "post";
  const controlPath = path.join(controlRoot, `${prefix}-control.json`);
  const tokenPath = path.join(controlRoot, `${prefix}-lifecycle-token`);
  const evidencePath = path.join(evidenceLifecycleRoot, `${prefix}-lifecycle.json`);
  const lockPath = path.join(controlRoot, "proof-transition.lock"), sealPath = path.join(evidenceRoot, "desktop-operator-finalization.seal");
  return { preparationPath, stage: String(stage), prep, releaseRoot, runtimePath, entrypointPath, controlRoot, evidenceLifecycleRoot, controlPath, tokenPath, evidencePath, lockPath, sealPath };
}

function lifecycleToken(ctx: ReturnType<typeof context>) {
  let token = "";
  try { token = fs.readFileSync(ctx.tokenPath, "utf8").trim(); } catch { reject("PACKAGED_DESKTOP_OPERATOR_AUTHORITY_SECRET_REQUIRED"); }
  if (!/^[a-f0-9]{64}$/.test(token)) reject("PACKAGED_DESKTOP_OPERATOR_AUTHORITY_SECRET_INVALID");
  return token;
}
function serveLifecycleToken() {
  const token = String(process.env[LIFECYCLE_TOKEN_ENV] ?? "");
  delete process.env[LIFECYCLE_TOKEN_ENV];
  if (!/^[a-f0-9]{64}$/.test(token)) reject("PACKAGED_DESKTOP_OPERATOR_AUTHORITY_SECRET_REQUIRED");
  return token;
}
function protectLifecycleToken(ctx: ReturnType<typeof context>) {
  if (ctx.prep.invocationMode !== "REAL_RESTRICTED_USER_PROOF") return;
  const run=spawnSync("C:\\Windows\\System32\\icacls.exe",[ctx.tokenPath,"/inheritance:r","/grant:r",`*${ctx.prep.expectedProofSid}:F`],{encoding:"utf8",windowsHide:true,timeout:10_000});
  if(run.status!==0)reject("PACKAGED_DESKTOP_OPERATOR_AUTHORITY_SECRET_PROTECTION_FAILED");
}
function testValue(ctx: ReturnType<typeof context>, name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  if (ctx.prep.invocationMode !== "NON_PROMOTABLE_PRODUCTION_ROUNDTRIP_TEST") reject("PACKAGED_DESKTOP_OPERATOR_TEST_SEAM_PROHIBITED");
  return raw;
}
let testListenerInspection = 0;
function listenerOwnerPid(ctx: ReturnType<typeof context>): number {
  const sequence = testValue(ctx, TEST_LISTENER_SEQUENCE);
  if (sequence !== undefined) {
    let parsed: unknown;
    try { parsed = JSON.parse(sequence); } catch { reject("PACKAGED_DESKTOP_OPERATOR_TEST_SEAM_INVALID"); }
    if (!Array.isArray(parsed)) reject("PACKAGED_DESKTOP_OPERATOR_TEST_SEAM_INVALID");
    const values = parsed as unknown[];
    if (values.length < 2 || values.some((item) => !Number.isInteger(item))) reject("PACKAGED_DESKTOP_OPERATOR_TEST_SEAM_INVALID");
    return Number(values[Math.min(testListenerInspection++, values.length - 1)]);
  }
  const run=spawnSync("C:\\Windows\\System32\\netstat.exe",["-ano","-p","tcp"],{encoding:"utf8",windowsHide:true,timeout:2_000});
  if(run.status!==0)reject("PACKAGED_DESKTOP_OPERATOR_OS_AUTHORITY_UNAVAILABLE");
  const line=String(run.stdout).split(/\r?\n/).find(x=>x.trim().split(/\s+/)[1]===`${HOST}:${PORT}`&&x.includes("LISTENING"));
  const listenerPid=Number(line?.trim().split(/\s+/).at(-1));if(!Number.isInteger(listenerPid))reject("PACKAGED_DESKTOP_OPERATOR_OS_AUTHORITY_UNAVAILABLE");
  return listenerPid;
}
function processDetails(ctx: ReturnType<typeof context>, pid:number):any {
  const script=`$p=Get-Process -Id ${pid} -ErrorAction Stop;[pscustomobject]@{executablePath=$p.Path;creationDate=$p.StartTime.ToUniversalTime().ToString('o');sessionId=$p.SessionId}|ConvertTo-Json -Compress`;
  const run=spawnSync(POWERSHELL,["-NoProfile","-NonInteractive","-Command",script],{encoding:"utf8",windowsHide:true,timeout:10_000});
  if(run.status!==0)reject("PACKAGED_DESKTOP_OPERATOR_OS_AUTHORITY_UNAVAILABLE");
  const actual=JSON.parse(run.stdout);
  const replacement=testValue(ctx,TEST_PROCESS_DETAILS);
  if(replacement===undefined)return actual;
  try{return{...actual,...JSON.parse(replacement)}}catch{reject("PACKAGED_DESKTOP_OPERATOR_TEST_SEAM_INVALID")}
}
function processAuthority(ctx: ReturnType<typeof context>, pid: number): any {
  const initialListenerPid=listenerOwnerPid(ctx);
  if(initialListenerPid!==pid)reject("PACKAGED_DESKTOP_OPERATOR_LISTENER_OWNER_MISMATCH");
  const details=processDetails(ctx,pid);
  const confirmedListenerPid=listenerOwnerPid(ctx);
  if(confirmedListenerPid!==initialListenerPid)reject("PACKAGED_DESKTOP_OPERATOR_LISTENER_REPLACED");
  if(confirmedListenerPid!==pid)reject("PACKAGED_DESKTOP_OPERATOR_LISTENER_OWNER_MISMATCH");
  return{listenerPid:confirmedListenerPid,...details};
}
async function withTransitionLock<T>(ctx: ReturnType<typeof context>, fn:()=>Promise<T>):Promise<T> {
  fs.mkdirSync(ctx.controlRoot,{recursive:true});
  try { fs.mkdirSync(ctx.lockPath); } catch { reject("PACKAGED_DESKTOP_OPERATOR_TRANSITION_AMBIGUOUS"); }
  try { return await fn(); } finally { fs.rmSync(ctx.lockPath,{recursive:true,force:true}); }
}

async function verifiedStatus(ctx: ReturnType<typeof context>) {
  let record:any;

  try{
    record=
      readJson(
        ctx.controlPath
      );
  }catch{
    reject(
      "PACKAGED_DESKTOP_OPERATOR_STATE_CORRUPT"
    );
  }

  if(
    record.stage !==
    ctx.stage
  ){
    reject(
      "PACKAGED_DESKTOP_OPERATOR_STAGE_MISMATCH"
    );
  }

  if(
    !Number.isInteger(
      record.pid
    ) ||
    !pidExists(
      record.pid
    )
  ){
    reject(
      "PACKAGED_DESKTOP_OPERATOR_NOT_RUNNING"
    );
  }

  const authority=
    processAuthority(
      ctx,
      record.pid
    );

  if(
    String(
      authority.executablePath
    ).toLowerCase() !==
    ctx.runtimePath.toLowerCase()
  ){
    reject(
      "PACKAGED_DESKTOP_OPERATOR_RUNTIME_IMAGE_MISMATCH"
    );
  }

  if(
    typeof record.processCreationDate !==
      "string" ||
    !Number.isFinite(
      Date.parse(
        record.processCreationDate
      )
    )
  ){
    reject(
      "PACKAGED_DESKTOP_OPERATOR_IDENTITY_MISMATCH",
      {
        key:
          "processCreationDate"
      }
    );
  }

  if(
    authority.creationDate !==
    record.processCreationDate
  ){
    reject(
      "PACKAGED_DESKTOP_OPERATOR_PROCESS_CREATION_MISMATCH"
    );
  }

  if(
    record.windowsSessionId ===
      undefined ||
    record.windowsSessionId ===
      null
  ){
    reject(
      "PACKAGED_DESKTOP_OPERATOR_IDENTITY_MISMATCH",
      {
        key:
          "windowsSessionId"
      }
    );
  }

  if(
    authority.sessionId !==
    record.windowsSessionId
  ){
    reject(
      "PACKAGED_DESKTOP_OPERATOR_WINDOWS_SESSION_MISMATCH"
    );
  }

  const token=
    lifecycleToken(ctx);

  let response:any;

  try{
    response=
      await request(
        "/api/v1/operator/packaged-lifecycle",
        token
      );
  }catch{
    reject(
      "PACKAGED_DESKTOP_OPERATOR_IDENTITY_UNAVAILABLE"
    );
  }

  const identity=
    response?.data;

  const expected={
    schemaVersion:
      "sera.packaged-desktop-operator-lifecycle.v1",
    stage:
      ctx.stage,
    proofSessionId:
      ctx.prep.sessionId,
    releaseIdentity:
      ctx.prep.installationBinding.releaseIdentity,
    runtimeSha256:
      sha256File(ctx.runtimePath),
    entrypointSha256:
      sha256File(ctx.entrypointPath),
    pid:
      record.pid,
    subjectSid:
      ctx.prep.expectedProofSid,
    host:
      HOST,
    port:
      PORT
  };

  for(
    const [key,expectedValue]
    of Object.entries(expected)
  ){
    if(
      identity?.[key] !==
        expectedValue ||
      record[key] !==
        expectedValue
    ){
      reject(
        "PACKAGED_DESKTOP_OPERATOR_IDENTITY_MISMATCH",
        {key}
      );
    }
  }

  return{
    record,
    identity
  };
}

async function serve(ctx: ReturnType<typeof context>) {
  fs.mkdirSync(ctx.controlRoot, { recursive: true });
  const ownProcess=processDetails(ctx,process.pid);
  const identity = {
    schemaVersion: "sera.packaged-desktop-operator-lifecycle.v1",
    stage: ctx.stage,
    proofSessionId: ctx.prep.sessionId,
    nonceDigest: sha256(ctx.prep.nonce),
    releaseIdentity: ctx.prep.installationBinding.releaseIdentity,
    installationIdentity: ctx.prep.installationIdentity,
    runtimePath: ctx.runtimePath,
    runtimeSha256: sha256File(ctx.runtimePath),
    entrypointPath: ctx.entrypointPath,
    entrypointSha256: sha256File(ctx.entrypointPath),
    pid: process.pid,
    parentPid: process.ppid,
    processCreationDate: ownProcess.creationDate,
    windowsSessionId: ownProcess.sessionId,
    subjectSid: ctx.prep.expectedProofSid,
    host: HOST,
    port: PORT,
    state: "READY",
    startedAt: new Date().toISOString(),
    claimsGranted: []
  };
  const shutdownToken = serveLifecycleToken();
  let stopHandler: () => Promise<void> = async () => undefined;
  const gateway = new OperatorGateway({
    projectRoot: ctx.releaseRoot,
    stateRoot: path.join(ctx.controlRoot, "gateway-state", ctx.stage, String(process.pid)),
    evidenceRoot: path.join(ctx.controlRoot, "gateway-evidence", ctx.stage, String(process.pid)),
    host: HOST,
    port: PORT,
    installationId: ctx.prep.installationIdentity,
    runtimeInstanceId: `restricted_desktop_${ctx.prep.sessionId}`,
    packagedLifecycleIdentity: identity,
    packagedLifecycleIdentityTokenHash: sha256(JSON.stringify(shutdownToken)),
    packagedLifecycleShutdown: { tokenHash: sha256(JSON.stringify(shutdownToken)), request: () => { void stopHandler(); } }
  });
  const serveDelay=Number(testValue(ctx,TEST_SERVE_DELAY)??0);
  if(!Number.isFinite(serveDelay)||serveDelay<0||serveDelay>10_000)reject("PACKAGED_DESKTOP_OPERATOR_TEST_SEAM_INVALID");
  if(serveDelay>0)await sleep(serveDelay);
  await gateway.start();
  fs.writeFileSync(ctx.controlPath, `${JSON.stringify(identity, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_READY", ...identity })}\n`);
  let stopping = false;
  let resolveServe!:()=>void; const serving=new Promise<void>(resolve=>{resolveServe=resolve});
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await gateway.stop();
    gateway.close();
    const stopped = { ...identity, state: "STOPPED", stoppedAt: new Date().toISOString() };
    fs.writeFileSync(ctx.controlPath, `${JSON.stringify(stopped, null, 2)}\n`);
    resolveServe();
  };
  stopHandler = stop;
  process.once("SIGTERM", () => { void stop(); });
  process.once("SIGINT", () => { void stop(); });
  await serving;
}

async function start(ctx: ReturnType<typeof context>) {
  if(fs.existsSync(ctx.evidencePath)||fs.existsSync(ctx.sealPath))reject("PACKAGED_DESKTOP_OPERATOR_LIFECYCLE_SEALED");
  return await withTransitionLock(ctx,()=>startLocked(ctx));
}
async function startLocked(ctx: ReturnType<typeof context>) {
  if(fs.existsSync(ctx.evidencePath)||fs.existsSync(ctx.sealPath))reject("PACKAGED_DESKTOP_OPERATOR_LIFECYCLE_SEALED");
  if (fs.existsSync(ctx.controlPath)) {
    try {
      const current = await verifiedStatus(ctx);
      process.stdout.write(`${JSON.stringify({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_ALREADY_RUNNING", ...current.record, claimsGranted: [] })}\n`);
      return;
    } catch (error) {
      if (!(error instanceof LifecycleError)) throw error;
      let stale:any;try{stale=readJson(ctx.controlPath)}catch{reject("PACKAGED_DESKTOP_OPERATOR_STATE_CORRUPT")}
      if (stale.stage !== ctx.stage) reject("PACKAGED_DESKTOP_OPERATOR_STAGE_MISMATCH");
      if (Number.isInteger(stale.pid) && pidExists(stale.pid)) reject("PACKAGED_DESKTOP_OPERATOR_STALE_OWNED_PROCESS");
      if (error.reasonCode !== "PACKAGED_DESKTOP_OPERATOR_NOT_RUNNING" && error.reasonCode !== "PACKAGED_DESKTOP_OPERATOR_IDENTITY_UNAVAILABLE") throw error;
      try{await request("/api/v1/operator/packaged-lifecycle",lifecycleToken(ctx),250);reject("PACKAGED_DESKTOP_OPERATOR_REPLACEMENT_LISTENER")}catch(endpointError){if(endpointError instanceof LifecycleError)throw endpointError}
      fs.rmSync(ctx.controlPath);
      fs.rmSync(ctx.tokenPath,{force:true});
    }
  }
  fs.mkdirSync(ctx.controlRoot, { recursive: true });
  if(fs.existsSync(ctx.tokenPath))reject("PACKAGED_DESKTOP_OPERATOR_AUTHORITY_SECRET_ALREADY_EXISTS");
  const lifecycleSecret=crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(ctx.tokenPath,`${lifecycleSecret}\n`,{flag:"wx"});
  try{protectLifecycleToken(ctx)}catch(error){fs.rmSync(ctx.tokenPath,{force:true});throw error}
  const logPath = path.join(ctx.controlRoot, `${ctx.stage === "PRE_RESTART" ? "pre" : "post"}-host.log`);
  const logExistedBefore=fs.existsSync(logPath);
  let logFd:number;
  try{logFd=fs.openSync(logPath,"a")}catch(error){fs.rmSync(ctx.tokenPath,{force:true});throw error}
  const childEnv:NodeJS.ProcessEnv={ SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR, TEMP: process.env.TEMP, TMP: process.env.TMP, PATH: path.dirname(ctx.runtimePath), SERA_PROOF_INVOCATION: ctx.prep.invocationMode, [LIFECYCLE_TOKEN_ENV]: lifecycleSecret };
  if(ctx.prep.invocationMode==="NON_PROMOTABLE_PRODUCTION_ROUNDTRIP_TEST"&&process.env[TEST_SERVE_DELAY]!==undefined)childEnv[TEST_SERVE_DELAY]=process.env[TEST_SERVE_DELAY];
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(ctx.runtimePath, [ctx.entrypointPath, "serve", "--preparation", ctx.preparationPath, "--stage", ctx.stage], {
      cwd: ctx.releaseRoot,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", logFd, logFd],
      shell: false,
      env: childEnv
    });
  } catch (error) {
    fs.closeSync(logFd);
    fs.rmSync(ctx.tokenPath,{force:true});
    if(!logExistedBefore)fs.rmSync(logPath,{force:true});
    throw error;
  }
  fs.closeSync(logFd);
  child.unref();
  const timeoutMs=Number(testValue(ctx,TEST_START_TIMEOUT)??20_000);
  if(!Number.isFinite(timeoutMs)||timeoutMs<100||timeoutMs>20_000)reject("PACKAGED_DESKTOP_OPERATOR_TEST_SEAM_INVALID");
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (fs.existsSync(ctx.controlPath)) {
      const current = await verifiedStatus(ctx);
      process.stdout.write(`${JSON.stringify({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_STARTED", ...current.record, claimsGranted: [] })}\n`);
      return;
    }
    await sleep(50);
  }
  if (child.pid && pidExists(child.pid)) {
    process.kill(child.pid);
    const cleanupUntil=Date.now()+5_000;
    while(pidExists(child.pid)&&Date.now()<cleanupUntil)await sleep(25);
    if(pidExists(child.pid))reject("PACKAGED_DESKTOP_OPERATOR_START_CLEANUP_FAILED");
  }
  if(fs.existsSync(ctx.controlPath)){
    let partial:any;try{partial=readJson(ctx.controlPath)}catch{reject("PACKAGED_DESKTOP_OPERATOR_START_CLEANUP_FAILED")}
    if(partial.pid!==child.pid)reject("PACKAGED_DESKTOP_OPERATOR_START_CLEANUP_FAILED");
    fs.rmSync(ctx.controlPath);
  }
  if(child.pid){
    for(const createdRoot of [path.join(ctx.controlRoot,"gateway-state",ctx.stage,String(child.pid)),path.join(ctx.controlRoot,"gateway-evidence",ctx.stage,String(child.pid))])fs.rmSync(createdRoot,{recursive:true,force:true});
  }
  if(!logExistedBefore)fs.rmSync(logPath,{force:true});
  if(fs.existsSync(ctx.tokenPath)&&fs.readFileSync(ctx.tokenPath,"utf8").trim()===lifecycleSecret)fs.rmSync(ctx.tokenPath,{force:true});
  reject("PACKAGED_DESKTOP_OPERATOR_START_TIMEOUT");
}

async function status(ctx: ReturnType<typeof context>) {
  if (!fs.existsSync(ctx.controlPath)) reject("PACKAGED_DESKTOP_OPERATOR_LIFECYCLE_REQUIRED");
  const current = await verifiedStatus(ctx);
  process.stdout.write(`${JSON.stringify({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_RUNNING", ...current.record, gatewayIdentityVerified: true, claimsGranted: [] })}\n`);
}

async function stop(ctx: ReturnType<typeof context>) {
  if (!fs.existsSync(ctx.controlPath)) reject("PACKAGED_DESKTOP_OPERATOR_LIFECYCLE_REQUIRED");
  const current = await verifiedStatus(ctx);
  const shutdownRequestedAt=new Date().toISOString();
  const shutdownToken = lifecycleToken(ctx);
  const accepted = await post("/api/v1/operator/packaged-lifecycle/shutdown", shutdownToken);
  if (accepted?.data?.accepted !== true) reject("PACKAGED_DESKTOP_OPERATOR_SHUTDOWN_REJECTED");
  const until = Date.now() + 10_000;
  while (Date.now() < until && pidExists(current.record.pid)) await sleep(50);
  if (pidExists(current.record.pid)) reject("PACKAGED_DESKTOP_OPERATOR_STOP_TIMEOUT");
  const record = readJson(ctx.controlPath);
  if (record.state !== "STOPPED") reject("PACKAGED_DESKTOP_OPERATOR_SHUTDOWN_INCOMPLETE");
  fs.mkdirSync(ctx.evidenceLifecycleRoot,{recursive:true});
  const evidence={...current.identity,state:"STOPPED",startedAt:current.record.startedAt,shutdownRequestedAt,stoppedAt:record.stoppedAt,ownedProcessExitConfirmed:true,claimsGranted:[]};
  fs.writeFileSync(ctx.evidencePath,`${JSON.stringify(evidence,null,2)}\n`,{flag:"wx"});
  fs.rmSync(ctx.tokenPath,{force:true});
  process.stdout.write(`${JSON.stringify({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_STOPPED", pid: current.record.pid, claimsGranted: [] })}\n`);
}

const action = process.argv[2];
Promise.resolve().then(()=>{const ctx=context();return action === "serve" ? serve(ctx) : action === "start" ? start(ctx) : action === "status" ? status(ctx) : action === "stop" ? stop(ctx) : reject("PACKAGED_DESKTOP_OPERATOR_ACTION_REQUIRED")})
  .catch((error) => { process.stderr.write(`${JSON.stringify({ok:false,status:"BLOCKED",reasonCode:error instanceof LifecycleError?error.reasonCode:error?.code??error?.message??"PACKAGED_DESKTOP_OPERATOR_FAILED",claimsGranted:[]})}\n`); process.exitCode=1; });
