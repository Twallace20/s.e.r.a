import fs from "node:fs";
import path from "node:path";
import { normalizedTreeDigest, sha256, sha256File } from "./restricted-user-evidence";

export const PRIVILEGED_OBSERVER_PROFILE = "privileged-observer-sidecar-v1";
const relObserver = "collectors/privileged-observer.cjs";
const relMonitor = "collectors/process-start-monitor.ps1";
const relRuntime = "runtime/node.exe";
const devTools = /^(git|npm|npx|codex|code|devenv|cl|msbuild|winget|choco)(\.exe|\.cmd)?$/i;

export function parseObserverJsonText(text:string):any {
  return JSON.parse(text.charCodeAt(0)===0xfeff?text.slice(1):text);
}

export function readObserverJsonFile(file:string):any {
  return parseObserverJsonText(fs.readFileSync(file,"utf8"));
}

export function isOwnedObserverChild(ownedPid:number,candidatePid:number):boolean {
  return Number.isInteger(ownedPid)&&ownedPid>0&&candidatePid===ownedPid;
}

export interface PrivilegedObserverAuditInput {
  releaseRoot:string; repositoryRoot:string; releaseManifest:any; preparation:any;
  observerStart:any; observerComplete:any; subject:any; workflowStart:any; workflowComplete:any;
  observerSpool:any; events:any[]; runtimePath:string; observerPath:string; monitorPath:string;
  preObserver?:any; postObserver?:any;
}

export function auditPrivilegedObserver(i:PrivilegedObserverAuditInput):string[]{
  const reasons:string[]=[]; const fail=(code:string,pass:boolean)=>{if(!pass&&!reasons.includes(code))reasons.push(code)};
  const real=(p:string)=>{try{return fs.realpathSync(p)}catch{return ""}};
  const inside=(p:string,r:string)=>{const a=real(p),b=real(r);return !!a&&!!b&&a.toLowerCase().startsWith(`${b.toLowerCase()}${path.sep}`)};
  const digest=(p:string)=>{try{return sha256File(p)}catch{return ""}};
  const entry=(rel:string)=>i.releaseManifest.files?.find((x:any)=>x.path===rel);
  const prepared=(rel:string)=>i.preparation.collectors?.find((x:any)=>x.relativePath===rel);
  fail("PRIVILEGED_OBSERVER_REQUIRED",i.observerStart.elevated===true&&i.observerStart.integrityLevel==="High"&&(i.observerStart.enabledGroupSids??[]).includes("S-1-5-32-544"));
  fail("OBSERVER_SUBJECT_SID_COLLISION",i.observerStart.observerSid!==i.subject.proofSid);
  fail("SUBJECT_TOKEN_ELEVATED",i.subject.tokenElevated===false&&i.subject.elevationType==="limited");
  fail("SUBJECT_ADMINISTRATORS_MEMBERSHIP",!(i.subject.enabledGroupSids??[]).includes("S-1-5-32-544"));
  fail("SUBJECT_PERFORMANCE_LOG_USERS_MEMBERSHIP",!(i.subject.groupSids??[]).includes("S-1-5-32-559"));
  fail("OBSERVER_OUTSIDE_RELEASE",inside(i.observerPath,i.releaseRoot));
  fail("OBSERVER_DIGEST_MISMATCH",digest(i.observerPath)===entry(relObserver)?.sha256&&digest(i.observerPath)===prepared(relObserver)?.sha256&&digest(i.observerPath)===i.observerStart.observerSha256);
  fail("OBSERVER_MONITOR_DIGEST_MISMATCH",digest(i.monitorPath)===entry(relMonitor)?.sha256&&digest(i.monitorPath)===prepared(relMonitor)?.sha256&&digest(i.monitorPath)===i.observerStart.monitorSha256);
  fail("OBSERVER_RUNTIME_DIGEST_MISMATCH",digest(i.runtimePath)===entry(relRuntime)?.sha256&&digest(i.runtimePath)===i.observerStart.runtimeSha256);
  fail("OBSERVER_REPOSITORY_CODE_PROHIBITED",!inside(i.observerPath,i.repositoryRoot)&&!inside(i.monitorPath,i.repositoryRoot));
  fail("OBSERVER_HANDSHAKE_MISSING",i.observerStart.ready===true&&i.observerStart.subscriptionState==="SUBSCRIBED");
  fail("OBSERVER_SUBSCRIPTION_ACCESS_DENIED",i.observerStart.failure?.classification!=="ACCESS_DENIED");
  fail("OBSERVER_SUBSCRIPTION_STALLED",i.observerStart.failure?.classification!=="TIMEOUT");
  fail("OBSERVER_STARTED_TOO_LATE",Date.parse(i.observerStart.observerReadyAt)<Date.parse(i.workflowStart.subjectWorkflowStartedAt));
  fail("OBSERVER_STOPPED_TOO_EARLY",Date.parse(i.observerComplete.observerStoppedAt)>Date.parse(i.workflowComplete.subjectWorkflowCompletedAt));
  fail("OBSERVER_EVENT_FLUSH_INCOMPLETE",i.observerComplete.flushed===true&&(i.observerComplete.subscriptionState==="UNSUBSCRIBED"||i.observerComplete.unsubscribed===true));
  fail("OBSERVER_SPOOL_WRITABLE_BY_SUBJECT",i.observerSpool.subjectCanModify===false&&i.observerSpool.aclVerified===true);
  fail("OBSERVER_SESSION_MISMATCH",i.observerStart.sessionId===i.preparation.sessionId&&i.observerComplete.sessionId===i.preparation.sessionId);
  fail("OBSERVER_NONCE_MISMATCH",i.observerStart.nonce===i.preparation.nonce&&i.observerComplete.nonce===i.preparation.nonce);
  fail("OBSERVER_SUBJECT_SID_MISMATCH",i.observerStart.subjectSid===i.preparation.expectedProofSid&&i.subject.proofSid===i.preparation.expectedProofSid);
  fail("OBSERVER_INJECTED_EVENTS_PROHIBITED",i.observerStart.sourceEventType==="Win32_ProcessStartTrace"&&(i.events??[]).every(e=>e.injected!==true));
  fail("OBSERVER_POLLER_PROHIBITED",i.observerStart.polling!==true&&i.observerStart.liveSubscription===true);
  const events=i.events??[];
  fail("OBSERVER_PROHIBITED_GIT",!events.some(e=>/^git\.exe$/i.test(e.executableName)));
  fail("OBSERVER_PROHIBITED_NPM",!events.some(e=>/^n(pm|px)(\.cmd)?$/i.test(e.executableName)));
  const runtimeDigest=digest(i.runtimePath),badNode=events.some(e=>/^node\.exe$/i.test(e.executableName)&&(real(e.executablePath).toLowerCase()!==real(i.runtimePath).toLowerCase()||e.executableSha256!==runtimeDigest));
  fail("OBSERVER_WRONG_NODE_IDENTITY",!badNode&&!events.some(e=>devTools.test(e.executableName)&&!/^git|n(pm|px)/i.test(e.executableName)));
  if(i.preObserver||i.postObserver)fail("OBSERVER_RESTART_ORDER_MISMATCH",i.preObserver?.sessionId===i.postObserver?.sessionId&&i.preObserver?.nonce===i.postObserver?.nonce&&i.preObserver?.releaseIdentity===i.postObserver?.releaseIdentity&&i.preObserver?.subjectSid===i.postObserver?.subjectSid&&i.preObserver?.bootIdentity!==i.postObserver?.bootIdentity&&i.preObserver?.pid!==i.postObserver?.pid&&Date.parse(i.preObserver?.stoppedAt)<Date.parse(i.postObserver?.readyAt));
  fail("OBSERVER_SMOKE_PROMOTION_ATTEMPT",i.observerStart.invocation==="REAL_RESTRICTED_USER_PROOF");
  fail("REPOSITORY_OBSERVER_EVIDENCE_PROHIBITED",i.observerStart.repositoryDelegation!==true||i.observerStart.invocation!=="REAL_RESTRICTED_USER_PROOF");
  return reasons.sort();
}

export function privilegedObserverPlan(preparationPath:string,stage:"PRE_RESTART"|"POST_RESTART"="PRE_RESTART"):Record<string,unknown>{
  const prep=JSON.parse(fs.readFileSync(path.resolve(preparationPath),"utf8"));
  const root=fs.realpathSync(prep.release.expectedExtractionRoot),runtime=path.join(root,"runtime","node.exe"),observer=path.join(root,"collectors","privileged-observer.cjs"),monitor=path.join(root,"collectors","process-start-monitor.ps1"),observerRoot=path.resolve(prep.observerRoot),nonceFile=path.resolve(preparationPath);if(observerRoot!==path.resolve(prep.observerRoot)||observerRoot.startsWith(`${root}${path.sep}`)||observerRoot.startsWith(`${path.resolve(prep.repository.canonicalPath)}${path.sep}`))throw new Error("OBSERVER_ROOT_MISMATCH");
  const args=[observer,"start","--stage",stage,"--monitor-script",monitor,"--preparation",path.resolve(preparationPath),"--session-id",prep.sessionId,"--nonce-file",nonceFile,"--subject-sid",prep.expectedProofSid,"--observer-root",observerRoot];
  return{ok:true,status:"PRIVILEGED_OBSERVER_PLAN_ONLY",profileId:prep.profileId,observerProfile:PRIVILEGED_OBSERVER_PROFILE,requiresManualElevation:true,credentialsEmbedded:false,runtime,args,command:[`& '${runtime.replaceAll("'","''")}'`,...args.map((v:string)=>`'${v.replaceAll("'","''")}'`)].join(" "),aclPlan:observerAclPlan(root,path.dirname(path.resolve(preparationPath)),observerRoot,prep.expectedProofSid),claimsGranted:[]};
}

export function observerAclPlan(releaseRoot:string,subjectRoot:string,observerRoot:string,subjectSid:string):Record<string,unknown>{
  return{status:"PLAN_ONLY_NOT_APPLIED",apply:[`icacls "${releaseRoot}" /grant *${subjectSid}:(OI)(CI)RX`,`icacls "${subjectRoot}" /grant *${subjectSid}:(OI)(CI)M`,`icacls "${observerRoot}" /inheritance:r`,`icacls "${observerRoot}" /grant:r *S-1-5-32-544:(OI)(CI)F`,`icacls "${observerRoot}" /deny *${subjectSid}:(OI)(CI)W`],rollback:[`icacls "${observerRoot}" /remove:d *${subjectSid}`,`icacls "${observerRoot}" /inheritance:e`,`icacls "${subjectRoot}" /remove:g *${subjectSid}`,`icacls "${releaseRoot}" /remove:g *${subjectSid}`],applied:false};
}

export function verifyPrivilegedObserverEvidence(subjectRootInput:string,observerRootInput:string):Record<string,unknown>{
  const subjectRoot=path.resolve(subjectRootInput),observerRoot=path.resolve(observerRootInput),read=(root:string,name:string)=>{try{return JSON.parse(fs.readFileSync(path.join(root,...name.split("/")),"utf8"))}catch{return {}}};
  const preparation=read(subjectRoot,"preparation-manifest.json"),subject=read(subjectRoot,"pre/account-token.json"),workflowStart=read(subjectRoot,"pre/workflow-start.json"),workflowComplete=read(subjectRoot,"pre/workflow-complete.json"),observerStart=read(observerRoot,"observer-start.json"),observerComplete=read(observerRoot,"monitor-complete.json"),spool=read(observerRoot,"spool-protection.json"),releaseRoot=String(preparation.release?.expectedExtractionRoot??""),releaseManifest=read(releaseRoot,"release-manifest.json"),eventsFile=path.join(observerRoot,"monitor-events.ndjson"),events=fs.existsSync(eventsFile)?fs.readFileSync(eventsFile,"utf8").split(/\r?\n/).filter(Boolean).map(line=>{const e=JSON.parse(line);return{...e,timestamp:e.eventTimestamp,executableName:e.processName,executablePath:e.enrichment?.executablePath,ownerSid:e.enrichment?.ownerSid,sessionId:e.enrichment?.sessionId}}):[];
  const reasons=auditPrivilegedObserver({releaseRoot,repositoryRoot:String(preparation.repository?.canonicalPath??""),releaseManifest,preparation,observerStart,observerComplete,subject,workflowStart:{subjectWorkflowStartedAt:workflowStart.workflowStartedAt},workflowComplete:{subjectWorkflowCompletedAt:workflowComplete.workflowCompletedAt},observerSpool:spool,events,runtimePath:path.join(releaseRoot,"runtime","node.exe"),observerPath:path.join(releaseRoot,"collectors","privileged-observer.cjs"),monitorPath:path.join(releaseRoot,"collectors","process-start-monitor.ps1")});
  if(!fs.existsSync(path.join(observerRoot,"observer-start.json")))reasons.push("OBSERVER_START_EVIDENCE_MISSING");
  const unique=[...new Set(reasons)].sort();
  return{ok:unique.length===0,valid:unique.length===0,status:unique.length===0?"PRIVILEGED_OBSERVER_EVIDENCE_VALID":"BLOCKED",observerEvidenceVerified:unique.length===0,evidenceDigest:fs.existsSync(observerRoot)?normalizedTreeDigest(observerRoot):undefined,sessionId:preparation.sessionId,nonceDigest:preparation.nonce?sha256(preparation.nonce):undefined,subjectSid:preparation.expectedProofSid,observerSid:observerStart.observerSid,reasonCodes:unique,claimsGranted:[]};
}

export interface SubjectObserverIntegrationAuditInput { subjectCollector:any; observerReady:any; observerComplete:any; preparation:any; subject:any; localGroups:any[]; tokenGroups:any[]; subjectRootPresent:boolean; observerRootPresent:boolean; subjectEvidencePresent:boolean; observerEvidencePresent:boolean; subjectHostProfileId:string; observerHostProfileId:string; subjectReleaseIdentity:string; observerReleaseIdentity:string; subjectBootStage:string; observerBootStage:string; workflowStart:any; workflowComplete:any; events:any[]; processRoots:any; requiredEvidenceClasses:Record<string,boolean>; subsetClaims:string[]; requestedClaims:string[]; }

export function deriveSubjectProcessTree(events:any[],roots:{collectorPid:number;runtimePid:number;desktopPid:number;subjectSid:string;windowsSessionId:number|string},window:{startedAt:string;completedAt:string}):any[]{
  const byPid=new Map(events.map(e=>[e.pid,e])),selected=new Set<number>(),queue=[roots.collectorPid,roots.runtimePid,roots.desktopPid].filter(Number.isInteger);
  while(queue.length){const pid=queue.shift()!;if(selected.has(pid))continue;const event:any=byPid.get(pid);if(!event)continue;if(event.ownerSid!==roots.subjectSid||String(event.sessionId)!==String(roots.windowsSessionId))continue;if(Date.parse(event.timestamp)<Date.parse(window.startedAt)||Date.parse(event.timestamp)>Date.parse(window.completedAt))continue;selected.add(pid);for(const child of events.filter(e=>e.parentPid===pid))queue.push(child.pid)}
  return events.filter(e=>selected.has(e.pid));
}

export function auditSubjectObserverIntegration(i:SubjectObserverIntegrationAuditInput):string[]{
  const reasons:string[]=[];const fail=(c:string,p:boolean)=>{if(!p&&!reasons.includes(c))reasons.push(c)};const ready=i.observerReady??{},complete=i.observerComplete??{},prep=i.preparation??{},events=i.events??[];
  fail("SUBJECT_MONITOR_PROHIBITED",i.subjectCollector.startsLiveMonitor!==true);
  fail("SUBJECT_POLLER_PROHIBITED",i.subjectCollector.polling!==true);
  fail("PRIVILEGED_OBSERVER_READY_REQUIRED",ready.ready===true);
  fail("OBSERVER_READY_STALE",Date.now()-Date.parse(ready.observerReadyAt)<15*60*1000||ready.allowHistoricalFixture===true);
  fail("OBSERVER_SESSION_MISMATCH",ready.sessionId===prep.sessionId);
  fail("OBSERVER_NONCE_MISMATCH",ready.nonce===prep.nonce);
  fail("OBSERVER_SUBJECT_SID_MISMATCH",ready.subjectSid===prep.expectedProofSid);
  fail("OBSERVER_RELEASE_MISMATCH",ready.releaseIdentity===i.subjectReleaseIdentity);
  fail("PRIVILEGED_OBSERVER_REQUIRED",ready.elevated===true);
  fail("OBSERVER_INJECTED_EVENTS_PROHIBITED",ready.injected!==true&&ready.sourceEventType==="Win32_ProcessStartTrace");
  fail("OBSERVER_SMOKE_PROMOTION_ATTEMPT",ready.invocation==="REAL_RESTRICTED_USER_PROOF");
  fail("OBSERVER_STOPPED_TOO_EARLY",Date.parse(complete.observerStoppedAt)>Date.parse(i.workflowComplete.subjectWorkflowCompletedAt));
  fail("SUBJECT_EVIDENCE_ROOT_REQUIRED",i.subjectRootPresent);
  fail("OBSERVER_EVIDENCE_ROOT_REQUIRED",i.observerRootPresent);
  fail("SUBJECT_EVIDENCE_REQUIRED",i.subjectEvidencePresent);
  fail("OBSERVER_EVIDENCE_REQUIRED",i.observerEvidencePresent);
  fail("CROSS_ROOT_HOST_PROFILE_MISMATCH",i.subjectHostProfileId===i.observerHostProfileId);
  fail("CROSS_ROOT_RELEASE_MISMATCH",i.subjectReleaseIdentity===i.observerReleaseIdentity);
  fail("CROSS_ROOT_BOOT_STAGE_MISMATCH",i.subjectBootStage===i.observerBootStage);
  fail("SUBSET_VERIFIER_CLAIM_PROHIBITED",i.subsetClaims.length===0);
  fail("SUBJECT_VERIFIER_CLAIM_PROHIBITED",(i.subjectCollector.claimsGranted??[]).length===0);
  const admin="S-1-5-32-544",perf="S-1-5-32-559",localSids=i.localGroups.map(g=>g.sid),tokenSids=i.tokenGroups.map(g=>g.sid);
  fail("SUBJECT_ADMINISTRATOR_MEMBERSHIP",!localSids.includes(admin)&&!tokenSids.includes(admin));
  fail("SUBJECT_PERFORMANCE_LOG_USERS_MEMBERSHIP",!localSids.includes(perf)&&!tokenSids.includes(perf));
  fail("SUBJECT_GROUP_EVIDENCE_INCOMPLETE",i.localGroups.length>0&&i.tokenGroups.length>0&&[...i.localGroups,...i.tokenGroups].every(g=>/^S-1-5-/.test(g.sid)&&g.resolved===true));
  fail("SUBJECT_GROUP_EVIDENCE_CONFLICT",localSids.every(s=>tokenSids.includes(s))&&tokenSids.every(s=>localSids.includes(s)));
  fail("LOCALIZED_GROUP_SID_RESOLUTION_FAILED",[...i.localGroups,...i.tokenGroups].every(g=>!g.name||g.resolved===true));
  const tree=deriveSubjectProcessTree(events,i.processRoots,{startedAt:i.workflowStart.subjectWorkflowStartedAt,completedAt:i.workflowComplete.subjectWorkflowCompletedAt});
  fail("SUBJECT_PROCESS_TREE_UNDERIVED",tree.length>=3);
  fail("PROHIBITED_GIT_PROCESS",!tree.some(e=>/^git\.exe$/i.test(e.executableName)));
  fail("PROHIBITED_NPM_PROCESS",!tree.some(e=>/^n(pm|px)(\.cmd)?$/i.test(e.executableName)));
  fail("SYSTEM_NODE_OBSERVED",!tree.some(e=>/^node\.exe$/i.test(e.executableName)&&e.releaseContained!==true));
  fail("OBSERVER_INFRASTRUCTURE_MISCLASSIFIED",!tree.some(e=>e.observerInfrastructure===true));
  fail("DEVELOPMENT_SMOKE_PROMOTION_ATTEMPT",ready.invocation==="REAL_RESTRICTED_USER_PROOF");
  fail("REQUIRED_EVIDENCE_CLASS_MISSING",Object.values(i.requiredEvidenceClasses).length>0&&Object.values(i.requiredEvidenceClasses).every(Boolean));
  fail("CROSS_HOST_CLAIM_PROHIBITED",!i.requestedClaims.includes("CROSS_HOST_PORTABILITY_PROVEN"));
  fail("ALL_SUBSET_VERIFIERS_CLAIMLESS",i.subsetClaims.length===0&&(i.subjectCollector.claimsGranted??[]).length===0);
  return reasons.sort();
}
