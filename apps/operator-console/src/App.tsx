import { operatorRuntimeStatus } from "./runtime-status";
import { requestIntakeDraft, requestIntakeSafetyGates } from "./request-intake";
import { fileIntakePacket, fileIntakeSafetyGates } from "./file-intake";
import { workflowLibraryPacket, workflowLibrarySafetyGates } from "./workflow-library";
import { workflowComposerPacket, workflowComposerSafetyGates } from "./workflow-composer";
import { planReviewQueuePacket, planReviewQueueSafetyGates } from "./plan-review-queue";
import { ownerReviewDecisionPacket, ownerReviewDecisionSafetyGates } from "./owner-review-decision-draft";
import { ownerDecisionRecordSurfacePacket, ownerDecisionRecordSurfaceSafetyGates } from "./owner-decision-record-surface";
import { localDesktopWorkerBlueprintPacket, localDesktopWorkerBlueprintSafetyGates } from "./local-desktop-worker-blueprint";
import { localWorkerHealthPanelPacket, localWorkerHealthPanelSafetyGates } from "./local-worker-health-panel";
import { localWorkerDryRunHarnessPacket, localWorkerDryRunHarnessSafetyGates } from "./local-worker-dry-run-harness";
import { windowsTaskSchedulerStatusCheckPacket, windowsTaskSchedulerStatusCheckSafetyGates } from "./windows-task-scheduler-status-check";
import { morningStatusPacket, morningStatusPacketSafetyGates } from "./morning-status-packet";
import { localWorkerReadinessGatePacket, localWorkerReadinessGateSafetyGates } from "./local-worker-readiness-gate";
import { localWorkerUnlockProposalPacket, localWorkerUnlockProposalPacketSafetyGates } from "./local-worker-unlock-proposal-packet";
import { localWorkerInstallPlanPacket, localWorkerInstallPlanSafetyGates } from "./local-worker-install-plan";
import { localWorkerInstallApprovalRecordPacket, localWorkerInstallApprovalRecordSafetyGates } from "./local-worker-install-approval-record";
import { localWorkerInstallScopeLockPacket, localWorkerInstallScopeLockSafetyGates } from "./local-worker-install-scope-lock";
import { localWorkerWorkspaceBoundaryPacket, localWorkerWorkspaceBoundarySafetyGates } from "./local-worker-workspace-boundary";

type StatusTone = "online" | "ready" | "planned" | "blocked" | "pending" | "review";

type QueueItem = {
  title: string;
  branch: string;
  risk: "Low" | "Medium" | "High";
  workflow: string;
  status: string;
};

type ActivityItem = {
  label: string;
  detail: string;
  time: string;
};

const navigation = [
  "Command Center",
  "Requests",
  "Overnight Queue",
  "Workflows",
  "Files",
  "Evidence",
  "Safety Gates",
  "Branches",
  "Settings",
];

const systemStatus: Array<{ label: string; value: string; tone: StatusTone }> = [
  { label: "Desktop worker", value: operatorRuntimeStatus.status.desktopWorker, tone: "online" },
  { label: "Local runtime", value: operatorRuntimeStatus.status.localRuntime, tone: "ready" },
  { label: "Request intake", value: requestIntakeDraft.intakeStatus, tone: "review" },
  { label: "File intake", value: fileIntakePacket.fileIntakeStatus, tone: "review" },
  { label: "Workflow library", value: workflowLibraryPacket.workflowLibraryStatus, tone: "ready" },
  { label: "Workflow composer", value: workflowComposerPacket.workflowComposerStatus, tone: "review" },
  { label: "Plan review queue", value: planReviewQueuePacket.planReviewQueueStatus, tone: "review" },
  { label: "Owner decision drafts", value: ownerReviewDecisionPacket.decisionDraftStatus, tone: "review" },
  { label: "Owner decision record surface", value: ownerDecisionRecordSurfacePacket.recordSurfaceStatus, tone: "review" },
  { label: "Desktop worker blueprint", value: localDesktopWorkerBlueprintPacket.workerBlueprintStatus, tone: "planned" },
  { label: "Local worker health", value: localWorkerHealthPanelPacket.healthPanelStatus, tone: "planned" },
  { label: "Worker dry-run harness", value: localWorkerDryRunHarnessPacket.dryRunHarnessStatus, tone: "planned" },
  { label: "Windows scheduler", value: windowsTaskSchedulerStatusCheckPacket.schedulerStatusCheckStatus, tone: "planned" },
  { label: "Morning packet", value: morningStatusPacket.morningStatusPacketStatus, tone: "planned" },
  { label: "Worker readiness gate", value: localWorkerReadinessGatePacket.localWorkerReadinessGateStatus, tone: "planned" },
  { label: "Worker unlock proposal", value: localWorkerUnlockProposalPacket.localWorkerUnlockProposalPacketStatus, tone: "planned" },
  { label: "Worker install plan", value: localWorkerInstallPlanPacket.localWorkerInstallPlanStatus, tone: "planned" },
  { label: "Worker install approval", value: localWorkerInstallApprovalRecordPacket.localWorkerInstallApprovalRecordStatus, tone: "planned" },
  { label: "Worker install scope lock", value: localWorkerInstallScopeLockPacket.localWorkerInstallScopeLockStatus, tone: "planned" },
  { label: "Worker workspace boundary", value: localWorkerWorkspaceBoundaryPacket.localWorkerWorkspaceBoundaryStatus, tone: "planned" },
  { label: "GitHub bridge", value: operatorRuntimeStatus.status.githubBridge, tone: "pending" },
  { label: "Tailscale access", value: operatorRuntimeStatus.status.tailscaleAccess, tone: "planned" },
  { label: "Last check-in", value: operatorRuntimeStatus.status.lastCheckIn, tone: "ready" },
  { label: "Certified level", value: operatorRuntimeStatus.certification.runtimeLevel, tone: "ready" },
  { label: "Free Core", value: operatorRuntimeStatus.certification.freeCore, tone: "ready" },
];

const queueItems: QueueItem[] = [
  {
    title: "Phase 65 local worker workspace boundary",
    branch: "phase-65-local-worker-workspace-boundary-v1",
    risk: "Low",
    workflow: "Local worker workspace boundary",
    status: "Queued",
  },
  {
    title: "Morning packet evidence map",
    branch: "phase-56-morning-status-packet-v1",
    risk: "Medium",
    workflow: "Evidence bundle design",
    status: "Review needed",
  },
  {
    title: "File intake safety contract",
    branch: "phase-49-file-intake-v1",
    risk: "Medium",
    workflow: "Design-only blueprint",
    status: "Draft",
  },
];

const gates = [
  ...localWorkerWorkspaceBoundarySafetyGates,
  ...localWorkerInstallScopeLockSafetyGates,
  ...localWorkerInstallApprovalRecordSafetyGates,
  ...localWorkerInstallPlanSafetyGates,
  ...localWorkerUnlockProposalPacketSafetyGates,
  ...localWorkerReadinessGateSafetyGates,
  ...morningStatusPacketSafetyGates,
  ...windowsTaskSchedulerStatusCheckSafetyGates,
  ...localWorkerDryRunHarnessSafetyGates,
  ...localWorkerHealthPanelSafetyGates,
  ...localDesktopWorkerBlueprintSafetyGates,
  ...ownerDecisionRecordSurfaceSafetyGates,
  ...ownerReviewDecisionSafetyGates,
  ...planReviewQueueSafetyGates,
  ...workflowComposerSafetyGates,
  ...workflowLibrarySafetyGates,
  ...fileIntakeSafetyGates,
  ...requestIntakeSafetyGates,
  "Read-only runtime status packet",
  "Allowed commands only",
  "Branch-only work",
  "No auto-merge",
  "Evidence required",
  "Manual approval required",
  "No backend execution in Phase 46",
  "No authentication yet",
  "No runner connectivity yet",
];

const activity: ActivityItem[] = [
  { label: "Request created", detail: "Private operator app shell", time: "now" },
  { label: "Branch prepared", detail: "phase-46-private-operator-app-shell-v1", time: "next" },
  { label: "Evidence generated", detail: "Phase shell verification packet", time: "planned" },
  { label: "Review pending", detail: "Owner validates build/test/certify", time: "after apply" },
];

const recentFiles = [
  "phase-45-closeout-log.txt",
  "operator-console-prompt.md",
  "sera-roadmap-table-of-contents.md",
];

function Badge({ children, tone = "ready" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Card({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function App() {
  return (
    <main className="operator-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span className="orb" />
          <div>
            <strong>S.E.R.A.</strong>
            <small>Private Operator</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="S.E.R.A. operator navigation">
          {navigation.map((item) => (
            <a key={item} className={item === "Command Center" ? "active" : ""} href={`#${item.toLowerCase().replaceAll(" ", "-")}`}>
              {item}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Badge tone="ready">Local-first</Badge>
          <p>No cloud, no backend execution, no auto-merge in this phase.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{operatorRuntimeStatus.phase.label}</p>
            <h1>Command Center</h1>
          </div>
          <div className="topbar-actions">
            <Badge tone="online">Desktop worker: {operatorRuntimeStatus.status.desktopWorker}</Badge>
            <Badge tone="pending">GitHub bridge: {operatorRuntimeStatus.status.githubBridge}</Badge>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="main-column">
            <Card title="System Status" eyebrow="local runtime snapshot">
              <div className="status-grid">
                {systemStatus.map((item) => (
                  <div className="status-row" key={item.label}>
                    <span>{item.label}</span>
                    <Badge tone={item.tone}>{item.value}</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Create Request" eyebrow="capture-only request intake">
              <form className="request-form">
                <label>
                  Request title
                  <input value={requestIntakeDraft.title} readOnly />
                </label>
                <label>
                  Request details
                  <textarea value={requestIntakeDraft.details} readOnly />
                </label>
                <div className="form-row">
                  <label>
                    Priority
                    <select value={requestIntakeDraft.priority} disabled>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </label>
                  <label>
                    Workflow type
                    <select value={requestIntakeDraft.workflowType} disabled>
                      <option>Phase build</option>
                      <option>Validation review</option>
                      <option>Evidence packet</option>
                      <option>Research brief</option>
                      <option>App improvement</option>
                    </select>
                  </label>
                </div>
                <div className="packet-list">
                  <span>Requested by: {requestIntakeDraft.requestedBy}</span>
                  <span>Suggested queue: {requestIntakeDraft.routing.suggestedQueue}</span>
                  <span>Safety class: {requestIntakeDraft.safetyClassification}</span>
                  <span>Execution allowed: {requestIntakeDraft.boundaries.commandExecutionAllowed ? "yes" : "no"}</span>
                </div>
                <div className="button-row">
                  <button type="button" className="secondary" disabled>Attach files in Phase 49</button>
                  <button type="button" disabled>Capture draft only</button>
                </div>
                <p className="muted">Phase 48 captures and classifies requests for owner review. It does not submit, route, execute, or connect to a runner.</p>
              </form>
            </Card>

            <Card title="Overnight Queue" eyebrow="branch-only preview">
              <div className="queue-list">
                {queueItems.map((item) => (
                  <article className="queue-item" key={item.title}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.branch}</p>
                    </div>
                    <span>{item.workflow}</span>
                    <Badge tone={item.risk === "Low" ? "ready" : "review"}>{item.risk}</Badge>
                    <Badge tone="pending">{item.status}</Badge>
                  </article>
                ))}
              </div>
            </Card>

            <Card title="File Intake" eyebrow="accepted local context">
              <p className="muted">Upload logs, zips, screenshots, markdown files, or project folders. Phase 46 records the shell only; Phase 49 wires real local intake.</p>
              <div className="file-drop">Drop files here · .txt .md .zip .png .jpg project folders</div>
              <div className="file-list">
                {recentFiles.map((file) => <span key={file}>{file}</span>)}
              </div>
            </Card>
          </div>

          <aside className="review-panel">
            <Card title="Safety Gates" eyebrow="always visible">
              <ul className="gate-list">
                {gates.map((gate) => <li key={gate}>{gate}</li>)}
              </ul>
            </Card>

            <Card title="Request Intake Review" eyebrow="owner-gated">
              <div className="packet-list">
                <span>Phase: {requestIntakeDraft.phase.label}</span>
                <span>Status: {requestIntakeDraft.intakeStatus}</span>
                <span>Suggested queue: {requestIntakeDraft.routing.suggestedQueue}</span>
                <span>Owner review required: {requestIntakeDraft.routing.reviewRequired ? "yes" : "no"}</span>
                <span>Runner connection: {requestIntakeDraft.routing.runnerConnectionAllowed ? "allowed" : "blocked"}</span>
                <span>Auto-route: {requestIntakeDraft.boundaries.autoRouteAllowed ? "allowed" : "blocked"}</span>
              </div>
            </Card>

            <Card title="File Intake Review" eyebrow="metadata-only">
              <div className="packet-list">
                <span>Phase: {fileIntakePacket.phase.label}</span>
                <span>Status: {fileIntakePacket.fileIntakeStatus}</span>
                <span>Primary file: {fileIntakePacket.primaryFile.name}</span>
                <span>Extension: {fileIntakePacket.primaryFile.extension}</span>
                <span>Category: {fileIntakePacket.primaryFile.category}</span>
                <span>Classification: {fileIntakePacket.primaryFile.classification}</span>
                <span>Suggested queue: {fileIntakePacket.routing.suggestedQueue}</span>
                <span>File execution: {fileIntakePacket.boundaries.fileExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>File mutation: {fileIntakePacket.boundaries.fileMutationAllowed ? "allowed" : "blocked"}</span>
                <span>Auto-processing: {fileIntakePacket.boundaries.autoProcessingAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Choose local file in future phase</button>
                <button type="button" disabled>Capture metadata only</button>
              </div>
              <p className="muted">Phase 49 records file metadata for owner review. It does not read arbitrary files, execute files, mutate files, process contents, or connect to a runner.</p>
            </Card>

            <Card title="Workflow Library Review" eyebrow="catalog-only">
              <div className="packet-list">
                <span>Phase: {workflowLibraryPacket.phase.label}</span>
                <span>Status: {workflowLibraryPacket.workflowLibraryStatus}</span>
                <span>Catalog mode: {workflowLibraryPacket.catalogMode}</span>
                <span>Workflow count: {workflowLibraryPacket.workflows.length}</span>
                <span>Primary workflow: {workflowLibraryPacket.primaryWorkflow.name}</span>
                <span>Category: {workflowLibraryPacket.primaryWorkflow.category}</span>
                <span>Output mode: {workflowLibraryPacket.primaryWorkflow.outputMode}</span>
                <span>Suggested queue: {workflowLibraryPacket.routing.suggestedQueue}</span>
                <span>Command execution: {workflowLibraryPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Auto-route: {workflowLibraryPacket.boundaries.autoRouteAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Compose workflow in Phase 51</button>
                <button type="button" disabled>Review catalog only</button>
              </div>
              <p className="muted">Phase 50 gives S.E.R.A. a private workflow catalog. It does not execute workflows, route requests, connect to runners, or mutate source.</p>
            </Card>

            <Card title="Workflow Composer Review" eyebrow="composition-only">
              <div className="packet-list">
                <span>Phase: {workflowComposerPacket.phase.label}</span>
                <span>Status: {workflowComposerPacket.workflowComposerStatus}</span>
                <span>Composition mode: {workflowComposerPacket.compositionMode}</span>
                <span>Request signal: {workflowComposerPacket.requestSignal.label}</span>
                <span>File signal: {workflowComposerPacket.fileSignal.label}</span>
                <span>Workflow signal: {workflowComposerPacket.workflowSignal.label}</span>
                <span>Plan preview: {workflowComposerPacket.composedPlan.title}</span>
                <span>Suggested queue: {workflowComposerPacket.routing.suggestedQueue}</span>
                <span>Plan steps: {workflowComposerPacket.composedPlan.steps.length}</span>
                <span>Evidence requirements: {workflowComposerPacket.composedPlan.evidenceRequirements.length}</span>
                <span>Command execution: {workflowComposerPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Auto-route: {workflowComposerPacket.boundaries.autoRouteAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Create tasks in Phase 52</button>
                <button type="button" disabled>Review plan preview only</button>
              </div>
              <p className="muted">Phase 51 composes request, file, and workflow signals into a Tyler-reviewable plan preview. It does not create tasks, execute commands, connect to a runner, or mutate source.</p>
            </Card>

            <Card title="Local Plan Review Queue" eyebrow="review-queue-only">
              <div className="packet-list">
                <span>Phase: {planReviewQueuePacket.phase.label}</span>
                <span>Status: {planReviewQueuePacket.planReviewQueueStatus}</span>
                <span>Queue mode: {planReviewQueuePacket.queueMode}</span>
                <span>Queue: {planReviewQueuePacket.queueSummary.queueName}</span>
                <span>Owner: {planReviewQueuePacket.queueSummary.owner}</span>
                <span>Source: {planReviewQueuePacket.queueSummary.sourcePhase}</span>
                <span>Review items: {planReviewQueuePacket.reviewItems.length}</span>
                <span>Pending review: {planReviewQueuePacket.queueSummary.pendingReviewCount}</span>
                <span>Suggested queue: {planReviewQueuePacket.routing.suggestedQueue}</span>
                <span>Owner decision required: {planReviewQueuePacket.routing.ownerDecisionRequired ? "yes" : "no"}</span>
                <span>Command execution: {planReviewQueuePacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Auto-approval: {planReviewQueuePacket.boundaries.autoApprovalAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Create tasks in Phase 53</button>
                <button type="button" disabled>Review queue only</button>
              </div>
              <p className="muted">Phase 52 represents composed plan previews as local review queue items for Tyler. It does not approve, route, execute, connect to a runner, mutate files, or mutate source.</p>
            </Card>

            <Card title="Owner Review Decision Draft" eyebrow="draft-only owner decision flow">
              <div className="packet-list">
                <span>Phase: {ownerReviewDecisionPacket.phase.label}</span>
                <span>Status: {ownerReviewDecisionPacket.decisionDraftStatus}</span>
                <span>Mode: {ownerReviewDecisionPacket.decisionMode}</span>
                <span>Owner: {ownerReviewDecisionPacket.decisionSummary.owner}</span>
                <span>Source queue: {ownerReviewDecisionPacket.decisionSummary.sourceQueue}</span>
                <span>Decision options: {ownerReviewDecisionPacket.decisionOptions.length}</span>
                <span>Active review item: {ownerReviewDecisionPacket.activeReviewItem.title}</span>
                <span>Suggested queue: {ownerReviewDecisionPacket.routing.suggestedQueue}</span>
                <span>Task creation: {ownerReviewDecisionPacket.boundaries.taskCreationAllowed ? "allowed" : "blocked"}</span>
                <span>Final approval: {ownerReviewDecisionPacket.boundaries.finalApprovalAllowed ? "allowed" : "blocked"}</span>
                <span>Command execution: {ownerReviewDecisionPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="queue-list compact">
                {ownerReviewDecisionPacket.decisionOptions.map((option) => (
                  <article className="queue-item" key={option.id}>
                    <div>
                      <strong>{option.label}</strong>
                      <p>{option.allowedNextState}</p>
                    </div>
                    <span>{option.requiresRationale ? "rationale required" : "no rationale"}</span>
                    <Badge tone="review">draft only</Badge>
                  </article>
                ))}
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Record decision in future phase</button>
                <button type="button" disabled>Draft only</button>
              </div>
              <p className="muted">Phase 53 displays Tyler's possible decision paths. It does not record final approval, create tasks, execute commands, route work, connect to a runner, or mutate source.</p>
            </Card>

            <Card title="Owner Decision Record Surface" eyebrow="record-preview-only">
              <div className="packet-list">
                <span>Phase: {ownerDecisionRecordSurfacePacket.phase.label}</span>
                <span>Status: {ownerDecisionRecordSurfacePacket.recordSurfaceStatus}</span>
                <span>Mode: {ownerDecisionRecordSurfacePacket.recordMode}</span>
                <span>Owner: {ownerDecisionRecordSurfacePacket.recordSummary.owner}</span>
                <span>Source decision set: {ownerDecisionRecordSurfacePacket.recordSummary.sourceDecisionSet}</span>
                <span>Record actions: {ownerDecisionRecordSurfacePacket.recordActions.length}</span>
                <span>Selected decision: {ownerDecisionRecordSurfacePacket.selectedDecision.label}</span>
                <span>Record draft: {ownerDecisionRecordSurfacePacket.recordDraft.recordId}</span>
                <span>Rationale status: {ownerDecisionRecordSurfacePacket.recordDraft.rationaleStatus}</span>
                <span>Suggested queue: {ownerDecisionRecordSurfacePacket.routing.suggestedQueue}</span>
                <span>Record persistence: {ownerDecisionRecordSurfacePacket.boundaries.recordPersistenceAllowed ? "allowed" : "blocked"}</span>
                <span>Task creation: {ownerDecisionRecordSurfacePacket.boundaries.taskCreationAllowed ? "allowed" : "blocked"}</span>
                <span>Final approval: {ownerDecisionRecordSurfacePacket.boundaries.finalApprovalAllowed ? "allowed" : "blocked"}</span>
                <span>Command execution: {ownerDecisionRecordSurfacePacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="queue-list compact">
                {ownerDecisionRecordSurfacePacket.recordActions.map((action) => (
                  <article className="queue-item" key={action.id}>
                    <div>
                      <strong>{action.label}</strong>
                      <p>{action.allowedRecordState}</p>
                    </div>
                    <span>{action.requiresOwnerRationale ? "rationale required" : "no rationale"}</span>
                    <Badge tone="review">not persisted</Badge>
                  </article>
                ))}
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Persist record in future phase</button>
                <button type="button" disabled>Record preview only</button>
              </div>
              <p className="muted">Phase 54 shows how Tyler's selected decision would be represented as a governed record preview. It does not persist records, create tasks, execute commands, route work, connect to a runner, or treat recorded intent as final approval.</p>
            </Card>

            <Card title="Local Desktop Worker Blueprint" eyebrow="worker-contract-only">
              <div className="packet-list">
                <span>Phase: {localDesktopWorkerBlueprintPacket.phase.label}</span>
                <span>Status: {localDesktopWorkerBlueprintPacket.workerBlueprintStatus}</span>
                <span>Mode: {localDesktopWorkerBlueprintPacket.blueprintMode}</span>
                <span>Owner: {localDesktopWorkerBlueprintPacket.workerSummary.owner}</span>
                <span>Target runtime: {localDesktopWorkerBlueprintPacket.workerSummary.targetRuntime}</span>
                <span>Worker roles: {localDesktopWorkerBlueprintPacket.workerRoles.length}</span>
                <span>Enabled workers: {localDesktopWorkerBlueprintPacket.workerSummary.enabledWorkerCount}</span>
                <span>Connected workers: {localDesktopWorkerBlueprintPacket.workerSummary.connectedWorkerCount}</span>
                <span>Executable tasks: {localDesktopWorkerBlueprintPacket.workerSummary.executableTaskCount}</span>
                <span>Suggested queue: {localDesktopWorkerBlueprintPacket.routing.suggestedQueue}</span>
                <span>Worker spawn: {localDesktopWorkerBlueprintPacket.boundaries.workerSpawnAllowed ? "allowed" : "blocked"}</span>
                <span>Task execution: {localDesktopWorkerBlueprintPacket.boundaries.taskExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Command execution: {localDesktopWorkerBlueprintPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Runner connection: {localDesktopWorkerBlueprintPacket.boundaries.runnerConnectivityAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="queue-list compact">
                {localDesktopWorkerBlueprintPacket.workerRoles.map((role) => (
                  <article className="queue-item" key={role.id}>
                    <div>
                      <strong>{role.label}</strong>
                      <p>{role.responsibility}</p>
                    </div>
                    <span>{role.authority}</span>
                    <Badge tone="planned">blueprint</Badge>
                  </article>
                ))}
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Connect worker in future phase</button>
                <button type="button" disabled>Blueprint only</button>
              </div>
              <p className="muted">Phase 55 defines the future local desktop worker contract. It does not install a worker, start a worker, execute commands, execute tasks, connect to a runner, persist records, route work, mutate files, or mutate source.</p>
            </Card>

            <Card title="Local Worker Health Panel" eyebrow="declarative health surface">
              <div className="packet-list">
                <span>Phase: {localWorkerHealthPanelPacket.phase.label}</span>
                <span>Status: {localWorkerHealthPanelPacket.healthPanelStatus}</span>
                <span>Mode: {localWorkerHealthPanelPacket.healthPanelMode}</span>
                <span>Owner: {localWorkerHealthPanelPacket.healthSummary.owner}</span>
                <span>Source phase: {localWorkerHealthPanelPacket.healthSummary.sourcePhase}</span>
                <span>Safe state: {localWorkerHealthPanelPacket.healthSummary.safeState}</span>
                <span>Health signals: {localWorkerHealthPanelPacket.healthSignals.length}</span>
                <span>Worker installed: {localWorkerHealthPanelPacket.healthSummary.workerInstalled ? "yes" : "no"}</span>
                <span>Worker connected: {localWorkerHealthPanelPacket.healthSummary.workerConnected ? "yes" : "no"}</span>
                <span>Heartbeat: {localWorkerHealthPanelPacket.healthSummary.heartbeatStatus}</span>
                <span>Suggested queue: {localWorkerHealthPanelPacket.routing.suggestedQueue}</span>
                <span>Health polling: {localWorkerHealthPanelPacket.boundaries.healthPollingAllowed ? "allowed" : "blocked"}</span>
                <span>Worker spawn: {localWorkerHealthPanelPacket.boundaries.workerSpawnAllowed ? "allowed" : "blocked"}</span>
                <span>Task execution: {localWorkerHealthPanelPacket.boundaries.taskExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Command execution: {localWorkerHealthPanelPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="queue-list compact">
                {localWorkerHealthPanelPacket.healthSignals.map((signal) => (
                  <article className="queue-item" key={signal.id}>
                    <div>
                      <strong>{signal.label}</strong>
                      <p>{signal.value}</p>
                    </div>
                    <span>{signal.state}</span>
                    <Badge tone="planned">health surface</Badge>
                  </article>
                ))}
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Poll health in future phase</button>
                <button type="button" disabled>Display only</button>
              </div>
              <p className="muted">Phase 56 displays declarative local worker health readiness. It does not install a worker, start a worker, poll health, inspect processes, execute commands, execute tasks, connect to a runner, persist records, route work, mutate files, or mutate source.</p>
            </Card>

            <Card title="Morning Review Packet" eyebrow="preview">
              <div className="packet-list">
                <span>Summary: {operatorRuntimeStatus.phase.milestone}</span>
                <span>Changed files: runtime status packet wired</span>
                <span>Test results: owner must verify</span>
                <span>Evidence bundle: Phase 47 runtime-reader report required</span>
              </div>
              <p className="muted">{operatorRuntimeStatus.nextRecommendedAction}</p>
              <div className="button-row stacked">
                <button type="button">Approve</button>
                <button type="button" className="secondary">Request changes</button>
                <button type="button" className="danger">Reject</button>
              </div>
            </Card>

            <Card title="Recent Activity" eyebrow="operator feed">
              <div className="activity-feed">
                {activity.map((item) => (
                  <article key={`${item.label}-${item.time}`}>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                    <small>{item.time}</small>
                  </article>
                ))}
              </div>
            </Card>

            <Card title="Local Worker Dry-Run Harness" eyebrow="simulation-only worker practice lane">
              <div className="packet-list">
                <span>Phase: {localWorkerDryRunHarnessPacket.phase.label}</span>
                <span>Status: {localWorkerDryRunHarnessPacket.dryRunHarnessStatus}</span>
                <span>Mode: {localWorkerDryRunHarnessPacket.dryRunHarnessMode}</span>
                <span>Owner: {localWorkerDryRunHarnessPacket.dryRunSummary.owner}</span>
                <span>Source phase: {localWorkerDryRunHarnessPacket.dryRunSummary.sourcePhase}</span>
                <span>Safe state: {localWorkerDryRunHarnessPacket.dryRunSummary.safeState}</span>
                <span>Dry-run steps: {localWorkerDryRunHarnessPacket.dryRunSteps.length}</span>
                <span>Evidence requirements: {localWorkerDryRunHarnessPacket.evidenceRequirements.length}</span>
                <span>Worker installed: {localWorkerDryRunHarnessPacket.dryRunSummary.workerInstalled ? "yes" : "no"}</span>
                <span>Worker connected: {localWorkerDryRunHarnessPacket.dryRunSummary.workerConnected ? "yes" : "no"}</span>
                <span>Executable tasks: {localWorkerDryRunHarnessPacket.dryRunSummary.executableTaskCount}</span>
                <span>Suggested queue: {localWorkerDryRunHarnessPacket.routing.suggestedQueue}</span>
                <span>Task execution: {localWorkerDryRunHarnessPacket.boundaries.taskExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Command execution: {localWorkerDryRunHarnessPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Runner connectivity: {localWorkerDryRunHarnessPacket.boundaries.runnerConnectivityAllowed ? "allowed" : "blocked"}</span>
              </div>
              <div className="queue-list compact">
                {localWorkerDryRunHarnessPacket.dryRunSteps.map((step) => (
                  <article className="queue-item" key={step.id}>
                    <div>
                      <strong>{step.label}</strong>
                      <p>{step.evidence}</p>
                    </div>
                    <span>{step.state}</span>
                    <Badge tone="planned">dry-run only</Badge>
                  </article>
                ))}
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Execute in future phase</button>
                <button type="button" disabled>Simulate only</button>
              </div>
              <p className="muted">Phase 57 simulates future local worker behavior and produces dry-run evidence only. It does not install a worker, start a worker, poll health, inspect processes, execute commands, execute tasks, connect to a runner, persist records, route work, mutate files, or mutate source.</p>
            </Card>

            <Card title="Windows Task Scheduler Status Check" eyebrow="declarative scheduling readiness">
              <div className="packet-list">
                <span>Phase: {windowsTaskSchedulerStatusCheckPacket.phase.label}</span>
                <span>Status: {windowsTaskSchedulerStatusCheckPacket.schedulerStatusCheckStatus}</span>
                <span>Mode: {windowsTaskSchedulerStatusCheckPacket.schedulerStatusCheckMode}</span>
                <span>Owner: {windowsTaskSchedulerStatusCheckPacket.schedulerSummary.owner}</span>
                <span>Source phase: {windowsTaskSchedulerStatusCheckPacket.schedulerSummary.sourcePhase}</span>
                <span>Safe state: {windowsTaskSchedulerStatusCheckPacket.schedulerSummary.safeState}</span>
                <span>Scheduler indicators: {windowsTaskSchedulerStatusCheckPacket.schedulerReadinessIndicators.length}</span>
                <span>Evidence requirements: {windowsTaskSchedulerStatusCheckPacket.evidenceRequirements.length}</span>
                <span>Windows scheduler configured: {windowsTaskSchedulerStatusCheckPacket.schedulerSummary.windowsSchedulerConfigured ? "yes" : "no"}</span>
                <span>Scheduled execution: {windowsTaskSchedulerStatusCheckPacket.boundaries.scheduledExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Scheduler creation: {windowsTaskSchedulerStatusCheckPacket.boundaries.schedulerCreationAllowed ? "allowed" : "blocked"}</span>
                <span>Scheduler query: {windowsTaskSchedulerStatusCheckPacket.boundaries.schedulerQueryAllowed ? "allowed" : "blocked"}</span>
                <span>PowerShell execution: {windowsTaskSchedulerStatusCheckPacket.boundaries.powershellExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>schtasks execution: {windowsTaskSchedulerStatusCheckPacket.boundaries.schtasksExecutionAllowed ? "allowed" : "blocked"}</span>
                <span>Suggested queue: {windowsTaskSchedulerStatusCheckPacket.routing.suggestedQueue}</span>
              </div>
              <div className="queue-list compact">
                {windowsTaskSchedulerStatusCheckPacket.schedulerReadinessIndicators.map((indicator) => (
                  <article className="queue-item" key={indicator.id}>
                    <div>
                      <strong>{indicator.label}</strong>
                      <p>{indicator.evidence}</p>
                    </div>
                    <span>{indicator.state}</span>
                    <Badge tone="planned">status only</Badge>
                  </article>
                ))}
              </div>
              <div className="button-row">
                <button type="button" className="secondary" disabled>Create scheduled task in future phase</button>
                <button type="button" disabled>Status check only</button>
              </div>
              <p className="muted">Phase 58 represents Windows Task Scheduler readiness without creating, querying, modifying, enabling, disabling, or running scheduled tasks. It does not execute PowerShell, schtasks, commands, shell operations, worker actions, tasks, runner connections, file mutations, or source mutations.</p>
            </Card>

<Card title="Morning Status Packet" eyebrow="future overnight summary surface">
  <div className="packet-list">
    <span>Phase: {morningStatusPacket.phase.label}</span>
    <span>Status: {morningStatusPacket.morningStatusPacketStatus}</span>
    <span>Mode: {morningStatusPacket.morningStatusPacketMode}</span>
    <span>Owner: {morningStatusPacket.packetSummary.owner}</span>
    <span>Source phase: {morningStatusPacket.packetSummary.sourcePhase}</span>
    <span>Report window: {morningStatusPacket.packetSummary.reportWindow}</span>
    <span>Safe state: {morningStatusPacket.packetSummary.safeState}</span>
    <span>Packet sections: {morningStatusPacket.packetSections.length}</span>
    <span>Evidence requirements: {morningStatusPacket.evidenceRequirements.length}</span>
    <span>Overnight work executed: {morningStatusPacket.packetSummary.overnightWorkExecuted ? "yes" : "no"}</span>
    <span>Live run report: {morningStatusPacket.packetSummary.reportGeneratedFromLiveRun ? "yes" : "no"}</span>
    <span>Windows scheduler configured: {morningStatusPacket.packetSummary.windowsSchedulerConfigured ? "yes" : "no"}</span>
    <span>Worker connected: {morningStatusPacket.packetSummary.workerConnected ? "yes" : "no"}</span>
    <span>Overnight execution: {morningStatusPacket.boundaries.overnightExecutionAllowed ? "allowed" : "blocked"}</span>
    <span>Command execution: {morningStatusPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
    <span>Suggested queue: {morningStatusPacket.routing.suggestedQueue}</span>
  </div>
  <div className="queue-list compact">
    {morningStatusPacket.packetSections.map((section) => (
      <article className="queue-item" key={section.id}>
        <div>
          <strong>{section.label}</strong>
          <p>{section.evidence}</p>
        </div>
        <span>{section.state}</span>
        <Badge tone="planned">summary only</Badge>
      </article>
    ))}
  </div>
  <div className="button-row">
    <button type="button" className="secondary" disabled>Generate live morning report in future phase</button>
    <button type="button" disabled>Summary structure only</button>
  </div>
  <p className="muted">Phase 59 creates the morning status packet surface for future overnight work summaries. It does not claim overnight work ran, query Windows scheduling, connect to a worker, execute commands, execute tasks, persist task records, route work, mutate files, or mutate source.</p>
</Card>

<Card title="Local Worker Readiness Gate" eyebrow="final readiness checkpoint">
  <div className="packet-list">
    <span>Phase: {localWorkerReadinessGatePacket.phase.label}</span>
    <span>Status: {localWorkerReadinessGatePacket.localWorkerReadinessGateStatus}</span>
    <span>Mode: {localWorkerReadinessGatePacket.readinessGateMode}</span>
    <span>Owner: {localWorkerReadinessGatePacket.readinessSummary.owner}</span>
    <span>Source phase: {localWorkerReadinessGatePacket.readinessSummary.sourcePhase}</span>
    <span>Safe state: {localWorkerReadinessGatePacket.readinessSummary.safeState}</span>
    <span>Prerequisites represented: {localWorkerReadinessGatePacket.readinessSummary.allPrerequisitesRepresented ? "yes" : "no"}</span>
    <span>Readiness checks: {localWorkerReadinessGatePacket.readinessGateChecks.length}</span>
    <span>Evidence requirements: {localWorkerReadinessGatePacket.evidenceRequirements.length}</span>
    <span>Ready for unlock: {localWorkerReadinessGatePacket.readinessSummary.localWorkerReadyForUnlock ? "yes" : "no"}</span>
    <span>Execution unlock approved: {localWorkerReadinessGatePacket.readinessSummary.executionUnlockApproved ? "yes" : "no"}</span>
    <span>Overnight work authorized: {localWorkerReadinessGatePacket.readinessSummary.overnightWorkAuthorized ? "yes" : "no"}</span>
    <span>Worker connected: {localWorkerReadinessGatePacket.readinessSummary.workerConnected ? "yes" : "no"}</span>
    <span>Execution unlock: {localWorkerReadinessGatePacket.boundaries.executionUnlockAllowed ? "allowed" : "blocked"}</span>
    <span>Command execution: {localWorkerReadinessGatePacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
    <span>Suggested queue: {localWorkerReadinessGatePacket.routing.suggestedQueue}</span>
  </div>
  <div className="queue-list compact">
    {localWorkerReadinessGatePacket.readinessGateChecks.map((check) => (
      <article className="queue-item" key={check.id}>
        <div>
          <strong>{check.label}</strong>
          <p>{check.evidence}</p>
        </div>
        <span>{check.state}</span>
        <Badge tone="planned">gate only</Badge>
      </article>
    ))}
  </div>
  <div className="button-row">
    <button type="button" className="secondary" disabled>Unlock local worker in future approved phase</button>
    <button type="button" disabled>Assess readiness only</button>
  </div>
  <p className="muted">Phase 60 closes the local worker readiness arc with a declarative readiness gate. It does not install a worker, connect to a worker, schedule work, execute commands, execute tasks, persist readiness decisions, mutate files, mutate source, route work, or approve execution.</p>
</Card>


          </aside>
        </div>
      <Card title="Local Worker Unlock Proposal Packet" eyebrow="owner-review proposal">
  <div className="packet-list">
    <span>Phase: {localWorkerUnlockProposalPacket.phase.label}</span>
    <span>Status: {localWorkerUnlockProposalPacket.localWorkerUnlockProposalPacketStatus}</span>
    <span>Mode: {localWorkerUnlockProposalPacket.unlockProposalMode}</span>
    <span>Owner: {localWorkerUnlockProposalPacket.proposalSummary.owner}</span>
    <span>Source phase: {localWorkerUnlockProposalPacket.proposalSummary.sourcePhase}</span>
    <span>Safe state: {localWorkerUnlockProposalPacket.proposalSummary.safeState}</span>
    <span>Requirements: {localWorkerUnlockProposalPacket.unlockProposalRequirements.length}</span>
    <span>Evidence requirements: {localWorkerUnlockProposalPacket.evidenceRequirements.length}</span>
    <span>Owner approval required: {localWorkerUnlockProposalPacket.proposalSummary.ownerApprovalRequired ? "yes" : "no"}</span>
    <span>Proposal approved: {localWorkerUnlockProposalPacket.proposalSummary.unlockProposalApproved ? "yes" : "no"}</span>
    <span>Ready for unlock: {localWorkerUnlockProposalPacket.proposalSummary.localWorkerReadyForUnlock ? "yes" : "no"}</span>
    <span>Execution unlock approved: {localWorkerUnlockProposalPacket.proposalSummary.executionUnlockApproved ? "yes" : "no"}</span>
    <span>Worker install approved: {localWorkerUnlockProposalPacket.proposalSummary.workerInstallApproved ? "yes" : "no"}</span>
    <span>Execution unlock: {localWorkerUnlockProposalPacket.boundaries.executionUnlockAllowed ? "allowed" : "blocked"}</span>
    <span>Command execution: {localWorkerUnlockProposalPacket.boundaries.commandExecutionAllowed ? "allowed" : "blocked"}</span>
    <span>Suggested queue: {localWorkerUnlockProposalPacket.routing.suggestedQueue}</span>
  </div>
  <div className="queue-list compact">
    {localWorkerUnlockProposalPacket.unlockProposalRequirements.map((requirement) => (
      <article className="queue-item" key={requirement.id}>
        <div>
          <strong>{requirement.label}</strong>
          <p>{requirement.evidence}</p>
        </div>
        <span>{requirement.state}</span>
        <Badge tone="planned">proposal only</Badge>
      </article>
    ))}
  </div>
  <div className="button-row">
    <button type="button" className="secondary" disabled>Approve unlock in future phase</button>
    <button type="button" disabled>Review proposal only</button>
  </div>
  <p className="muted">Phase 61 creates an owner-review proposal packet for future local worker unlock work. It does not approve the proposal, install a worker, connect to a worker, schedule work, execute commands, execute tasks, persist unlock decisions, mutate files, mutate source, route work, or approve execution.</p>
</Card>

<Card title="Local Worker Install Plan" eyebrow="owner-review install plan">
  <div className="packet-list">
    <span>Phase: {localWorkerInstallPlanPacket.phase.label}</span>
    <span>Status: {localWorkerInstallPlanPacket.localWorkerInstallPlanStatus}</span>
    <span>Mode: {localWorkerInstallPlanPacket.installPlanMode}</span>
    <span>Owner: {localWorkerInstallPlanPacket.installPlanSummary.owner}</span>
    <span>Source phase: {localWorkerInstallPlanPacket.installPlanSummary.sourcePhase}</span>
    <span>Safe state: {localWorkerInstallPlanPacket.installPlanSummary.safeState}</span>
    <span>Requirements: {localWorkerInstallPlanPacket.installPlanRequirements.length}</span>
    <span>Evidence requirements: {localWorkerInstallPlanPacket.evidenceRequirements.length}</span>
    <span>Owner approval required: {localWorkerInstallPlanPacket.installPlanSummary.ownerApprovalRequired ? "yes" : "no"}</span>
    <span>Install plan approved: {localWorkerInstallPlanPacket.installPlanSummary.installPlanApproved ? "yes" : "no"}</span>
    <span>Ready for install: {localWorkerInstallPlanPacket.installPlanSummary.localWorkerReadyForInstall ? "yes" : "no"}</span>
    <span>Worker install approved: {localWorkerInstallPlanPacket.installPlanSummary.workerInstallApproved ? "yes" : "no"}</span>
    <span>Worker installed: {localWorkerInstallPlanPacket.installPlanSummary.workerInstalled ? "yes" : "no"}</span>
    <span>Worker install: {localWorkerInstallPlanPacket.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>Installer execution: {localWorkerInstallPlanPacket.boundaries.installerExecutionAllowed ? "allowed" : "blocked"}</span>
    <span>Suggested queue: {localWorkerInstallPlanPacket.routing.suggestedQueue}</span>
  </div>
  <div className="queue-list compact">
    {localWorkerInstallPlanPacket.installPlanRequirements.map((requirement) => (
      <article className="queue-item" key={requirement.id}>
        <div>
          <strong>{requirement.label}</strong>
          <p>{requirement.evidence}</p>
        </div>
        <span>{requirement.state}</span>
        <Badge tone="planned">plan only</Badge>
      </article>
    ))}
  </div>
  <div className="button-row">
    <button type="button" className="secondary" disabled>Approve install in future phase</button>
    <button type="button" disabled>Review install plan only</button>
  </div>
  <p className="muted">Phase 62 creates an owner-review install plan for future local worker installation. It does not approve installation, install a worker, download dependencies, execute installers, connect to a worker, schedule work, execute commands, execute tasks, persist install decisions, mutate files, mutate source, route work, or approve execution.</p>
</Card>

<Card title="Local Worker Install Approval Record" eyebrow="owner-review approval record">
  <div className="packet-list">
    <span>Phase: {localWorkerInstallApprovalRecordPacket.phase.label}</span>
    <span>Status: {localWorkerInstallApprovalRecordPacket.localWorkerInstallApprovalRecordStatus}</span>
    <span>Mode: {localWorkerInstallApprovalRecordPacket.approvalRecordMode}</span>
    <span>Owner: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.owner}</span>
    <span>Source phase: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.sourcePhase}</span>
    <span>Safe state: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.safeState}</span>
    <span>Requirements: {localWorkerInstallApprovalRecordPacket.installApprovalRecordRequirements.length}</span>
    <span>Evidence requirements: {localWorkerInstallApprovalRecordPacket.evidenceRequirements.length}</span>
    <span>Owner approval required: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.ownerApprovalRequired ? "yes" : "no"}</span>
    <span>Explicit approval record required: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.explicitApprovalRecordRequired ? "yes" : "no"}</span>
    <span>Approval record approved: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.installApprovalRecordApproved ? "yes" : "no"}</span>
    <span>Install plan approved: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.installPlanApproved ? "yes" : "no"}</span>
    <span>Worker install approved: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.workerInstallApproved ? "yes" : "no"}</span>
    <span>Worker installed: {localWorkerInstallApprovalRecordPacket.installApprovalRecordSummary.workerInstalled ? "yes" : "no"}</span>
    <span>Worker install: {localWorkerInstallApprovalRecordPacket.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>Approval signing: {localWorkerInstallApprovalRecordPacket.boundaries.approvalRecordSigningAllowed ? "allowed" : "blocked"}</span>
    <span>Suggested queue: {localWorkerInstallApprovalRecordPacket.routing.suggestedQueue}</span>
  </div>
  <div className="queue-list compact">
    {localWorkerInstallApprovalRecordPacket.installApprovalRecordRequirements.map((requirement) => (
      <article className="queue-item" key={requirement.id}>
        <div>
          <strong>{requirement.label}</strong>
          <p>{requirement.evidence}</p>
        </div>
        <span>{requirement.state}</span>
        <Badge tone="planned">record only</Badge>
      </article>
    ))}
  </div>
  <div className="button-row">
    <button type="button" className="secondary" disabled>Sign approval in future phase</button>
    <button type="button" disabled>Review approval record only</button>
  </div>
  <p className="muted">Phase 63 creates an owner-review approval record structure for future local worker installation. It does not sign approval, approve installation, install a worker, download dependencies, execute installers, connect to a worker, schedule work, execute commands, execute tasks, persist approval records, mutate files, mutate source, route work, or approve execution.</p>
</Card>


<Card title="Local Worker Install Scope Lock" eyebrow="owner-review scope lock">
  <div className="packet-list">
    <span>Phase: {localWorkerInstallScopeLockPacket.phase.label}</span>
    <span>Status: {localWorkerInstallScopeLockPacket.localWorkerInstallScopeLockStatus}</span>
    <span>Mode: {localWorkerInstallScopeLockPacket.scopeLockMode}</span>
    <span>Owner: {localWorkerInstallScopeLockPacket.installScopeLockSummary.owner}</span>
    <span>Source phase: {localWorkerInstallScopeLockPacket.installScopeLockSummary.sourcePhase}</span>
    <span>Safe state: {localWorkerInstallScopeLockPacket.installScopeLockSummary.safeState}</span>
    <span>Requirements: {localWorkerInstallScopeLockPacket.installScopeLockRequirements.length}</span>
    <span>Evidence requirements: {localWorkerInstallScopeLockPacket.evidenceRequirements.length}</span>
    <span>Owner approval required: {localWorkerInstallScopeLockPacket.installScopeLockSummary.ownerApprovalRequired ? "yes" : "no"}</span>
    <span>Explicit scope lock required: {localWorkerInstallScopeLockPacket.installScopeLockSummary.explicitScopeLockRequired ? "yes" : "no"}</span>
    <span>Signed scope required: {localWorkerInstallScopeLockPacket.installScopeLockSummary.signedScopeRequired ? "yes" : "no"}</span>
    <span>Scope locked: {localWorkerInstallScopeLockPacket.installScopeLockSummary.installScopeLocked ? "yes" : "no"}</span>
    <span>Approval record approved: {localWorkerInstallScopeLockPacket.installScopeLockSummary.installApprovalRecordApproved ? "yes" : "no"}</span>
    <span>Install plan approved: {localWorkerInstallScopeLockPacket.installScopeLockSummary.installPlanApproved ? "yes" : "no"}</span>
    <span>Worker install approved: {localWorkerInstallScopeLockPacket.installScopeLockSummary.workerInstallApproved ? "yes" : "no"}</span>
    <span>Worker installed: {localWorkerInstallScopeLockPacket.installScopeLockSummary.workerInstalled ? "yes" : "no"}</span>
    <span>Worker install: {localWorkerInstallScopeLockPacket.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>Scope signing: {localWorkerInstallScopeLockPacket.boundaries.scopeLockSigningAllowed ? "allowed" : "blocked"}</span>
    <span>Suggested queue: {localWorkerInstallScopeLockPacket.routing.suggestedQueue}</span>
  </div>
  <div className="queue-list compact">
    {localWorkerInstallScopeLockPacket.installScopeLockRequirements.map((requirement) => (
      <article className="queue-item" key={requirement.id}>
        <div>
          <strong>{requirement.label}</strong>
          <p>{requirement.evidence}</p>
        </div>
        <span>{requirement.state}</span>
        <Badge tone="planned">scope only</Badge>
      </article>
    ))}
  </div>
  <div className="button-row">
    <button type="button" className="secondary" disabled>Lock scope in future phase</button>
    <button type="button" disabled>Review scope lock only</button>
  </div>
  <p className="muted">Phase 64 creates an owner-review scope lock structure for future local worker installation. It does not lock scope as approved, sign approval, approve installation, install a worker, download dependencies, execute installers, connect to a worker, schedule work, execute commands, execute tasks, persist scope records, mutate files, mutate source, route work, or approve execution.</p>
</Card>

<Card title="Local Worker Workspace Boundary" eyebrow="owner-review workspace boundary">
  <div className="packet-list">
    <span>Phase: {localWorkerWorkspaceBoundaryPacket.phase.label}</span>
    <span>Status: {localWorkerWorkspaceBoundaryPacket.localWorkerWorkspaceBoundaryStatus}</span>
    <span>Mode: {localWorkerWorkspaceBoundaryPacket.workspaceBoundaryMode}</span>
    <span>Owner: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.owner}</span>
    <span>Source phase: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.sourcePhase}</span>
    <span>Safe state: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.safeState}</span>
    <span>Requirements: {localWorkerWorkspaceBoundaryPacket.workspaceBoundaryRequirements.length}</span>
    <span>Evidence requirements: {localWorkerWorkspaceBoundaryPacket.evidenceRequirements.length}</span>
    <span>Owner approval required: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.ownerApprovalRequired ? "yes" : "no"}</span>
    <span>Exact workspace root required: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.exactWorkspaceRootRequired ? "yes" : "no"}</span>
    <span>Allowed path inventory required: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.allowedPathInventoryRequired ? "yes" : "no"}</span>
    <span>Blocked path inventory required: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.blockedPathInventoryRequired ? "yes" : "no"}</span>
    <span>Workspace boundary locked: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.workspaceBoundaryLocked ? "yes" : "no"}</span>
    <span>Scope locked: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.installScopeLocked ? "yes" : "no"}</span>
    <span>Worker install approved: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.workerInstallApproved ? "yes" : "no"}</span>
    <span>Worker installed: {localWorkerWorkspaceBoundaryPacket.workspaceBoundarySummary.workerInstalled ? "yes" : "no"}</span>
    <span>Worker install: {localWorkerWorkspaceBoundaryPacket.boundaries.workerInstallAllowed ? "allowed" : "blocked"}</span>
    <span>Workspace probing: {localWorkerWorkspaceBoundaryPacket.boundaries.workspaceProbeAllowed ? "allowed" : "blocked"}</span>
    <span>Filesystem scan: {localWorkerWorkspaceBoundaryPacket.boundaries.filesystemScanAllowed ? "allowed" : "blocked"}</span>
    <span>Suggested queue: {localWorkerWorkspaceBoundaryPacket.routing.suggestedQueue}</span>
  </div>
  <div className="queue-list compact">
    {localWorkerWorkspaceBoundaryPacket.workspaceBoundaryRequirements.map((requirement) => (
      <article className="queue-item" key={requirement.id}>
        <div>
          <strong>{requirement.label}</strong>
          <p>{requirement.evidence}</p>
        </div>
        <span>{requirement.state}</span>
        <Badge tone="planned">boundary only</Badge>
      </article>
    ))}
  </div>
  <div className="button-row">
    <button type="button" className="secondary" disabled>Lock workspace in future phase</button>
    <button type="button" disabled>Review boundary only</button>
  </div>
  <p className="muted">Phase 65 creates an owner-review workspace boundary structure for future local worker installation. It does not lock the workspace as approved, sign approval, approve installation, install a worker, download dependencies, execute installers, scan or probe the filesystem, connect to a worker, schedule work, execute commands, execute tasks, persist workspace records, mutate files, mutate source, route work, or approve execution.</p>
</Card>

</section>
    </main>
  );
}
