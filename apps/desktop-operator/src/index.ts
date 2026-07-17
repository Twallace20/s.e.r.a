import crypto from "node:crypto";

export const DESKTOP_OPERATOR_APP_VERSION = "desktop-operator-v1";

export const REQUIRED_DESKTOP_VIEWS = [
  "overview",
  "requests",
  "commands-and-attempts",
  "approvals",
  "runtime-services",
  "execution-and-evaluation",
  "models",
  "intake",
  "knowledge",
  "capabilities",
  "studio-catalog",
  "studio-details",
  "studio-session-progress",
  "studio-source-set",
  "studio-document-plan",
  "studio-candidate-draft",
  "studio-claim-ledger",
  "studio-source-map",
  "studio-evaluation-results",
  "studio-operator-review",
  "studio-revision-history",
  "studio-final-deliverable",
  "studio-learning-signals",
  "studio-limitations",
  "integrated-loop-composer",
  "integrated-loop-sessions",
  "integrated-loop-timeline",
  "integrated-loop-authorization",
  "integrated-loop-preflight",
  "integrated-loop-applicable-records",
  "integrated-loop-non-applicable-records",
  "integrated-loop-prevention-warning",
  "integrated-loop-certified-alternative",
  "integrated-loop-override-details",
  "integrated-loop-source-intake",
  "integrated-loop-knowledge-retrieval",
  "integrated-loop-studio-selection",
  "integrated-loop-capability-selection",
  "integrated-loop-model-candidate",
  "integrated-loop-evaluation-summary",
  "integrated-loop-review-revisions",
  "integrated-loop-finalization",
  "integrated-loop-closeout",
  "integrated-loop-evidence-package",
  "learning",
  "learning-governance-sessions",
  "learning-governance-failures",
  "learning-governance-evidence-chains",
  "learning-governance-context-fingerprints",
  "learning-governance-hypotheses",
  "learning-governance-repair-candidates",
  "learning-governance-reproductions",
  "learning-governance-lesson-versions",
  "learning-governance-scope",
  "learning-governance-certification",
  "learning-governance-activation",
  "learning-governance-prevention-rules",
  "learning-governance-related-context-warnings",
  "learning-governance-out-of-scope",
  "learning-governance-superseded-versions",
  "learning-governance-overrides",
  "learning-governance-improvement-comparisons",
  "learning-governance-innovations",
  "learning-governance-promotion-rollback",
  "learning-governance-lifecycle-events",
  "recovery",
  "evidence",
  "certification-and-milestones",
  "settings"
] as const;

export type DesktopOperatorView = (typeof REQUIRED_DESKTOP_VIEWS)[number];

export const RESERVED_GOVERNED_SURFACES = [
  "known-failure-patterns",
  "applicable-lessons",
  "prevention-warnings",
  "certified-alternatives",
  "operator-overrides",
  "superseded-lessons",
  "improvement-proposals",
  "innovation-proposals",
  "supporting-evidence",
  "applicability-explanations",
  "non-applicability-explanations"
  ,
  "learning-sessions",
  "failure-records",
  "evidence-chains",
  "context-fingerprints",
  "hypotheses",
  "repair-candidates",
  "reproductions",
  "lesson-versions",
  "scope-and-non-applicability",
  "certification-status",
  "activation-status",
  "prevention-rules",
  "related-context-warnings",
  "out-of-scope-explanations",
  "superseded-versions",
  "overrides",
  "improvement-comparisons",
  "innovation-status",
  "promotion-and-rollback-evidence",
  "lifecycle-events"
] as const;

export type ReservedGovernedSurface = (typeof RESERVED_GOVERNED_SURFACES)[number];

export interface LearningGovernanceViewBinding {
  view: DesktopOperatorView;
  route: string;
  dataRole: string;
  emptyState: string;
  blockedState: string;
  renders: string[];
}

const LEARNING_GOVERNANCE_ROUTE_BASE = "/api/v1/operator/learning-governance";
export const LEARNING_GOVERNANCE_VIEW_BINDINGS: LearningGovernanceViewBinding[] = [
  { view: "learning", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/status`, dataRole: "learning-learning-governance", emptyState: "No Learning Governance status is available.", blockedState: "Learning Governance status is blocked or unavailable.", renders: ["boundedStatus", "modelUse", "publicNetworkUse"] },
  { view: "learning-governance-sessions", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/sessions`, dataRole: "learning-governance-sessions-learning-governance", emptyState: "No learning sessions are present.", blockedState: "Learning sessions are blocked or unavailable.", renders: ["sessionId", "lifecycleState", "lane", "evidenceReference"] },
  { view: "learning-governance-failures", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/failures`, dataRole: "learning-governance-failures-learning-governance", emptyState: "No failure records are present.", blockedState: "Failure records are blocked or unavailable.", renders: ["failureId", "classification", "severity", "evidenceReference"] },
  { view: "learning-governance-evidence-chains", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`, dataRole: "learning-governance-evidence-chains-learning-governance", emptyState: "No lesson evidence chains are present.", blockedState: "Evidence chains are blocked or unavailable.", renders: ["evidenceReference", "evaluationRefs", "reproductionRefs", "immutableEvidence"] },
  { view: "learning-governance-context-fingerprints", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/status`, dataRole: "learning-governance-context-fingerprints-learning-governance", emptyState: "No context fingerprints are present.", blockedState: "Context fingerprints are blocked or unavailable.", renders: ["contextHash", "scopeDimensions", "policyVersion"] },
  { view: "learning-governance-hypotheses", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/failures`, dataRole: "learning-governance-hypotheses-learning-governance", emptyState: "No hypotheses are present.", blockedState: "Hypotheses are blocked or unavailable.", renders: ["hypothesis", "causalMechanism", "reviewStatus"] },
  { view: "learning-governance-repair-candidates", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/failures`, dataRole: "learning-governance-repair-candidates-learning-governance", emptyState: "No repair candidates are present.", blockedState: "Repair candidates are blocked or unavailable.", renders: ["repairId", "changedBehavior", "rollbackPlan"] },
  { view: "learning-governance-reproductions", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/failures`, dataRole: "learning-governance-reproductions-learning-governance", emptyState: "No reproductions are present.", blockedState: "Reproductions are blocked or unavailable.", renders: ["executionId", "evaluationId", "independentEvidence"] },
  { view: "learning-governance-lesson-versions", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`, dataRole: "learning-governance-lesson-versions-learning-governance", emptyState: "No lesson versions are present.", blockedState: "Lesson versions are blocked or unavailable.", renders: ["lessonId", "lessonVersion", "lifecycleState", "successorVersion"] },
  { view: "learning-governance-scope", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`, dataRole: "learning-governance-scope-learning-governance", emptyState: "No certified scope is present.", blockedState: "Lesson scope is blocked or unavailable.", renders: ["scope", "nonApplicability", "matchPolicy"] },
  { view: "learning-governance-certification", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`, dataRole: "learning-governance-certification-learning-governance", emptyState: "No certification records are present.", blockedState: "Certification records are blocked or unavailable.", renders: ["certificationReference", "operatorReview", "decision"] },
  { view: "learning-governance-activation", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`, dataRole: "learning-governance-activation-learning-governance", emptyState: "No activation records are present.", blockedState: "Activation records are blocked or unavailable.", renders: ["activationReference", "authorization", "effectiveTimestamp"] },
  { view: "learning-governance-prevention-rules", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/prevention-rules`, dataRole: "learning-governance-prevention-rules-learning-governance", emptyState: "No prevention rules are active.", blockedState: "Prevention rules are blocked or unavailable.", renders: ["ruleId", "preventionScope", "lessonVersion", "overridePolicy"] },
  { view: "learning-governance-related-context-warnings", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/prevention-rules`, dataRole: "learning-governance-related-context-warnings-learning-governance", emptyState: "No related-context warnings are present.", blockedState: "Related-context warnings are blocked or unavailable.", renders: ["relatedContextBehavior", "reviewPolicy", "warningPolicy"] },
  { view: "learning-governance-out-of-scope", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`, dataRole: "learning-governance-out-of-scope-learning-governance", emptyState: "No out-of-scope explanations are present.", blockedState: "Out-of-scope explanations are blocked or unavailable.", renders: ["outOfScope", "nonApplicability", "safeClear"] },
  { view: "learning-governance-superseded-versions", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/lessons`, dataRole: "learning-governance-superseded-versions-learning-governance", emptyState: "No superseded lesson history is present.", blockedState: "Superseded history is blocked or unavailable.", renders: ["supersededHistory", "successorVersion", "supersessionReference"] },
  { view: "learning-governance-overrides", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/prevention-rules`, dataRole: "learning-governance-overrides-learning-governance", emptyState: "No governed overrides are present.", blockedState: "Overrides are blocked or unavailable.", renders: ["overrideLimit", "usedCount", "expiresAt", "auditReference"] },
  { view: "learning-governance-improvement-comparisons", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovations`, dataRole: "learning-governance-improvement-comparisons-learning-governance", emptyState: "No improvement comparisons are present.", blockedState: "Improvement comparisons are blocked or unavailable.", renders: ["baseline", "candidate", "qualityGates", "result"] },
  { view: "learning-governance-innovations", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovations`, dataRole: "learning-governance-innovations-learning-governance", emptyState: "No innovations are present.", blockedState: "Innovations are blocked or unavailable.", renders: ["innovationCertification", "promotionReference", "rollbackReference", "activeDigest"] },
  { view: "learning-governance-promotion-rollback", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/innovations`, dataRole: "learning-governance-promotion-rollback-learning-governance", emptyState: "No promotion or rollback history is present.", blockedState: "Promotion and rollback history is blocked or unavailable.", renders: ["innovationPromotion", "innovationRollback", "priorActiveDigest", "restoredDigest"] },
  { view: "learning-governance-lifecycle-events", route: `${LEARNING_GOVERNANCE_ROUTE_BASE}/sessions`, dataRole: "learning-governance-lifecycle-events-learning-governance", emptyState: "No lifecycle events are present.", blockedState: "Lifecycle events are blocked or unavailable.", renders: ["lifecycleEvent", "actor", "sequence", "safeMessage"] }
];

export interface DesktopAsset {
  path: "/" | "/assets/app.css" | "/assets/app.js" | "/assets/manifest.json";
  contentType: string;
  body: string;
}

export interface DesktopAssetManifestEntry {
  path: DesktopAsset["path"];
  contentType: string;
  sha256: string;
  bytes: number;
}

export interface DesktopAssetManifest {
  schemaVersion: "sera.desktop-assets.v1";
  appVersion: typeof DESKTOP_OPERATOR_APP_VERSION;
  localOnly: true;
  remoteReferencesAllowed: false;
  activeImportedHtmlAllowed: false;
  assets: DesktopAssetManifestEntry[];
}

export interface DesktopVisualContract {
  schemaVersion: "sera.desktop-visual-contract.v1";
  appVersion: typeof DESKTOP_OPERATOR_APP_VERSION;
  views: DesktopOperatorView[];
  hasNavigation: boolean;
  hasApprovalQueue: boolean;
  hasEvidenceViewer: boolean;
  hasStatusRegion: boolean;
  reservedGovernedSurfaces: ReservedGovernedSurface[];
  recurrencePreventionRuntimeImplemented: true;
  accessibility: {
    landmarks: string[];
    focusVisible: true;
    reducedMotion: true;
    labelledControls: true;
  };
  security: {
    remoteReferences: false;
    inlineScript: false;
    evalLikeApis: false;
    tokenInUrl: false;
  };
}

const navItems = REQUIRED_DESKTOP_VIEWS.map((view) => `<button type="button" class="nav-button" data-view="${view}" aria-controls="view-${view}">${titleCase(view)}</button>`).join("");
const viewSections = REQUIRED_DESKTOP_VIEWS.map((view) => {
  const binding = LEARNING_GOVERNANCE_VIEW_BINDINGS.find((candidate) => candidate.view === view);
  return `<section id="view-${view}" class="operator-view" data-view="${view}" data-learning-route="${binding?.route ?? `${LEARNING_GOVERNANCE_ROUTE_BASE}/status`}" aria-labelledby="heading-${view}" hidden>
    <h2 id="heading-${view}">${titleCase(view)}</h2>
    <div class="view-grid">
      <article>
        <h3>Status</h3>
        <p data-role="${view}-status">Awaiting local gateway data.</p>
      </article>
      <article>
        <h3>Evidence</h3>
        <p>Evidence is displayed as escaped text, JSON summaries, or binary metadata.</p>
      </article>
      <article>
        <h3>Governed Learning</h3>
        <p data-role="${view}-governed-learning-empty">Learning Governance data is read through the authenticated local Operator Gateway.</p>
        <pre data-role="${view}-learning-governance" aria-label="${titleCase(view)} learning governance data"></pre>
      </article>
    </div>
  </section>`;
}).join("");

export const DESKTOP_OPERATOR_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>S.E.R.A. Desktop Operator</title>
  <link rel="stylesheet" href="/assets/app.css">
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div>
        <h1>S.E.R.A. Desktop Operator</h1>
        <p id="connection-state" aria-live="polite">Local loopback gateway required.</p>
      </div>
      <button id="refresh-status" type="button">Refresh</button>
    </header>
    <main class="workspace">
      <nav class="sidebar" aria-label="Operator views">${navItems}</nav>
      <div class="content">
        <form id="request-form" class="composer" autocomplete="off">
          <label for="request-category">Request category</label>
          <select id="request-category" name="category">
            <option value="general-operator-request">General operator request</option>
            <option value="inspect-system">Inspect system</option>
            <option value="review-approval">Review approval</option>
            <option value="run-certified-capability">Run certified capability</option>
          </select>
          <label for="request-text">Request</label>
          <textarea id="request-text" name="request" maxlength="4000"></textarea>
          <button type="submit">Queue Request</button>
        </form>
        <div id="status-region" role="status" aria-live="polite"></div>
        ${viewSections}
      </div>
    </main>
  </div>
  <script src="/assets/app.js" defer></script>
</body>
</html>
`;

export const DESKTOP_OPERATOR_CSS = `
:root { color-scheme: light dark; font-family: Inter, Segoe UI, Arial, sans-serif; background: #101418; color: #f3f6f8; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; }
button, select, textarea { font: inherit; }
button:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid #7bdff2; outline-offset: 2px; }
.shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
.topbar { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 16px 20px; border-bottom: 1px solid #32414c; background: #172027; }
h1 { margin: 0; font-size: 1.45rem; letter-spacing: 0; }
.topbar p { margin: 4px 0 0; color: #b9c8d3; }
.workspace { display: grid; grid-template-columns: minmax(190px, 240px) 1fr; min-height: 0; }
.sidebar { padding: 12px; border-right: 1px solid #32414c; display: grid; align-content: start; gap: 6px; background: #121a20; }
.nav-button { min-height: 38px; border: 1px solid transparent; border-radius: 6px; text-align: left; padding: 8px 10px; background: transparent; color: #e7eef3; }
.nav-button[aria-current="page"] { background: #254554; border-color: #4b8296; }
.content { padding: 16px; overflow: auto; }
.composer { display: grid; gap: 8px; max-width: 920px; padding-bottom: 16px; border-bottom: 1px solid #32414c; }
textarea { min-height: 92px; resize: vertical; }
select, textarea, .composer button, #refresh-status { border-radius: 6px; border: 1px solid #526675; background: #101820; color: #f3f6f8; padding: 8px 10px; }
.operator-view { max-width: 1100px; }
.view-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
article { border: 1px solid #31414d; border-radius: 6px; padding: 12px; background: #151d24; }
@media (max-width: 760px) { .workspace { grid-template-columns: 1fr; } .sidebar { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); border-right: 0; border-bottom: 1px solid #32414c; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; scroll-behavior: auto !important; } }
`;

export const DESKTOP_OPERATOR_JS = `
(() => {
  "use strict";
  const views = ${JSON.stringify(REQUIRED_DESKTOP_VIEWS)};
  const learningBindings = ${JSON.stringify(LEARNING_GOVERNANCE_VIEW_BINDINGS)};
  const status = document.getElementById("status-region");
  const connection = document.getElementById("connection-state");
  const maxRenderedBytes = 12000;
  function authHeaders() {
    const token = sessionStorage.getItem("sera.operatorToken") || "";
    const headers = { "Accept": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }
  function redact(value) {
    return JSON.stringify(value, (key, item) => /token|secret|password|credential/i.test(key) ? "REDACTED" : item, 2);
  }
  function boundedText(value) {
    const text = redact(value);
    return text.length > maxRenderedBytes ? text.slice(0, maxRenderedBytes) + "\\n...bounded..." : text;
  }
  function payloadIsEmpty(payload) {
    if (!payload) return true;
    if (Array.isArray(payload)) return payload.length === 0;
    if (typeof payload === "object") return Object.values(payload).every((value) => Array.isArray(value) && value.length === 0);
    return false;
  }
  function renderLearningGovernance(binding, payload) {
    if (payloadIsEmpty(payload)) return binding.emptyState;
    return [
      "Surface: " + binding.view,
      "Gateway route: " + binding.route,
      "Renders: " + binding.renders.join(", "),
      boundedText(payload)
    ].join("\\n");
  }
  async function refreshLearningGovernance(view) {
    const binding = learningBindings.find((candidate) => candidate.view === view) || learningBindings.find((candidate) => candidate.view === "learning");
    const target = document.querySelector('[data-role="' + view + '-learning-governance"]');
    if (!binding || !target) return;
    target.textContent = binding.emptyState;
    try {
      const response = await fetch(binding.route, { headers: authHeaders() });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        target.textContent = binding.blockedState + " " + (payload.safeMessage || payload.errorCode || "blocked");
        return;
      }
      target.textContent = renderLearningGovernance(binding, payload.data);
    } catch {
      target.textContent = binding.blockedState;
    }
  }
  function show(view) {
    for (const section of document.querySelectorAll(".operator-view")) section.hidden = section.dataset.view !== view;
    for (const button of document.querySelectorAll(".nav-button")) button.setAttribute("aria-current", button.dataset.view === view ? "page" : "false");
    refreshLearningGovernance(view);
  }
  async function refresh() {
    try {
      const response = await fetch("/api/v1/operator/status", { headers: { "Accept": "application/json" } });
      const payload = await response.json();
      connection.textContent = payload.ok ? "Local gateway healthy." : "Local gateway unavailable.";
      status.textContent = payload.ok ? "Status refreshed." : payload.safeMessage || "Status unavailable.";
    } catch {
      connection.textContent = "Local gateway unavailable.";
      status.textContent = "Refresh failed without exposing details.";
    }
  }
  document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => show(button.dataset.view)));
  document.getElementById("refresh-status").addEventListener("click", refresh);
  document.getElementById("request-form").addEventListener("submit", (event) => {
    event.preventDefault();
    status.textContent = "Request composer is ready; authentication is required before submission.";
  });
  show(views[0]);
  refresh();
})();
`;

export function getDesktopAssets(): DesktopAsset[] {
  const assets: DesktopAsset[] = [
    { path: "/", contentType: "text/html; charset=utf-8", body: DESKTOP_OPERATOR_HTML },
    { path: "/assets/app.css", contentType: "text/css; charset=utf-8", body: DESKTOP_OPERATOR_CSS },
    { path: "/assets/app.js", contentType: "text/javascript; charset=utf-8", body: DESKTOP_OPERATOR_JS }
  ];
  const manifest = createAssetManifest(assets);
  return [...assets, { path: "/assets/manifest.json", contentType: "application/json; charset=utf-8", body: JSON.stringify(manifest, null, 2) + "\n" }];
}

export function createAssetManifest(assets = getDesktopAssetsWithoutManifest()): DesktopAssetManifest {
  return {
    schemaVersion: "sera.desktop-assets.v1",
    appVersion: DESKTOP_OPERATOR_APP_VERSION,
    localOnly: true,
    remoteReferencesAllowed: false,
    activeImportedHtmlAllowed: false,
    assets: assets.map((asset) => ({
      path: asset.path,
      contentType: asset.contentType,
      sha256: sha256(asset.body),
      bytes: Buffer.byteLength(asset.body, "utf8")
    }))
  };
}

export function verifyDesktopAssetIntegrity(assets = getDesktopAssets()): { ok: boolean; checked: number; failures: string[]; manifest: DesktopAssetManifest } {
  const manifestAsset = assets.find((asset) => asset.path === "/assets/manifest.json");
  const manifest = manifestAsset ? JSON.parse(manifestAsset.body) as DesktopAssetManifest : createAssetManifest(assets.filter((asset) => asset.path !== "/assets/manifest.json"));
  const failures: string[] = [];
  for (const entry of manifest.assets) {
    const asset = assets.find((candidate) => candidate.path === entry.path);
    if (!asset) {
      failures.push(`missing:${entry.path}`);
      continue;
    }
    if (sha256(asset.body) !== entry.sha256) failures.push(`hash:${entry.path}`);
    if (Buffer.byteLength(asset.body, "utf8") !== entry.bytes) failures.push(`bytes:${entry.path}`);
  }
  return { ok: failures.length === 0, checked: manifest.assets.length, failures, manifest };
}

export function getDesktopVisualContract(): DesktopVisualContract {
  return {
    schemaVersion: "sera.desktop-visual-contract.v1",
    appVersion: DESKTOP_OPERATOR_APP_VERSION,
    views: [...REQUIRED_DESKTOP_VIEWS],
    hasNavigation: true,
    hasApprovalQueue: true,
    hasEvidenceViewer: true,
    hasStatusRegion: true,
    reservedGovernedSurfaces: [...RESERVED_GOVERNED_SURFACES],
    recurrencePreventionRuntimeImplemented: true,
    accessibility: { landmarks: ["header", "main", "nav", "section"], focusVisible: true, reducedMotion: true, labelledControls: true },
    security: { remoteReferences: false, inlineScript: false, evalLikeApis: false, tokenInUrl: false }
  };
}

export function assertDesktopAssetsLocalOnly(assets = getDesktopAssets()): { ok: boolean; failures: string[] } {
  const joined = assets.map((asset) => asset.body).join("\n");
  const failures = [
    /https?:\/\//i.test(joined) ? "remote-reference" : "",
    /\beval\s*\(/.test(joined) ? "eval" : "",
    /new\s+Function\b/.test(joined) ? "function-constructor" : "",
    /<script(?![^>]+src="\/assets\/app\.js"[^>]*defer)/i.test(DESKTOP_OPERATOR_HTML) ? "inline-script" : ""
  ].filter(Boolean);
  return { ok: failures.length === 0, failures };
}

function getDesktopAssetsWithoutManifest(): DesktopAsset[] {
  return [
    { path: "/", contentType: "text/html; charset=utf-8", body: DESKTOP_OPERATOR_HTML },
    { path: "/assets/app.css", contentType: "text/css; charset=utf-8", body: DESKTOP_OPERATOR_CSS },
    { path: "/assets/app.js", contentType: "text/javascript; charset=utf-8", body: DESKTOP_OPERATOR_JS }
  ];
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function titleCase(value: string): string {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
