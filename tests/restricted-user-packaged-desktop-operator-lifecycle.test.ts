import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildPortableBaseMvp, verifyPortableBaseMvp } from "../packages/portable-base-mvp/src/portable-base-mvp";
import { normalizedTreeDigest } from "../packages/portable-base-mvp/src/restricted-user-evidence";
import { auditPackagedDesktopOperatorLifecycle, prepareRestrictedUserProof } from "../packages/portable-base-mvp/src/restricted-user-proof";
import { auditLifecycleObserverAuthority, deriveSubjectProcessTree, parseRawObserverEvents } from "../packages/portable-base-mvp/src/restricted-user-privileged-observer";
import { finalizeRestrictedUserEvidence } from "../packages/portable-base-mvp/src/restricted-user-observations";

let root = "";
let release: any;
let preparation = "";
let runtime = "";
let host = "";
const ownedPids = new Set<number>();

const parse = (run: any) => {
  const lines = `${run.stdout}\n${run.stderr}`.split(/\r?\n/).filter((line) => line.trim().startsWith("{"));
  return JSON.parse(lines.at(-1) ?? "{}");
};
const invokeFor = (preparationPath: string, stage: "PRE_RESTART" | "POST_RESTART", action: string, extraEnv: Record<string,string> = {}) => spawnSync(runtime, [host, action, "--preparation", preparationPath, "--stage", stage], {
  cwd: release.packageRoot,
  encoding: "utf8",
  shell: false,
  windowsHide: true,
  timeout: 30_000,
  env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR, TEMP: process.env.TEMP, TMP: process.env.TMP, PATH: path.dirname(runtime), ...extraEnv }
});
const invoke = (action: string) => invokeFor(preparation, "PRE_RESTART", action);
const alive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};
const controlPath = () => path.join(path.dirname(path.dirname(preparation)), "State", "desktop-operator", "pre-control.json");
const tokenPath = () => path.join(path.dirname(path.dirname(preparation)), "State", "desktop-operator", "pre-lifecycle-token");
const lifecycleRequest = (token:string):Promise<{status:number;body:any}> => new Promise((resolve,reject)=>{
  const req=http.get({host:"127.0.0.1",port:4317,path:"/api/v1/operator/packaged-lifecycle",headers:{"x-sera-lifecycle-token":token}},response=>{let body="";response.setEncoding("utf8");response.on("data",chunk=>{body+=chunk});response.on("end",()=>{let parsed:any={};try{parsed=JSON.parse(body)}catch{}resolve({status:response.statusCode??0,body:parsed})})});
  req.once("error",reject);
});
const fixturePaths = (preparationPath: string, stage: "PRE_RESTART" | "POST_RESTART") => {
  const evidenceRoot=path.dirname(preparationPath),prefix=stage==="PRE_RESTART"?"pre":"post";
  return {
    control:path.join(path.dirname(evidenceRoot),"State","desktop-operator",`${prefix}-control.json`),
    lifecycle:path.join(evidenceRoot,"desktop-operator",`${prefix}-lifecycle.json`),
    seal:path.join(evidenceRoot,"desktop-operator-finalization.seal")
  };
};
const prepareFixture = (name: string) => {
  const fixtureRoot=path.join(root,name),observerRoot=path.join(fixtureRoot,"observer");
  fs.mkdirSync(observerRoot,{recursive:true});
  const prepared:any=prepareRestrictedUserProof({
    projectRoot:process.cwd(),
    outputRoot:path.join(fixtureRoot,"evidence"),
    releaseZip:release.zipPath,
    extractionRoot:release.packageRoot,
    releaseManifest:release.manifestPath,
    proofAccountName:"SERA_PACKAGED_DESKTOP_TEST",
    proofSid:"S-1-5-21-packaged-desktop-test",
    developmentSid:"S-1-5-21-development",
    hostProfileId:"packaged-desktop-host",
    governanceDecision:path.join(process.cwd(),"architecture","restricted-user-proof-governance-decision-v2.json"),
    observerRoot,
    collectorFiles:[],
    invocationMode:"NON_PROMOTABLE_PRODUCTION_ROUNDTRIP_TEST",
    roundTripAdapters:{
      preBoot:{bootIdentity:"A",lastBoot:"2026-07-20T00:00:00Z",bootRecord:"A",collectedAt:"2026-07-20T01:00:00Z"},
      postBoot:{bootIdentity:"B",lastBoot:"2026-07-21T00:00:00Z",bootRecord:"B",collectedAt:"2026-07-21T01:00:00Z"}
    }
  });
  return prepared.path as string;
};
const expectFinalizationBlocked = (preparationPath:string,reasonCode:string,options:{onTransitionLocked?:()=>void}={}) => {
  let thrown:any;
  try{finalizeRestrictedUserEvidence(preparationPath,options)}catch(error){thrown=error}
  expect(thrown).toMatchObject({code:reasonCode});
};
const writeStoppedLifecycle = (preparationPath:string,stage:"PRE_RESTART"|"POST_RESTART",pid:number) => {
  const files=fixturePaths(preparationPath,stage),record={stage,state:"STOPPED",pid,shutdownRequestedAt:"2026-07-28T10:00:05.000Z",stoppedAt:"2026-07-28T10:00:06.000Z",ownedProcessExitConfirmed:true};
  fs.mkdirSync(path.dirname(files.control),{recursive:true});
  fs.mkdirSync(path.dirname(files.lifecycle),{recursive:true});
  fs.writeFileSync(files.control,`${JSON.stringify(record)}\n`);
  fs.writeFileSync(files.lifecycle,`${JSON.stringify(record)}\n`);
};
const jsonOutputLines = (run:any) => `${run.stdout}\n${run.stderr}`.split(/\r?\n/).map((line)=>line.trim()).filter((line)=>line.startsWith("{"));
const zipEntries = (file: string) => {
  const data = fs.readFileSync(file), entries = new Map<string, Buffer>(); let offset = 0;
  while (offset + 30 <= data.length && data.readUInt32LE(offset) === 0x04034b50) {
    const size = data.readUInt32LE(offset + 18), nameLength = data.readUInt16LE(offset + 26), extraLength = data.readUInt16LE(offset + 28), nameStart = offset + 30, contentStart = nameStart + nameLength + extraLength;
    entries.set(data.subarray(nameStart, nameStart + nameLength).toString("utf8"), Buffer.from(data.subarray(contentStart, contentStart + size)));
    offset = contentStart + size;
  }
  return entries;
};
const writeTestZip = (file: string, entries: Map<string, Buffer>) => {
  const parts: Buffer[] = [];
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name), header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt32LE(0, 14); header.writeUInt32LE(content.length, 18); header.writeUInt32LE(content.length, 22); header.writeUInt16LE(nameBytes.length, 26);
    parts.push(header, nameBytes, content);
  }
  fs.writeFileSync(file, Buffer.concat(parts));
  fs.writeFileSync(`${file}.sha256.json`, JSON.stringify({ sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") }));
};

describe("packaged Desktop Operator lifecycle", () => {
  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-desktop-lifecycle-"));
    release = buildPortableBaseMvp({ projectRoot: process.cwd(), outputRoot: path.join(root, "release") });
    runtime = path.join(release.packageRoot, "runtime", "node.exe");
    host = path.join(release.packageRoot, "app", "desktop-operator-host.cjs");
    const observerRoot = path.join(root, "observer");
    fs.mkdirSync(observerRoot);
    const prepared: any = prepareRestrictedUserProof({
      projectRoot: process.cwd(),
      outputRoot: path.join(root, "evidence"),
      releaseZip: release.zipPath,
      extractionRoot: release.packageRoot,
      releaseManifest: release.manifestPath,
      proofAccountName: "SERA_PACKAGED_DESKTOP_TEST",
      proofSid: "S-1-5-21-packaged-desktop-test",
      developmentSid: "S-1-5-21-development",
      hostProfileId: "packaged-desktop-host",
      governanceDecision: path.join(process.cwd(), "architecture", "restricted-user-proof-governance-decision-v2.json"),
      observerRoot,
      collectorFiles: [],
      invocationMode: "NON_PROMOTABLE_PRODUCTION_ROUNDTRIP_TEST",
      roundTripAdapters: {
        preBoot: { bootIdentity: "A", lastBoot: "2026-07-20T00:00:00Z", bootRecord: "A", collectedAt: "2026-07-20T01:00:00Z" },
        postBoot: { bootIdentity: "B", lastBoot: "2026-07-21T00:00:00Z", bootRecord: "B", collectedAt: "2026-07-21T01:00:00Z" }
      }
    });
    preparation = prepared.path;
  }, 45_000);

  afterAll(() => {
    for (const pid of ownedPids) if (alive(pid)) process.kill(pid);
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it("manifest-binds the bundled host and rejects altered host content", () => {
    const manifest = JSON.parse(fs.readFileSync(release.manifestPath, "utf8"));
    const entry = manifest.files.find((item: any) => item.path === "app/desktop-operator-host.cjs");
    expect(entry).toMatchObject({ size: fs.statSync(host).size });
    expect(manifest.desktopOperator).toMatchObject({ loopbackHost: "127.0.0.1", port: 4317, lifecycleActions: ["start", "status", "stop"] });
    expect(verifyPortableBaseMvp(release.packageRoot)).toMatchObject({ ok: true, status: "VERIFIED" });
    const original = fs.readFileSync(host);
    fs.appendFileSync(host, "\n// altered\n");
    expect(verifyPortableBaseMvp(release.packageRoot)).toMatchObject({ ok: false, status: "BLOCKED" });
    fs.writeFileSync(host, original);
  });

  it("rejects inconsistent directory lifecycle metadata", () => {
    const original = fs.readFileSync(release.manifestPath, "utf8");
    const baseline = JSON.parse(original);
    const mutations = [
      (m: any) => { m.desktopOperator.lifecycleActions = ["start", "stop"]; },
      (m: any) => { m.desktopOperator.lifecycleActions = ["start", "status", "stop", "restart"]; },
      (m: any) => { delete m.desktopOperator.lifecycleActions; },
      (m: any) => { m.desktopOperator.host.path = "app/wrong.cjs"; },
      (m: any) => { m.desktopOperator.host.size++; },
      (m: any) => { m.desktopOperator.host.sha256 = "0".repeat(64); },
      (m: any) => { m.files.find((x: any) => x.path === "app/desktop-operator-host.cjs").sha256 = "1".repeat(64); },
      (m: any) => { m.desktopOperator.loopbackHost = "0.0.0.0"; },
      (m: any) => { m.desktopOperator.port = 4318; }
    ];
    for (const mutate of mutations) {
      const manifest = structuredClone(baseline);
      mutate(manifest);
      fs.writeFileSync(release.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      expect(verifyPortableBaseMvp(release.packageRoot).checks.desktopOperatorHostBound).toBe(false);
    }
    fs.writeFileSync(release.manifestPath, original);
  });

  it("rejects every independent ZIP lifecycle integrity mutation", () => {
    expect(verifyPortableBaseMvp(release.zipPath)).toMatchObject({ ok: true, status: "VERIFIED" });
    const prefix = "SERA-Base-MVP-v1/", hostName = `${prefix}app/desktop-operator-host.cjs`, manifestName = `${prefix}release-manifest.json`, control = zipEntries(release.zipPath);
    const cases: Array<[string, (entries: Map<string, Buffer>, manifest: any) => void]> = [
      ["missing payload", (e) => { e.delete(hostName); }],
      ["modified payload", (e) => { e.set(hostName, Buffer.concat([e.get(hostName)!, Buffer.from("x")])); }],
      ["missing dedicated metadata", (_e, m) => { delete m.desktopOperator.host; }],
      ["wrong relative path", (_e, m) => { m.desktopOperator.host.path = "app/wrong.cjs"; }],
      ["wrong dedicated size", (_e, m) => { m.desktopOperator.host.size++; }],
      ["wrong dedicated digest", (_e, m) => { m.desktopOperator.host.sha256 = "0".repeat(64); }],
      ["missing operations", (_e, m) => { delete m.desktopOperator.lifecycleActions; }],
      ["missing start", (_e, m) => { m.desktopOperator.lifecycleActions = ["status", "stop"]; }],
      ["missing status", (_e, m) => { m.desktopOperator.lifecycleActions = ["start", "stop"]; }],
      ["missing stop", (_e, m) => { m.desktopOperator.lifecycleActions = ["start", "status"]; }],
      ["added operation", (_e, m) => { m.desktopOperator.lifecycleActions.push("restart"); }],
      ["reordered operations", (_e, m) => { m.desktopOperator.lifecycleActions = ["status", "start", "stop"]; }],
      ["altered operation", (_e, m) => { m.desktopOperator.lifecycleActions[1] = "health"; }],
      ["wrong host", (_e, m) => { m.desktopOperator.loopbackHost = "0.0.0.0"; }],
      ["wrong port", (_e, m) => { m.desktopOperator.port = 4318; }],
      ["missing generic entry", (_e, m) => { m.files = m.files.filter((x: any) => x.path !== "app/desktop-operator-host.cjs"); }],
      ["generic size mismatch", (_e, m) => { m.files.find((x: any) => x.path === "app/desktop-operator-host.cjs").size++; }],
      ["generic digest mismatch", (_e, m) => { m.files.find((x: any) => x.path === "app/desktop-operator-host.cjs").sha256 = "1".repeat(64); }],
      ["dedicated generic disagreement", (_e, m) => { m.desktopOperator.host.sha256 = "2".repeat(64); }],
      ["content manifest disagreement", (e) => { const payload = Buffer.from(e.get(hostName)!); payload[0] ^= 1; e.set(hostName, payload); }]
    ];
    for (const [name, mutate] of cases) {
      const mutationRoot = fs.mkdtempSync(path.join(root, "zip-mutation-")), zip = path.join(mutationRoot, path.basename(release.zipPath)), entries = new Map([...control].map(([key, value]) => [key, Buffer.from(value)])), manifest = JSON.parse(entries.get(manifestName)!.toString("utf8"));
      mutate(entries, manifest); entries.set(manifestName, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)); writeTestZip(zip, entries);
      const result = verifyPortableBaseMvp(zip);
      expect(result.checks.desktopOperatorHostBound, name).toBe(false);
      expect(result).toMatchObject({ ok: false, status: "BLOCKED" });
      fs.rmSync(mutationRoot, { recursive: true, force: true });
    }
  }, 120_000);

  it("independently rejects a non-bundled runtime and a wrong-path entrypoint", () => {
    const system = parse(spawnSync(process.execPath, [host, "status", "--preparation", preparation, "--stage", "PRE_RESTART"], { cwd: release.packageRoot, encoding: "utf8", shell: false, windowsHide: true }));
    expect(system).toMatchObject({ ok: false, status: "BLOCKED", reasonCode: "PACKAGED_DESKTOP_OPERATOR_REQUIRED", claimsGranted: [] });
    const copied = path.join(release.packageRoot, "app", "copied-desktop-operator-host.cjs");
    fs.copyFileSync(host, copied);
    const wrongPath = parse(spawnSync(runtime, [copied, "status", "--preparation", preparation, "--stage", "PRE_RESTART"], { cwd: release.packageRoot, encoding: "utf8", shell: false, windowsHide: true }));
    expect(wrongPath).toMatchObject({ ok: false, status: "BLOCKED", reasonCode: "PACKAGED_DESKTOP_OPERATOR_REQUIRED", claimsGranted: [] });
    fs.rmSync(copied);
  });

  it("rejects hard-link and directory-junction entrypoint aliases", () => {
    const hardLink=path.join(release.packageRoot,"app","hardlink-desktop-operator-host.cjs");
    fs.linkSync(host,hardLink);
    expect(parse(spawnSync(runtime,[hardLink,"status","--preparation",preparation,"--stage","PRE_RESTART"],{cwd:release.packageRoot,encoding:"utf8",shell:false,windowsHide:true}))).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_REQUIRED",claimsGranted:[]});
    fs.rmSync(hardLink);
    const alias=path.join(root,"release-alias");fs.symlinkSync(release.packageRoot,alias,"junction");
    expect(parse(spawnSync(path.join(alias,"runtime","node.exe"),[path.join(alias,"app","desktop-operator-host.cjs"),"status","--preparation",preparation,"--stage","PRE_RESTART"],{cwd:release.packageRoot,encoding:"utf8",shell:false,windowsHide:true}))).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_REQUIRED",claimsGranted:[]});
    fs.rmSync(alias);
  });

  it("rejects execution-time release manifest replacement against the preparation pin", () => {
    const original=fs.readFileSync(release.manifestPath,"utf8"),manifest=JSON.parse(original);
    manifest.desktopOperator.port=4318;fs.writeFileSync(release.manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
    expect(parse(invoke("status"))).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_RELEASE_MANIFEST_MISMATCH",claimsGranted:[]});
    fs.writeFileSync(release.manifestPath,original);
  });

  it("rejects a caller-selected copied preparation record", () => {
    const copied=path.join(root,"copied-preparation.json");fs.copyFileSync(preparation,copied);
    expect(parse(spawnSync(runtime,[host,"status","--preparation",copied,"--stage","PRE_RESTART"],{cwd:release.packageRoot,encoding:"utf8",shell:false,windowsHide:true}))).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_PREPARATION_BINDING_MISMATCH",claimsGranted:[]});
    fs.rmSync(copied);
  });

  it("rejects coordinated preparation, installation, release, manifest, runtime, and entrypoint substitution", () => {
    const copiedRoot=path.join(root,"coordinated-substitution"),copiedRelease=path.join(copiedRoot,"release"),copiedEvidence=path.join(copiedRoot,"evidence"),copiedObserver=path.join(copiedRoot,"observer"),copiedState=path.join(copiedRoot,"State");
    fs.cpSync(release.packageRoot,copiedRelease,{recursive:true});fs.mkdirSync(copiedEvidence,{recursive:true});fs.mkdirSync(copiedObserver,{recursive:true});fs.mkdirSync(copiedState,{recursive:true});
    const originalPrep=JSON.parse(fs.readFileSync(preparation,"utf8")),copiedPrepPath=path.join(copiedEvidence,"preparation-manifest.json"),copiedInstallationPath=path.join(copiedState,"installation-identity.json"),copiedManifestPath=path.join(copiedRelease,"release-manifest.json"),copiedRuntime=path.join(copiedRelease,"runtime","node.exe"),copiedHost=path.join(copiedRelease,"app","desktop-operator-host.cjs"),copiedManifest=JSON.parse(fs.readFileSync(copiedManifestPath,"utf8"));
    copiedManifest.version=`${copiedManifest.version}-substituted`;fs.writeFileSync(copiedManifestPath,`${JSON.stringify(copiedManifest,null,2)}\n`);
    const digest=(file:string)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    const copiedTreeDigest=normalizedTreeDigest(copiedRelease),copiedPrep={...originalPrep,observerRoot:copiedObserver,release:{...originalPrep.release,expectedExtractionRoot:copiedRelease,releaseManifestPath:copiedManifestPath,releaseManifestDigest:digest(copiedManifestPath),extractedTreeDigest:copiedTreeDigest,runtimePath:copiedRuntime,runtimeSha256:digest(copiedRuntime)},installationBinding:{...originalPrep.installationBinding,releaseIdentity:copiedManifest.version,releaseManifestDigest:digest(copiedManifestPath),extractedTreeDigest:copiedTreeDigest},installationIdentityRecord:{...originalPrep.installationIdentityRecord,path:copiedInstallationPath}};
    const copiedInstallation={...JSON.parse(fs.readFileSync(originalPrep.installationIdentityRecord.path,"utf8")),preparationPath:copiedPrepPath,releaseManifestDigest:digest(copiedManifestPath),extractedTreeDigest:copiedTreeDigest,releaseIdentity:copiedManifest.version};
    fs.writeFileSync(copiedInstallationPath,`${JSON.stringify(copiedInstallation,null,2)}\n`);copiedPrep.installationIdentityRecord.sha256=digest(copiedInstallationPath);copiedPrep.installationIdentityRecord.size=fs.statSync(copiedInstallationPath).size;fs.writeFileSync(copiedPrepPath,`${JSON.stringify(copiedPrep,null,2)}\n`);
    fs.copyFileSync(path.join(originalPrep.observerRoot,"preparation-authority.json"),path.join(copiedObserver,"preparation-authority.json"));
    expect(parse(spawnSync(copiedRuntime,[copiedHost,"status","--preparation",copiedPrepPath,"--stage","PRE_RESTART"],{cwd:copiedRelease,encoding:"utf8",shell:false,windowsHide:true}))).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PREPARATION_AUTHORITY_MISMATCH",claimsGranted:[]});
    fs.rmSync(copiedRoot,{recursive:true,force:true});
  });

  it("starts the actual gateway, rejects the former evidence-derived token, and stops only its owned process", async () => {
    const started = parse(invoke("start"));
    const startupLog=path.join(root,"State","desktop-operator","pre-host.log");
    expect(started, `${JSON.stringify(started)} ${fs.existsSync(startupLog)?fs.readFileSync(startupLog,"utf8"):""}`).toMatchObject({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_STARTED", host: "127.0.0.1", port: 4317, claimsGranted: [] });
    ownedPids.add(started.pid);
    expect(alive(started.pid)).toBe(true);
    expect(parse(invoke("start"))).toMatchObject({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_ALREADY_RUNNING", pid: started.pid });
    expect(parse(invoke("status"))).toMatchObject({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_RUNNING", pid: started.pid, gatewayIdentityVerified: true, claimsGranted: [] });
    const prep=JSON.parse(fs.readFileSync(preparation,"utf8")),legacyToken=crypto.createHash("sha256").update(`${prep.nonce}:${crypto.createHash("sha256").update(fs.readFileSync(host)).digest("hex")}:shutdown`).digest("hex"),unauthorized=await lifecycleRequest(legacyToken);
    expect(unauthorized.status).not.toBe(200);
    expect(fs.existsSync(tokenPath())).toBe(true);
    const activeToken=fs.readFileSync(tokenPath(),"utf8").trim();
    expect(activeToken).not.toBe(legacyToken);
    const tree = deriveSubjectProcessTree([{ timestamp: started.startedAt, pid: started.pid, parentPid: started.parentPid, executableName: "node.exe", executablePath: started.runtimePath, ownerSid: started.subjectSid, sessionId: 2 }], { collectorPid: started.parentPid, runtimePid: started.parentPid, desktopPid: started.pid, subjectSid: started.subjectSid, windowsSessionId: 2 }, { startedAt: started.startedAt, completedAt: new Date(Date.parse(started.startedAt) + 1_000).toISOString() });
    expect(tree.some((event: any) => event.pid === started.pid)).toBe(true);
    expect(parse(invoke("stop"))).toMatchObject({ ok: true, status: "PACKAGED_DESKTOP_OPERATOR_STOPPED", pid: started.pid, claimsGranted: [] });
    expect(fs.existsSync(tokenPath())).toBe(false);
    expect(fs.readFileSync(path.join(path.dirname(preparation),"desktop-operator","pre-lifecycle.json"),"utf8")).not.toContain(activeToken);
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  }, 30_000);

  it("prohibits restart after immutable STOP evidence", () => {
    const deadPid = JSON.parse(fs.readFileSync(controlPath(), "utf8")).pid;
    expect(alive(deadPid)).toBe(false);
    expect(parse(invoke("start"))).toMatchObject({ ok: false, status:"BLOCKED", reasonCode: "PACKAGED_DESKTOP_OPERATOR_LIFECYCLE_SEALED", claimsGranted:[] });
  }, 30_000);

  it("rejects each PRE/POST lifecycle semantic mutation at the production binding layer", () => {
    const prep = JSON.parse(fs.readFileSync(preparation, "utf8")), manifest = JSON.parse(fs.readFileSync(release.manifestPath, "utf8")), pre = JSON.parse(fs.readFileSync(path.join(path.dirname(preparation), "desktop-operator", "pre-lifecycle.json"), "utf8")), post = { ...structuredClone(pre), stage: "POST_RESTART", pid: pre.pid + 1 };
    expect(auditPackagedDesktopOperatorLifecycle(prep, manifest, pre, post)).toEqual([]);
    const cases: Array<[string, (a: any, b: any) => void, string]> = [
      ["PRE stage", (a) => { a.stage = "POST_RESTART"; }, "PRE_LIFECYCLE_STAGE_MISMATCH"],
      ["POST stage", (_a, b) => { b.stage = "PRE_RESTART"; }, "POST_LIFECYCLE_STAGE_MISMATCH"],
      ["swapped records", (a, b) => { const x = structuredClone(a); Object.assign(a, b); Object.assign(b, x); }, "PRE_LIFECYCLE_STAGE_MISMATCH"],
      ["session", (a) => { a.proofSessionId = "wrong"; }, "PRE_LIFECYCLE_SESSION_MISMATCH"],
      ["nonce digest", (a) => { a.nonceDigest = "0".repeat(64); }, "PRE_LIFECYCLE_NONCE_DIGEST_MISMATCH"],
      ["release identity", (a) => { a.releaseIdentity = "wrong"; }, "PRE_LIFECYCLE_RELEASE_IDENTITY_MISMATCH"],
      ["installation identity", (a) => { a.installationIdentity = "wrong"; }, "PRE_LIFECYCLE_INSTALLATION_IDENTITY_MISMATCH"],
      ["runtime path", (a) => { a.runtimePath += ".wrong"; }, "PRE_LIFECYCLE_RUNTIME_PATH_MISMATCH"],
      ["runtime digest", (a) => { a.runtimeSha256 = "0".repeat(64); }, "PRE_LIFECYCLE_RUNTIME_DIGEST_MISMATCH"],
      ["entrypoint path", (a) => { a.entrypointPath += ".wrong"; }, "PRE_LIFECYCLE_ENTRYPOINT_PATH_MISMATCH"],
      ["entrypoint digest", (a) => { a.entrypointSha256 = "0".repeat(64); }, "PRE_LIFECYCLE_ENTRYPOINT_DIGEST_MISMATCH"],
      ["subject SID", (a) => { a.subjectSid = "wrong"; }, "PRE_LIFECYCLE_SUBJECT_SID_MISMATCH"],
      ["host", (a) => { a.host = "0.0.0.0"; }, "PRE_LIFECYCLE_HOST_MISMATCH"],
      ["port", (a) => { a.port = 4318; }, "PRE_LIFECYCLE_PORT_MISMATCH"],
      ["shutdown state", (a) => { a.state = "READY"; }, "PRE_LIFECYCLE_SHUTDOWN_STATE_MISMATCH"],
      ["shutdown request", (a) => { delete a.shutdownRequestedAt; }, "PRE_LIFECYCLE_SHUTDOWN_REQUEST_MISSING"],
      ["exit confirmation", (a) => { a.ownedProcessExitConfirmed = false; }, "PRE_LIFECYCLE_EXIT_UNCONFIRMED"],
      ["invalid timestamp", (a) => { a.startedAt = "invalid"; }, "PRE_LIFECYCLE_TIMESTAMP_INVALID"],
      ["timestamp order", (a) => { a.startedAt = new Date(Date.parse(a.stoppedAt) + 1000).toISOString(); }, "PRE_LIFECYCLE_TIMESTAMP_ORDER_INVALID"],
      ["duplicated identity", (a, b) => { Object.assign(b, a); }, "LIFECYCLE_PRE_POST_IDENTITY_NOT_DISTINCT"],
      ["equal PIDs", (a, b) => { b.pid = a.pid; }, "LIFECYCLE_PRE_POST_IDENTITY_NOT_DISTINCT"],
      ["missing PRE", (a) => { for (const key of Object.keys(a)) delete a[key]; }, "PRE_LIFECYCLE_RECORD_MISSING"],
      ["missing POST", (_a, b) => { for (const key of Object.keys(b)) delete b[key]; }, "POST_LIFECYCLE_RECORD_MISSING"]
    ];
    for (const [name, mutate, reason] of cases) {
      const a = structuredClone(pre), b = structuredClone(post); mutate(a, b);
      expect(auditPackagedDesktopOperatorLifecycle(prep, manifest, a, b), name).toContain(reason);
    }
  });

  it("parses raw PRE/POST observer schema before enforcing lifecycle authority", () => {
    const pre = { pid: 101, startedAt: "2026-07-28T10:00:00.000Z", stoppedAt: "2026-07-28T10:00:10.000Z" }, post = { pid: 202, startedAt: "2026-07-28T11:00:00.000Z", stoppedAt: "2026-07-28T11:00:10.000Z" }, sid = "S-1-5-21-subject", session = 7;
    const raw = (pid:number,time:string,overrides:any={}) => JSON.stringify({ eventTimestamp:time, pid, parentPid:1, processName:"node.exe", enrichment:{ executablePath:runtime, ownerSid:sid, sessionId:session, ...overrides } });
    const controlText = `${raw(pre.pid,"2026-07-28T10:00:05.000Z")}\n${raw(post.pid,"2026-07-28T11:00:05.000Z")}\n`, control = parseRawObserverEvents(controlText);
    expect(auditLifecycleObserverAuthority(control,pre,post,sid,session,runtime)).toEqual([]);
    const cases: Array<[string, any[], string]> = [
      ["wrong PRE PID", control.map(e=>e.pid===pre.pid?{...e,pid:999}:e), "PRE_LIFECYCLE_RAW_PROCESS_MISSING"],
      ["wrong POST PID", control.map(e=>e.pid===post.pid?{...e,pid:999}:e), "POST_LIFECYCLE_RAW_PROCESS_MISSING"],
      ["wrong SID", control.map(e=>e.pid===pre.pid?{...e,ownerSid:"wrong"}:e), "PRE_LIFECYCLE_RAW_SID_MISMATCH"],
      ["wrong session", control.map(e=>e.pid===pre.pid?{...e,sessionId:8}:e), "PRE_LIFECYCLE_RAW_SESSION_MISMATCH"],
      ["wrong runtime", control.map(e=>e.pid===pre.pid?{...e,executablePath:`${runtime}.wrong`}:e), "PRE_LIFECYCLE_RAW_RUNTIME_PATH_MISMATCH"],
      ["outside time", control.map(e=>e.pid===pre.pid?{...e,timestamp:"2026-07-28T09:00:00.000Z"}:e), "PRE_LIFECYCLE_RAW_TIME_WINDOW_MISMATCH"],
      ["missing PRE", control.filter(e=>e.pid!==pre.pid), "PRE_LIFECYCLE_RAW_PROCESS_MISSING"],
      ["missing POST", control.filter(e=>e.pid!==post.pid), "POST_LIFECYCLE_RAW_PROCESS_MISSING"],
      ["lifecycle only", [], "PRE_LIFECYCLE_RAW_PROCESS_MISSING"],
      ["PRE cannot substitute POST", control.filter(e=>e.pid===pre.pid), "POST_LIFECYCLE_RAW_PROCESS_MISSING"],
      ["copied PID invalid authority", control.map(e=>e.pid===pre.pid?{...e,ownerSid:"wrong",pid:pre.pid}:e), "PRE_LIFECYCLE_RAW_SID_MISMATCH"]
    ];
    for(const [name,events,reason] of cases)expect(auditLifecycleObserverAuthority(events,pre,post,sid,session,runtime),name).toContain(reason);
    expect(auditLifecycleObserverAuthority(control,{...pre,pid:999},post,sid,session,runtime)).toContain("PRE_LIFECYCLE_RAW_PROCESS_MISSING");
  });

  it("rejects a fake listener identity and does not terminate it", async () => {
    const fakeScript = "require('node:http').createServer((q,s)=>{s.setHeader('content-type','application/json');s.end(JSON.stringify({ok:true,data:{version:'fake'}}))}).listen(4317,'127.0.0.1')";
    const fake = spawn(runtime, ["-e", fakeScript], { cwd: release.packageRoot, windowsHide: true, stdio: "ignore", shell: false });
    if (!fake.pid) throw new Error("fake listener did not start");
    ownedPids.add(fake.pid);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const prep = JSON.parse(fs.readFileSync(preparation, "utf8"));
    const recordPath = controlPath();
    fs.mkdirSync(path.dirname(recordPath), { recursive: true });
    fs.writeFileSync(recordPath, JSON.stringify({
      schemaVersion: "sera.packaged-desktop-operator-lifecycle.v1",
      stage: "PRE_RESTART",
      proofSessionId: prep.sessionId,
      releaseIdentity: prep.installationBinding.releaseIdentity,
      runtimeSha256: prep.subjectCollector.runtimeSha256,
      entrypointSha256: prep.subjectCollector.sha256,
      pid: fake.pid,
      subjectSid: prep.expectedProofSid,
      host: "127.0.0.1",
      port: 4317
    }));
    const stopped = parse(invoke("stop"));
    expect(stopped).toMatchObject({ ok: false, status: "BLOCKED" });
    expect(["PACKAGED_DESKTOP_OPERATOR_IDENTITY_MISMATCH", "PACKAGED_DESKTOP_OPERATOR_IDENTITY_UNAVAILABLE", "PACKAGED_DESKTOP_OPERATOR_NOT_RUNNING"]).toContain(stopped.reasonCode);
    expect(alive(fake.pid)).toBe(true);
    process.kill(fake.pid);
    ownedPids.delete(fake.pid);
    fs.rmSync(recordPath, { force: true });
  }, 30_000);

  it("serializes a bounded START/finalization race through the shared production lock", () => {
    const fixture=prepareFixture("transition-race");
    let racedStart:any;
    expectFinalizationBlocked(fixture,"PACKAGED_DESKTOP_OPERATOR_LIFECYCLE_REQUIRED",{onTransitionLocked:()=>{
      racedStart=invokeFor(fixture,"PRE_RESTART","start");
    }});
    expect(parse(racedStart)).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_TRANSITION_AMBIGUOUS",claimsGranted:[]});
    expect(fs.existsSync(fixturePaths(fixture,"PRE_RESTART").seal)).toBe(false);
    const started=parse(invokeFor(fixture,"PRE_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED",claimsGranted:[]});
    ownedPids.add(started.pid);
    expect(parse(invokeFor(fixture,"PRE_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid,claimsGranted:[]});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },45_000);

  it("rejects finalization while the real PRE lifecycle is independently active", () => {
    const fixture=prepareFixture("active-pre-finalization"),files=fixturePaths(fixture,"PRE_RESTART");
    const started=parse(invokeFor(fixture,"PRE_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED",claimsGranted:[]});
    ownedPids.add(started.pid);
    expect(parse(invokeFor(fixture,"PRE_RESTART","status"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_RUNNING",gatewayIdentityVerified:true});
    expectFinalizationBlocked(fixture,"PACKAGED_DESKTOP_OPERATOR_OWNED_PROCESS_ACTIVE");
    expect(fs.existsSync(files.seal)).toBe(false);
    expect(parse(invokeFor(fixture,"PRE_RESTART","status"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_RUNNING",pid:started.pid});
    expect(parse(invokeFor(fixture,"PRE_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },45_000);

  it("rejects finalization while the real POST lifecycle is independently active", () => {
    const fixture=prepareFixture("active-post-finalization"),files=fixturePaths(fixture,"POST_RESTART");
    writeStoppedLifecycle(fixture,"PRE_RESTART",2_147_483_646);
    const started=parse(invokeFor(fixture,"POST_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED",stage:"POST_RESTART",claimsGranted:[]});
    ownedPids.add(started.pid);
    expect(parse(invokeFor(fixture,"POST_RESTART","status"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_RUNNING",gatewayIdentityVerified:true});
    expectFinalizationBlocked(fixture,"PACKAGED_DESKTOP_OPERATOR_OWNED_PROCESS_ACTIVE");
    expect(fs.existsSync(files.seal)).toBe(false);
    expect(parse(invokeFor(fixture,"POST_RESTART","status"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_RUNNING",pid:started.pid});
    expect(parse(invokeFor(fixture,"POST_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },45_000);

  it("rejects matching forged JSON when the recorded PID is live but unrelated", async () => {
    const fixture=prepareFixture("unrelated-recorded-pid"),prep=JSON.parse(fs.readFileSync(fixture,"utf8")),manifest=JSON.parse(fs.readFileSync(release.manifestPath,"utf8")),files=fixturePaths(fixture,"PRE_RESTART");
    const unrelated=spawn(runtime,["-e","setInterval(()=>{},1000)"],{cwd:release.packageRoot,windowsHide:true,stdio:"ignore",shell:false});
    if(!unrelated.pid)throw new Error("unrelated process did not start");
    ownedPids.add(unrelated.pid);
    const identity={schemaVersion:"sera.packaged-desktop-operator-lifecycle.v1",stage:"PRE_RESTART",proofSessionId:prep.sessionId,releaseIdentity:prep.installationBinding.releaseIdentity,runtimeSha256:prep.subjectCollector.runtimeSha256,entrypointSha256:manifest.desktopOperator.host.sha256,pid:unrelated.pid,subjectSid:prep.expectedProofSid,host:"127.0.0.1",port:4317};
    const fakeScript=`const h=require('node:http');const identity=${JSON.stringify(identity)};h.createServer((q,s)=>{s.setHeader('content-type','application/json');s.end(JSON.stringify({ok:true,data:identity}))}).listen(4317,'127.0.0.1')`;
    const listener=spawn(runtime,["-e",fakeScript],{cwd:release.packageRoot,windowsHide:true,stdio:"ignore",shell:false});
    if(!listener.pid)throw new Error("forged listener did not start");
    ownedPids.add(listener.pid);
    await new Promise((resolve)=>setTimeout(resolve,300));
    fs.mkdirSync(path.dirname(files.control),{recursive:true});
    fs.writeFileSync(files.control,`${JSON.stringify(identity)}\n`);
    const rejected=parse(invokeFor(fixture,"PRE_RESTART","stop"));
    expect(rejected).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_LISTENER_OWNER_MISMATCH",claimsGranted:[]});
    expect(alive(unrelated.pid)).toBe(true);
    expect(alive(listener.pid)).toBe(true);
    process.kill(listener.pid);process.kill(unrelated.pid);
    ownedPids.delete(listener.pid);ownedPids.delete(unrelated.pid);
    fs.rmSync(files.control,{force:true});
  },30_000);

  it("detects listener replacement between the two production ownership inspections", () => {
    const fixture=prepareFixture("listener-replacement");
    const started=parse(invokeFor(fixture,"PRE_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED"});
    ownedPids.add(started.pid);
    const rejected=parse(invokeFor(fixture,"PRE_RESTART","status",{SERA_DESKTOP_OPERATOR_TEST_LISTENER_SEQUENCE:JSON.stringify([started.pid,started.pid+100_000])}));
    expect(rejected).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_LISTENER_REPLACED",claimsGranted:[]});
    expect(alive(started.pid)).toBe(true);
    expect(parse(invokeFor(fixture,"PRE_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },30_000);

  it("rejects a process-creation timestamp mismatch without terminating the owned lifecycle", () => {
    const fixture=prepareFixture("process-creation-mismatch"),files=fixturePaths(fixture,"PRE_RESTART");
    const started=parse(invokeFor(fixture,"PRE_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED"});
    ownedPids.add(started.pid);
    const original=JSON.parse(fs.readFileSync(files.control,"utf8"));
    fs.writeFileSync(files.control,`${JSON.stringify({...original,processCreationDate:"2000-01-01T00:00:00.000Z"})}\n`);
    expect(parse(invokeFor(fixture,"PRE_RESTART","status"))).toMatchObject({ok:false,reasonCode:"PACKAGED_DESKTOP_OPERATOR_PROCESS_CREATION_MISMATCH",claimsGranted:[]});
    expect(alive(started.pid)).toBe(true);
    fs.writeFileSync(files.control,`${JSON.stringify({...original,subjectSid:"S-1-5-21-unrelated"})}\n`);
    expect(parse(invokeFor(fixture,"PRE_RESTART","status"))).toMatchObject({ok:false,reasonCode:"PACKAGED_DESKTOP_OPERATOR_IDENTITY_MISMATCH",claimsGranted:[]});
    expect(alive(started.pid)).toBe(true);
    fs.writeFileSync(files.control,`${JSON.stringify(original)}\n`);
    expect(parse(invokeFor(fixture,"PRE_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },30_000);

  it("rejects a runtime executable-image mismatch without terminating the owned lifecycle", () => {
    const fixture=prepareFixture("runtime-image-mismatch");
    const started=parse(invokeFor(fixture,"PRE_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED"});
    ownedPids.add(started.pid);
    expect(parse(invokeFor(fixture,"PRE_RESTART","status",{SERA_DESKTOP_OPERATOR_TEST_PROCESS_DETAILS:JSON.stringify({executablePath:`${runtime}.unrelated`})}))).toMatchObject({ok:false,reasonCode:"PACKAGED_DESKTOP_OPERATOR_RUNTIME_IMAGE_MISMATCH",claimsGranted:[]});
    expect(alive(started.pid)).toBe(true);
    expect(parse(invokeFor(fixture,"PRE_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },30_000);

  it("rejects a Windows-session mismatch without terminating the owned lifecycle", () => {
    const fixture=prepareFixture("windows-session-mismatch"),files=fixturePaths(fixture,"PRE_RESTART");
    const started=parse(invokeFor(fixture,"PRE_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED"});
    ownedPids.add(started.pid);
    const original=JSON.parse(fs.readFileSync(files.control,"utf8"));
    fs.writeFileSync(files.control,`${JSON.stringify({...original,windowsSessionId:Number(original.windowsSessionId)+1})}\n`);
    expect(parse(invokeFor(fixture,"PRE_RESTART","status"))).toMatchObject({ok:false,reasonCode:"PACKAGED_DESKTOP_OPERATOR_WINDOWS_SESSION_MISMATCH",claimsGranted:[]});
    expect(alive(started.pid)).toBe(true);
    fs.writeFileSync(files.control,`${JSON.stringify(original)}\n`);
    expect(parse(invokeFor(fixture,"PRE_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },30_000);

  it("bounds startup timeout cleanup and emits exactly one claimless CLI error", () => {
    const fixture=prepareFixture("startup-timeout"),prep=JSON.parse(fs.readFileSync(fixture,"utf8")),files=fixturePaths(fixture,"PRE_RESTART");
    const timedOut=invokeFor(fixture,"PRE_RESTART","start",{SERA_DESKTOP_OPERATOR_TEST_START_TIMEOUT_MS:"150",SERA_DESKTOP_OPERATOR_TEST_SERVE_DELAY_MS:"1000"});
    const output=jsonOutputLines(timedOut);
    expect(timedOut.status).toBe(1);
    expect(output).toHaveLength(1);
    expect(String(timedOut.stdout).split(/\r?\n/).filter((line:string)=>line.trim().startsWith("{"))).toHaveLength(0);
    expect(JSON.parse(output[0])).toMatchObject({ok:false,status:"BLOCKED",reasonCode:"PACKAGED_DESKTOP_OPERATOR_START_TIMEOUT",claimsGranted:[]});
    expect(`${timedOut.stdout}${timedOut.stderr}`).not.toContain(prep.nonce);
    expect(`${timedOut.stdout}${timedOut.stderr}`).not.toContain("shutdown");
    expect(fs.existsSync(files.control)).toBe(false);
    expect(fs.existsSync(files.lifecycle)).toBe(false);
    const started=parse(invokeFor(fixture,"PRE_RESTART","start"));
    expect(started).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STARTED"});
    ownedPids.add(started.pid);
    expect(parse(invokeFor(fixture,"PRE_RESTART","stop"))).toMatchObject({ok:true,status:"PACKAGED_DESKTOP_OPERATOR_STOPPED",pid:started.pid});
    expect(alive(started.pid)).toBe(false);
    ownedPids.delete(started.pid);
  },45_000);
});
