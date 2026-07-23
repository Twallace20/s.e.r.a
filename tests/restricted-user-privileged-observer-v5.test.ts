import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { auditPrivilegedObserver, auditSubjectObserverIntegration, buildPortableBaseMvp, isOwnedObserverChild, parseObserverJsonText, privilegedObserverPlan, sha256File } from "@sera/portable-base-mvp";

const roots:string[]=[];
vi.setConfig({testTimeout:35_000});
afterEach(()=>{for(const root of roots.splice(0))fs.rmSync(root,{recursive:true,force:true})});
function fixture():any{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"sera-observer-v5-"));roots.push(base);
  const releaseRoot=path.join(base,"release"),repositoryRoot=path.join(base,"repo"),runtimePath=path.join(releaseRoot,"runtime","node.exe"),observerPath=path.join(releaseRoot,"collectors","privileged-observer.cjs"),monitorPath=path.join(releaseRoot,"collectors","process-start-monitor.ps1");
  for(const [file,data] of [[runtimePath,"runtime"],[observerPath,"observer"],[monitorPath,"monitor"]]){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data)}fs.mkdirSync(repositoryRoot);
  const record=(file:string,rel:string)=>({path:rel,size:fs.statSync(file).size,sha256:sha256File(file)}),releaseManifest={version:"portable-offline-base-mvp-v1",files:[record(runtimePath,"runtime/node.exe"),record(observerPath,"collectors/privileged-observer.cjs"),record(monitorPath,"collectors/process-start-monitor.ps1")]},collectors=releaseManifest.files.filter((x:any)=>x.path.startsWith("collectors/")).map((x:any)=>({...x,relativePath:x.path,path:path.join(releaseRoot,...x.path.split("/"))})),preparation={sessionId:"session",nonce:"nonce",expectedProofSid:"subject",hostProfileId:"host",collectors,release:{expectedExtractionRoot:releaseRoot}},observerStart={invocation:"REAL_RESTRICTED_USER_PROOF",elevated:true,integrityLevel:"High",enabledGroupSids:["S-1-5-32-544"],observerSid:"observer",subjectSid:"subject",ready:true,subscriptionState:"SUBSCRIBED",sourceEventType:"Win32_ProcessStartTrace",polling:false,liveSubscription:true,observerReadyAt:"2026-07-21T00:00:00Z",sessionId:"session",nonce:"nonce",runtimeSha256:sha256File(runtimePath),observerSha256:sha256File(observerPath),monitorSha256:sha256File(monitorPath),repositoryDelegation:false},observerComplete={observerStoppedAt:"2026-07-21T02:00:00Z",flushed:true,subscriptionState:"UNSUBSCRIBED",sessionId:"session",nonce:"nonce"},subject={proofSid:"subject",tokenElevated:false,elevationType:"limited",enabledGroupSids:[],groupSids:[]},workflowStart={subjectWorkflowStartedAt:"2026-07-21T00:10:00Z"},workflowComplete={subjectWorkflowCompletedAt:"2026-07-21T01:50:00Z"},observerSpool={subjectCanModify:false,aclVerified:true},events:any[]=[],preObserver={sessionId:"session",nonce:"nonce",releaseIdentity:"release",subjectSid:"subject",bootIdentity:"boot1",pid:10,stoppedAt:"2026-07-21T02:00:00Z"},postObserver={sessionId:"session",nonce:"nonce",releaseIdentity:"release",subjectSid:"subject",bootIdentity:"boot2",pid:11,readyAt:"2026-07-22T00:00:00Z"};
  return{base,input:{releaseRoot,repositoryRoot,releaseManifest,preparation,observerStart,observerComplete,subject,workflowStart,workflowComplete,observerSpool,events,runtimePath,observerPath,monitorPath,preObserver,postObserver}};
}
const cases:Array<[string,string,(f:any)=>void]>=[
 ["non-elevated observer","PRIVILEGED_OBSERVER_REQUIRED",f=>f.input.observerStart.elevated=false],
 ["observer SID collision","OBSERVER_SUBJECT_SID_COLLISION",f=>f.input.observerStart.observerSid="subject"],
 ["elevated subject","SUBJECT_TOKEN_ELEVATED",f=>f.input.subject.tokenElevated=true],
 ["subject Administrators membership","SUBJECT_ADMINISTRATORS_MEMBERSHIP",f=>f.input.subject.enabledGroupSids.push("S-1-5-32-544")],
 ["subject Performance Log Users membership","SUBJECT_PERFORMANCE_LOG_USERS_MEMBERSHIP",f=>f.input.subject.groupSids.push("S-1-5-32-559")],
 ["outside observer","OBSERVER_OUTSIDE_RELEASE",f=>{const p=path.join(f.base,"observer.cjs");fs.writeFileSync(p,"observer");f.input.observerPath=p}],
 ["observer digest mismatch","OBSERVER_DIGEST_MISMATCH",f=>fs.appendFileSync(f.input.observerPath,"x")],
 ["monitor digest mismatch","OBSERVER_MONITOR_DIGEST_MISMATCH",f=>fs.appendFileSync(f.input.monitorPath,"x")],
 ["runtime digest mismatch","OBSERVER_RUNTIME_DIGEST_MISMATCH",f=>fs.appendFileSync(f.input.runtimePath,"x")],
 ["repository observer","OBSERVER_REPOSITORY_CODE_PROHIBITED",f=>{const p=path.join(f.input.repositoryRoot,"observer.cjs");fs.writeFileSync(p,"x");f.input.observerPath=p}],
 ["missing handshake","OBSERVER_HANDSHAKE_MISSING",f=>f.input.observerStart.ready=false],
 ["access denied subscription","OBSERVER_SUBSCRIPTION_ACCESS_DENIED",f=>f.input.observerStart.failure={classification:"ACCESS_DENIED"}],
 ["stalled subscription","OBSERVER_SUBSCRIPTION_STALLED",f=>f.input.observerStart.failure={classification:"TIMEOUT"}],
 ["late observer","OBSERVER_STARTED_TOO_LATE",f=>f.input.observerStart.observerReadyAt="2026-07-21T00:20:00Z"],
 ["early observer stop","OBSERVER_STOPPED_TOO_EARLY",f=>f.input.observerComplete.observerStoppedAt="2026-07-21T01:00:00Z"],
 ["incomplete flush","OBSERVER_EVENT_FLUSH_INCOMPLETE",f=>f.input.observerComplete.flushed=false],
 ["subject-writable spool","OBSERVER_SPOOL_WRITABLE_BY_SUBJECT",f=>f.input.observerSpool.subjectCanModify=true],
 ["session mismatch","OBSERVER_SESSION_MISMATCH",f=>f.input.observerStart.sessionId="other"],
 ["nonce mismatch","OBSERVER_NONCE_MISMATCH",f=>f.input.observerStart.nonce="other"],
 ["subject SID mismatch","OBSERVER_SUBJECT_SID_MISMATCH",f=>f.input.observerStart.subjectSid="other"],
 ["injected production event","OBSERVER_INJECTED_EVENTS_PROHIBITED",f=>f.input.events.push({injected:true})],
 ["production poller","OBSERVER_POLLER_PROHIBITED",f=>f.input.observerStart.polling=true],
 ["Git event","OBSERVER_PROHIBITED_GIT",f=>f.input.events.push({executableName:"git.exe"})],
 ["npm event","OBSERVER_PROHIBITED_NPM",f=>f.input.events.push({executableName:"npm.cmd"})],
 ["wrong Node identity","OBSERVER_WRONG_NODE_IDENTITY",f=>f.input.events.push({executableName:"node.exe",executablePath:path.join(f.base,"node.exe"),executableSha256:"0".repeat(64)})],
 ["restart order mismatch","OBSERVER_RESTART_ORDER_MISMATCH",f=>f.input.postObserver.bootIdentity="boot1"],
 ["smoke relabel","OBSERVER_SMOKE_PROMOTION_ATTEMPT",f=>f.input.observerStart.invocation="NON_PROMOTABLE_DEVELOPMENT_SMOKE"],
 ["repository observer evidence","REPOSITORY_OBSERVER_EVIDENCE_PROHIBITED",f=>f.input.observerStart.repositoryDelegation=true]
];
describe("privileged observer sidecar v5",()=>{
  it("accepts a complete observer binding",()=>{const f=fixture();expect(auditPrivilegedObserver(f.input)).toEqual([])});
  it.each(cases)("returns the precise reason for %s",(_name,reason,mutate)=>{const f=fixture();mutate(f);expect(auditPrivilegedObserver(f.input)).toContain(reason)});
  it("emits a plan only, with no credentials and unapplied ACL commands",()=>{const f=fixture(),prep=path.join(f.base,"preparation-manifest.json");f.input.preparation.observerRoot=path.join(f.base,"observer-spool");f.input.preparation.repository={canonicalPath:path.join(f.base,"repo")};fs.writeFileSync(prep,JSON.stringify(f.input.preparation));const plan:any=privilegedObserverPlan(prep);expect(plan.status).toBe("PRIVILEGED_OBSERVER_PLAN_ONLY");expect(plan.requiresManualElevation).toBe(true);expect(plan.credentialsEmbedded).toBe(false);expect(plan.aclPlan.applied).toBe(false);expect(plan.claimsGranted).toEqual([])});
});

describe("observer JSON BOM boundary v5.1",()=>{
  it("parses ready JSON without a BOM",()=>expect(parseObserverJsonText('{"ready":true}')).toEqual({ready:true}));
  it("parses ready JSON with exactly one BOM",()=>expect(parseObserverJsonText('\ufeff{"ready":true}')).toEqual({ready:true}));
  it("rejects malformed JSON after BOM removal",()=>expect(()=>parseObserverJsonText('\ufeff{"ready":')).toThrow());
  it("rejects arbitrary leading characters",()=>expect(()=>parseObserverJsonText('x{"ready":true}')).toThrow());
  it("uses explicit no-BOM PowerShell JSON writers",()=>{const script=fs.readFileSync(path.join(process.cwd(),"packages","portable-base-mvp","collectors","process-start-monitor.ps1"),"utf8");expect(script).toContain("System.Text.UTF8Encoding($false)");expect(script).toContain("Write-Utf8NoBom");expect(script).toContain("Add-Utf8NoBom");expect(script).not.toMatch(/ConvertTo-Json[^\r\n]*Set-Content[^\r\n]*Encoding UTF8/)});
  it("packages the centralized BOM-safe parser at the ready boundary",()=>{const out=fs.mkdtempSync(path.join(os.tmpdir(),"sera-bom-release-"));roots.push(out);const release=buildPortableBaseMvp({projectRoot:process.cwd(),outputRoot:out}),observer=fs.readFileSync(path.join(release.packageRoot,"collectors","privileged-observer.cjs"),"utf8");expect(observer).toContain("readObserverJsonFile(readyPath)");expect(observer).toContain("OBSERVER_READY_JSON_INVALID")});
  it("requests cleanup of its owned child after parser failure",()=>{expect(isOwnedObserverChild(34004,34004)).toBe(true);const source=fs.readFileSync(path.join(process.cwd(),"packages","portable-base-mvp","src","portable-base-mvp.ts"),"utf8");expect(source).toContain("terminateOwnedMonitor('OBSERVER_READY_JSON_INVALID')")});
  it("does not authorize unrelated process termination",()=>{expect(isOwnedObserverChild(34004,34005)).toBe(false);expect(isOwnedObserverChild(0,0)).toBe(false)});
});

function integrationFixture():any{const now=new Date(),ready=new Date(now.getTime()-60_000).toISOString(),start=new Date(now.getTime()-30_000).toISOString(),end=new Date(now.getTime()+30_000).toISOString(),stop=new Date(now.getTime()+60_000).toISOString(),sid="S-1-5-21-subject",group={sid:"S-1-5-32-545",name:"Localized Users",resolved:true},events=[{pid:10,parentPid:1,ownerSid:sid,sessionId:2,timestamp:start,executableName:"restricted-user-collector.cjs"},{pid:11,parentPid:10,ownerSid:sid,sessionId:2,timestamp:start,executableName:"node.exe",releaseContained:true},{pid:12,parentPid:11,ownerSid:sid,sessionId:2,timestamp:start,executableName:"desktop-operator.exe"}];return{subjectCollector:{startsLiveMonitor:false,polling:false,claimsGranted:[]},observerReady:{ready:true,observerReadyAt:ready,allowHistoricalFixture:true,sessionId:"s",nonce:"n",subjectSid:sid,releaseIdentity:"r",elevated:true,sourceEventType:"Win32_ProcessStartTrace",injected:false,invocation:"REAL_RESTRICTED_USER_PROOF"},observerComplete:{observerStoppedAt:stop},preparation:{sessionId:"s",nonce:"n",expectedProofSid:sid},subject:{proofSid:sid},localGroups:[group],tokenGroups:[group],subjectRootPresent:true,observerRootPresent:true,subjectEvidencePresent:true,observerEvidencePresent:true,subjectHostProfileId:"h",observerHostProfileId:"h",subjectReleaseIdentity:"r",observerReleaseIdentity:"r",subjectBootStage:"pre",observerBootStage:"pre",workflowStart:{subjectWorkflowStartedAt:start},workflowComplete:{subjectWorkflowCompletedAt:end},events,processRoots:{collectorPid:10,runtimePid:11,desktopPid:12,subjectSid:sid,windowsSessionId:2},requiredEvidenceClasses:{governance:true,preparation:true,account:true,source:true,release:true,observer:true,processTree:true,environment:true,network:true,provider:true,desktop:true,visual:true,persistence:true,restart:true,recurrence:true,manifest:true},subsetClaims:[],requestedClaims:[]}}
const integrationCases:Array<[string,string,(x:any)=>void]>=[
 ["subject live monitor","SUBJECT_MONITOR_PROHIBITED",x=>x.subjectCollector.startsLiveMonitor=true],
 ["subject polling","SUBJECT_POLLER_PROHIBITED",x=>x.subjectCollector.polling=true],
 ["missing observer ready","PRIVILEGED_OBSERVER_READY_REQUIRED",x=>x.observerReady.ready=false],
 ["stale observer ready","OBSERVER_READY_STALE",x=>{x.observerReady.allowHistoricalFixture=false;x.observerReady.observerReadyAt="2000-01-01T00:00:00Z"}],
 ["observer session mismatch","OBSERVER_SESSION_MISMATCH",x=>x.observerReady.sessionId="x"],
 ["observer nonce mismatch","OBSERVER_NONCE_MISMATCH",x=>x.observerReady.nonce="x"],
 ["observer subject mismatch","OBSERVER_SUBJECT_SID_MISMATCH",x=>x.observerReady.subjectSid="x"],
 ["observer release mismatch","OBSERVER_RELEASE_MISMATCH",x=>x.observerReady.releaseIdentity="x"],
 ["observer non-elevated","PRIVILEGED_OBSERVER_REQUIRED",x=>x.observerReady.elevated=false],
 ["injected observer","OBSERVER_INJECTED_EVENTS_PROHIBITED",x=>x.observerReady.injected=true],
 ["observer smoke evidence","OBSERVER_SMOKE_PROMOTION_ATTEMPT",x=>x.observerReady.invocation="NON_PROMOTABLE_DEVELOPMENT_SMOKE"],
 ["observer early stop","OBSERVER_STOPPED_TOO_EARLY",x=>x.observerComplete.observerStoppedAt="2000-01-01T00:00:00Z"],
 ["missing subject root","SUBJECT_EVIDENCE_ROOT_REQUIRED",x=>x.subjectRootPresent=false],
 ["missing observer root","OBSERVER_EVIDENCE_ROOT_REQUIRED",x=>x.observerRootPresent=false],
 ["observer-only evidence","SUBJECT_EVIDENCE_REQUIRED",x=>x.subjectEvidencePresent=false],
 ["subject-only evidence","OBSERVER_EVIDENCE_REQUIRED",x=>x.observerEvidencePresent=false],
 ["mixed host profiles","CROSS_ROOT_HOST_PROFILE_MISMATCH",x=>x.observerHostProfileId="x"],
 ["mixed releases","CROSS_ROOT_RELEASE_MISMATCH",x=>x.observerReleaseIdentity="x"],
 ["mixed boot stages","CROSS_ROOT_BOOT_STAGE_MISMATCH",x=>x.observerBootStage="post"],
 ["observer subset claims","SUBSET_VERIFIER_CLAIM_PROHIBITED",x=>x.subsetClaims.push("RELEASE_INDEPENDENCE_PROVEN")],
 ["subject subset claims","SUBJECT_VERIFIER_CLAIM_PROHIBITED",x=>x.subjectCollector.claimsGranted.push("RELEASE_INDEPENDENCE_PROVEN")],
 ["subject Administrator","SUBJECT_ADMINISTRATOR_MEMBERSHIP",x=>x.localGroups.push({sid:"S-1-5-32-544",resolved:true})],
 ["subject Performance Log Users","SUBJECT_PERFORMANCE_LOG_USERS_MEMBERSHIP",x=>x.tokenGroups.push({sid:"S-1-5-32-559",resolved:true})],
 ["missing token groups","SUBJECT_GROUP_EVIDENCE_INCOMPLETE",x=>x.tokenGroups=[]],
 ["group evidence conflict","SUBJECT_GROUP_EVIDENCE_CONFLICT",x=>x.tokenGroups.push({sid:"S-1-5-32-546",resolved:true})],
 ["unresolved localized group","LOCALIZED_GROUP_SID_RESOLUTION_FAILED",x=>x.tokenGroups[0].resolved=false],
 ["underived subject tree","SUBJECT_PROCESS_TREE_UNDERIVED",x=>x.events=[]],
 ["Git in subject tree","PROHIBITED_GIT_PROCESS",x=>x.events.push({...x.events[2],pid:13,parentPid:12,executableName:"git.exe"})],
 ["npm in subject tree","PROHIBITED_NPM_PROCESS",x=>x.events.push({...x.events[2],pid:13,parentPid:12,executableName:"npm.cmd"})],
 ["system Node in subject tree","SYSTEM_NODE_OBSERVED",x=>x.events.push({...x.events[2],pid:13,parentPid:12,executableName:"node.exe",releaseContained:false})],
 ["observer infrastructure in subject tree","OBSERVER_INFRASTRUCTURE_MISCLASSIFIED",x=>x.events.push({...x.events[2],pid:13,parentPid:12,observerInfrastructure:true,executableName:"powershell.exe"})],
 ["smoke relabel","DEVELOPMENT_SMOKE_PROMOTION_ATTEMPT",x=>x.observerReady.invocation="NON_PROMOTABLE_DEVELOPMENT_SMOKE"],
 ["missing evidence class","REQUIRED_EVIDENCE_CLASS_MISSING",x=>x.requiredEvidenceClasses.restart=false],
 ["cross-host claim injection","CROSS_HOST_CLAIM_PROHIBITED",x=>x.requestedClaims.push("CROSS_HOST_PORTABILITY_PROVEN")]
];
describe("subject and privileged observer integration v5.2",()=>{
 it("accepts localized names when well-known SIDs resolve",()=>expect(auditSubjectObserverIntegration(integrationFixture())).toEqual([]));
 it.each(integrationCases)("returns the precise integration reason for %s",(_n,reason,mutate)=>{const x=integrationFixture();mutate(x);expect(auditSubjectObserverIntegration(x)).toContain(reason)});
 it("keeps every subset verifier claimless",()=>{const x=integrationFixture();expect(x.subsetClaims).toEqual([]);expect(x.subjectCollector.claimsGranted).toEqual([]);expect(auditSubjectObserverIntegration(x)).not.toContain("ALL_SUBSET_VERIFIERS_CLAIMLESS")});
});
