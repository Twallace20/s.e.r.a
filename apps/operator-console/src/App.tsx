import { operatorRuntimeStatus } from "./runtime-status";
import { requestIntakeDraft, requestIntakeSafetyGates } from "./request-intake";
import { fileIntakePacket, fileIntakeSafetyGates } from "./file-intake";
import { workflowLibraryPacket, workflowLibrarySafetyGates } from "./workflow-library";
import { workflowComposerPacket, workflowComposerSafetyGates } from "./workflow-composer";
import { planReviewQueuePacket, planReviewQueueSafetyGates } from "./plan-review-queue";
import { ownerReviewDecisionPacket, ownerReviewDecisionSafetyGates } from "./owner-review-decision-draft";
import { ownerDecisionRecordSurfacePacket, ownerDecisionRecordSurfaceSafetyGates } from "./owner-decision-record-surface";

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
  { label: "GitHub bridge", value: operatorRuntimeStatus.status.githubBridge, tone: "pending" },
  { label: "Tailscale access", value: operatorRuntimeStatus.status.tailscaleAccess, tone: "planned" },
  { label: "Last check-in", value: operatorRuntimeStatus.status.lastCheckIn, tone: "ready" },
  { label: "Certified level", value: operatorRuntimeStatus.certification.runtimeLevel, tone: "ready" },
  { label: "Free Core", value: operatorRuntimeStatus.certification.freeCore, tone: "ready" },
];

const queueItems: QueueItem[] = [
  {
    title: "Phase 54 owner decision record surface",
    branch: "phase-54-operator-owner-decision-record-surface-v1",
    risk: "Low",
    workflow: "Owner decision record surface",
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
          </aside>
        </div>
      </section>
    </main>
  );
}
