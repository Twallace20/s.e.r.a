import fs from "node:fs";
import { vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { auditLiveBinding, buildPortableBaseMvp, sha256File } from "@sera/portable-base-mvp";

vi.setConfig({ testTimeout: 35_000 });

function fixture():any{const base=fs.mkdtempSync(path.join(os.tmpdir(),"sera-live-binding-")),releaseRoot=path.join(base,"SERA Release"),repositoryRoot=path.join(base,"repository"),runtimePath=path.join(releaseRoot,"runtime","node.exe"),collectorPath=path.join(releaseRoot,"collectors","restricted-user-collector.cjs"),monitorPath=path.join(releaseRoot,"collectors","process-start-monitor.ps1");for(const [p,v] of [[runtimePath,"runtime"],[collectorPath,"collector"],[monitorPath,"monitor"]]){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,v);}fs.mkdirSync(repositoryRoot);const record=(p:string,rel:string)=>({path:rel,sha256:sha256File(p)}),releaseManifest={files:[record(collectorPath,"collectors/restricted-user-collector.cjs"),record(monitorPath,"collectors/process-start-monitor.ps1")]},preparation={preparedAt:"2026-07-21T00:00:00.000Z",collectors:[{relativePath:"collectors/restricted-user-collector.cjs",sha256:sha256File(collectorPath)},{relativePath:"collectors/process-start-monitor.ps1",sha256:sha256File(monitorPath)}]},evidenceManifest={sessionId:"session",nonce:"nonce"},provenance={invocation:"REAL_RESTRICTED_USER_PROOF",releaseRoot,runtimePath,collectorPath,monitorPath,collectorSha256:sha256File(collectorPath),monitorSha256:sha256File(monitorPath),collectorPid:10,runtimePid:10,startedAt:"2026-07-21T00:00:01.000Z"},monitor={liveSubscription:true,sourceEventType:"Win32_ProcessStartTrace",readyHandshake:true,flushed:true,completeness:"COMPLETE",sessionId:"session",nonce:"nonce",proofSid:"sid",startedAt:"2026-07-21T00:00:02.000Z",stoppedAt:"2026-07-21T01:00:00.000Z",events:[]},workflowStart={workflowStartedAt:"2026-07-21T00:01:00.000Z"},workflowComplete={workflowCompletedAt:"2026-07-21T00:59:00.000Z"};return{base,input:{releaseRoot,repositoryRoot,releaseManifest,preparation,evidenceManifest,provenance,monitor,workflowStart,workflowComplete,runtimePath,collectorPath,monitorPath,proofSid:"sid"}};}
const cases:Array<[string,string,(f:any)=>void]>=[
 ["injected production monitor","PRODUCTION_MONITOR_INJECTED",f=>f.input.monitor.liveSubscription=false],
 ["missing handshake","LIVE_SUBSCRIPTION_HANDSHAKE_MISSING",f=>f.input.monitor.readyHandshake=false],
 ["late monitor","MONITOR_STARTED_TOO_LATE",f=>f.input.monitor.startedAt="2026-07-21T00:02:00.000Z"],
 ["early stop","MONITOR_STOPPED_TOO_EARLY",f=>f.input.monitor.stoppedAt="2026-07-21T00:30:00.000Z"],
 ["interruption","MONITOR_INTERRUPTED",f=>f.input.monitor.completeness="INTERRUPTED"],
 ["incomplete flush","EVENT_FLUSH_INCOMPLETE",f=>f.input.monitor.flushed=false],
 ["session mismatch","MONITOR_SESSION_MISMATCH",f=>f.input.monitor.sessionId="other"],
 ["nonce mismatch","MONITOR_NONCE_MISMATCH",f=>f.input.monitor.nonce="other"],
 ["SID mismatch","MONITOR_PROOF_SID_MISMATCH",f=>f.input.monitor.proofSid="other"],
 ["Git","PROHIBITED_GIT_PROCESS",f=>f.input.monitor.events.push({executableName:"git.exe"})],
 ["npm","PROHIBITED_NPM_PROCESS",f=>f.input.monitor.events.push({executableName:"npm.cmd"})],
 ["system Node","SYSTEM_NODE_OBSERVED",f=>f.input.monitor.events.push({executableName:"node.exe",executablePath:"C:\\Program Files\\nodejs\\node.exe"})],
 ["wrong Node digest","SYSTEM_NODE_OBSERVED",f=>f.input.monitor.events.push({executableName:"node.exe",executablePath:f.input.runtimePath,executableSha256:"0".repeat(64)})],
 ["repository collector","COLLECTOR_EXECUTED_FROM_REPOSITORY",f=>{const p=path.join(f.input.repositoryRoot,"collector.cjs");fs.writeFileSync(p,"x");f.input.collectorPath=p;}],
 ["outside collector","COLLECTOR_OUTSIDE_RELEASE",f=>{const p=path.join(f.base,"copied.cjs");fs.writeFileSync(p,"x");f.input.collectorPath=p;}],
 ["altered collector","COLLECTOR_DIGEST_ALTERED",f=>fs.appendFileSync(f.input.collectorPath,"altered")],
 ["altered monitor","PROCESS_MONITOR_DIGEST_ALTERED",f=>fs.appendFileSync(f.input.monitorPath,"altered")],
 ["different releases","RUNTIME_COLLECTOR_RELEASE_MISMATCH",f=>{const p=path.join(f.base,"other","runtime","node.exe");fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,"runtime");f.input.runtimePath=p;}],
 ["manifest omission","RELEASE_MANIFEST_OMITS_COLLECTOR",f=>f.input.releaseManifest.files=[]],
 ["preparation mismatch","PREPARATION_COLLECTOR_MISMATCH",f=>f.input.preparation.collectors=[]],
 ["evidence before preparation","EVIDENCE_BEFORE_PREPARATION",f=>f.input.provenance.startedAt="2026-07-20T00:00:00.000Z"],
 ["collector PID mismatch","COLLECTOR_PROCESS_IDENTITY_MISMATCH",f=>f.input.provenance.collectorPid=11],
 ["reparse escape","COLLECTOR_REPARSE_ESCAPE",f=>{const outside=path.join(f.base,"outside.cjs");fs.writeFileSync(outside,"x");try{fs.rmSync(f.input.collectorPath);fs.symlinkSync(outside,f.input.collectorPath,"file");}catch{f.input.collectorPath=outside;}}],
 ["smoke promotion","DEVELOPMENT_SMOKE_PROMOTION_ATTEMPT",f=>f.input.provenance.invocation="NON_PROMOTABLE_DEVELOPMENT_SMOKE"],
 ["repository direct promotion","REPOSITORY_DIRECT_PROMOTABLE_COLLECTION",f=>f.input.provenance.repositoryDelegation=true]
];
describe("live monitor and release collector binding v4",()=>{
 it("accepts the complete binding fixture",()=>{const f=fixture();expect(auditLiveBinding(f.input)).toEqual([]);});
 it.each(cases)("returns the precise reason for %s",(_name,reason,mutate)=>{const f=fixture();mutate(f);expect(auditLiveBinding(f.input)).toContain(reason);});
 it("keeps a denied packaged monitor smoke non-promotable",()=>{if(process.platform!=="win32")return;const root=fs.mkdtempSync(path.join(os.tmpdir(),"sera-live-smoke-release-")),release=buildPortableBaseMvp({projectRoot:process.cwd(),outputRoot:root}),evidence=fs.mkdtempSync(path.join(os.tmpdir(),"sera-live-smoke-evidence-")),collector=path.join(release.packageRoot,"collectors","restricted-user-collector.cjs"),monitor=path.join(release.packageRoot,"collectors","process-start-monitor.ps1"),prep={repository:{canonicalPath:process.cwd()},sessionId:"smoke-session",nonce:"smoke-nonce",expectedProofSid:"S-1-5-21-development-smoke",collectors:[{path:collector,relativePath:"collectors/restricted-user-collector.cjs",sha256:sha256File(collector)},{path:monitor,relativePath:"collectors/process-start-monitor.ps1",sha256:sha256File(monitor)}]};fs.writeFileSync(path.join(evidence,"preparation-manifest.json"),JSON.stringify(prep));const result=spawnSync(path.join(release.packageRoot,"runtime","node.exe"),[collector,"smoke",evidence],{shell:false,encoding:"utf8",timeout:30000,cwd:release.packageRoot,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,TEMP:process.env.TEMP,TMP:process.env.TMP,SERA_PROOF_INVOCATION:"NON_PROMOTABLE_DEVELOPMENT_SMOKE"}});const line=(String(result.stdout).trim().split(/\r?\n/).pop()||String(result.stderr).trim().split(/\r?\n/).pop()||"{}"),output=JSON.parse(line);expect(["NON_PROMOTABLE_DEVELOPMENT_SMOKE","BLOCKED"]).toContain(output.status);expect(output.claimsGranted).toEqual([]);if(output.status==="NON_PROMOTABLE_DEVELOPMENT_SMOKE")expect(output.eventCount).toBeGreaterThan(0);else expect(output.reasonCode).toBe("LIVE_MONITOR_HANDSHAKE_MISSING");fs.rmSync(root,{recursive:true,force:true});fs.rmSync(evidence,{recursive:true,force:true});});
});
