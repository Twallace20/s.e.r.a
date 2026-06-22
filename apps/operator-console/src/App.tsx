import { operatorRuntimeStatus } from "./runtime-status";

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
  { label: "GitHub bridge", value: operatorRuntimeStatus.status.githubBridge, tone: "pending" },
  { label: "Tailscale access", value: operatorRuntimeStatus.status.tailscaleAccess, tone: "planned" },
  { label: "Last check-in", value: operatorRuntimeStatus.status.lastCheckIn, tone: "ready" },
  { label: "Certified level", value: operatorRuntimeStatus.certification.runtimeLevel, tone: "ready" },
  { label: "Free Core", value: operatorRuntimeStatus.certification.freeCore, tone: "ready" },
];

const queueItems: QueueItem[] = [
  {
    title: "Phase 47 runtime reader plan",
    branch: "phase-47-operator-app-runtime-reader-v1",
    risk: "Low",
    workflow: "Read-only runtime packet",
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

            <Card title="Create Request" eyebrow="sample intake shell">
              <form className="request-form">
                <label>
                  Request title
                  <input value="Build next S.E.R.A. phase" readOnly />
                </label>
                <label>
                  Request details
                  <textarea value="Create a branch-ready plan, validation contract, and evidence requirements before source mutation." readOnly />
                </label>
                <div className="form-row">
                  <label>
                    Priority
                    <select defaultValue="High">
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </label>
                  <label>
                    Workflow type
                    <select defaultValue="Phase build">
                      <option>Phase build</option>
                      <option>Validation review</option>
                      <option>Evidence packet</option>
                    </select>
                  </label>
                </div>
                <div className="button-row">
                  <button type="button" className="secondary">Attach files</button>
                  <button type="button">Submit to queue</button>
                </div>
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
