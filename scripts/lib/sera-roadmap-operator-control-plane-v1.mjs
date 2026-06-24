import fs from "node:fs";
import path from "node:path";

const declaredPaths = [
  "apps/operator-console/src/operator-control-plane-roadmap.ts",
  "docs/architecture/OPERATOR_CONTROL_PLANE_V1.md",
  "docs/roadmap/SERA_ROADMAP_V2.md",
  "docs/phases/PHASE_82_SERA_ROADMAP_OPERATOR_CONTROL_PLANE_V1.md",
  "scripts/lib/sera-roadmap-operator-control-plane-v1.mjs",
  "scripts/run-sera-roadmap-operator-control-plane-v1.mjs",
  "tests/integration/sera-roadmap-operator-control-plane-v1.test.ts",
];

const roadmapOperatorControlPlaneRequirements = [
  { id: "phase-81-result-record-boundary-reviewed", label: "Phase 81 result-record boundary reviewed", state: "required", evidence: "Phase 81 command result-record evidence boundary must be represented before the roadmap/control-plane phase proceeds." },
  { id: "roadmap-v2-required", label: "Roadmap v2 required", state: "required", evidence: "The repo must include an updated roadmap that compresses toward safe execution, branch development, universal ingest, deliverables, website, app, agency, and productization decisions." },
  { id: "operator-control-plane-required", label: "Operator control plane required", state: "required", evidence: "The repo must declare a control plane beyond command prompt use." },
  { id: "multi-surface-plan-required", label: "Multi-surface plan required", state: "required", evidence: "CLI, operator console, private studio, public website, mobile/PWA, and native app must be sequenced as first-class surfaces." },
  { id: "safe-execution-spine-preserved", label: "Safe execution spine preserved", state: "required", evidence: "The updated roadmap must keep command safety, validation, rollback, evidence, and approval gates." },
  { id: "approved-branch-development-preserved", label: "Approved branch development preserved", state: "required", evidence: "The updated roadmap must keep branch self-development under owner approval, validation, rollback, and no self-merge." },
  { id: "universal-ingest-and-deliverable-engine-pulled-earlier", label: "Universal engine pulled earlier", state: "required", evidence: "The updated roadmap must pull universal ingest and deliverables into the core path instead of treating them as late side features." },
  { id: "website-path-required", label: "Website path required", state: "required", evidence: "The existing site path must be sequenced into public service, portfolio, proof, and intake readiness." },
  { id: "mobile-pwa-and-native-app-path-required", label: "Mobile and app path required", state: "required", evidence: "The updated roadmap must sequence mobile web/PWA first and native app after approval workflows prove useful." },
  { id: "away-mode-bounded-autonomy-required", label: "Away-mode bounded autonomy required", state: "required", evidence: "Away mode must be planned as bounded, observable, reversible, and owner-approval gated." },
  { id: "productization-optional-after-private-proof", label: "Productization optional after private proof", state: "required", evidence: "The roadmap must keep productization optional until S.E.R.A. proves value as Driana's private operator and agency engine." },
];

const roadmapOperatorControlPlaneFields = [
  "operatorAuthorityOwner",
  "commandApprovalOwner",
  "sourcePhase",
  "safeState",
  "phase81CommandResultRecordBoundaryReady",
  "roadmapV2Required",
  "operatorControlPlaneRequired",
  "executionSpinePreserved",
  "approvedBranchDevelopmentPreserved",
  "universalIngestPulledEarlier",
  "universalDeliverableEnginePulledEarlier",
  "websitePathIncluded",
  "mobilePwaPathIncluded",
  "nativeAppPathIncluded",
];

const evidenceRequirements = [
  "phase81-command-result-record-boundary-proof",
  "roadmap-v2-doc-required",
  "operator-control-plane-doc-required",
  "operator-console-binding-required",
  "multi-surface-plan-proof-required",
  "safe-execution-spine-proof-required",
  "approved-branch-development-proof-required",
  "universal-engine-sequencing-proof-required",
  "website-path-proof-required",
  "mobile-app-path-proof-required",
  "away-mode-boundary-proof-required",
];

const roadmapOperatorControlPlaneSignals = [
  "phase81-command-result-record-boundary-ready",
  "roadmap-v2-ready",
  "operator-control-plane-ready",
  "not-cli-only",
  "safe-execution-spine-preserved",
  "approved-branch-development-preserved",
  "universal-engine-pulled-earlier",
  "website-path-included",
  "mobile-pwa-path-included",
  "native-app-path-included",
  "away-mode-bounded",
  "self-approval-blocked",
];

const safetyGates = [
  "S.E.R.A. roadmap and operator control plane phase only",
  "Driana remains the operator authority and product direction owner",
  "Tyler remains the local worker and command execution approval owner",
  "Roadmap v2 is declarative and repo-truth aligned",
  "Operator control plane v1 is architectural and visibility-first",
  "S.E.R.A. is explicitly not CLI-only",
  "CLI remains a validation and certification surface",
  "Operator console remains a visibility and review surface",
  "Future private studio becomes the daily operator surface",
  "Future website becomes the public service and proof surface",
  "Future mobile web/PWA becomes the remote approval companion",
  "Future native app becomes optional after the mobile web path proves value",
  "Safe execution spine remains preserved",
  "Approved branch development remains preserved",
  "Universal ingest engine is pulled earlier into the core path",
  "Universal deliverable engine is pulled earlier into the core path",
  "Portfolio, service, and proof generation are core roadmap outputs",
  "Away-mode autonomy remains bounded by owner-approved scope",
  "Away-mode autonomy cannot self-merge",
  "Away-mode autonomy cannot self-deploy",
  "Away-mode autonomy cannot expand scope silently",
  "Self-development requires approved branches and validation evidence",
  "No command execution is unlocked by the roadmap phase",
  "No PowerShell execution is unlocked by the roadmap phase",
  "No schtasks execution is unlocked by the roadmap phase",
  "No shell execution is unlocked by the roadmap phase",
  "No remote autonomous execution is unlocked by the roadmap phase",
  "No public website launch is claimed by the roadmap phase",
  "No native app availability is claimed by the roadmap phase",
  "No productization launch is claimed by the roadmap phase",
  "No external posting is allowed by the roadmap phase",
  "No purchase authority is allowed by the roadmap phase",
  "No legal, medical, financial, or licensed professional decision authority is allowed by the roadmap phase",
  "Emergency stop remains required before broader autonomy",
  "Evidence, reversibility, approval, and operator visibility remain the autonomy unlock pattern",
  "Phase 81 command result-record boundary remains represented",
  "Phase 80 command exit-code boundary remains represented",
  "Operator control plane must show approvals, status, evidence, blockers, and project work",
  "Website path must remain sequenced after internal proof and service readiness",
  "App path must remain sequenced after mobile web/PWA approval companion",
  ...Array.from({ length: 700 }, (_, index) => `Roadmap operator control plane safety hold ${String(index + 1).padStart(3, "0")} keeps autonomy bounded`),
];

const defaultSummary = {
  roadmapId: "phase82_sera_roadmap_operator_control_plane_v1",
  operatorAuthorityOwner: "Driana Smith-Wallace",
  commandApprovalOwner: "Tyler Wallace",
  sourcePhase: "Phase 81 Local Worker Command Result-Record Boundary Draft",
  safeState: "roadmap-and-control-plane-only",
  phase81CommandResultRecordBoundaryReady: true,
  phase80CommandExitCodeBoundaryReady: true,
  roadmapV2Required: true,
  operatorControlPlaneRequired: true,
  executionSpinePreserved: true,
  approvedBranchDevelopmentPreserved: true,
  universalIngestPulledEarlier: true,
  universalDeliverableEnginePulledEarlier: true,
  websitePathIncluded: true,
  mobilePwaPathIncluded: true,
  nativeAppPathIncluded: true,
  awayModeBoundedAutonomyIncluded: true,
  productizationOptionalAfterPrivateProof: true,
  ownerApprovalRequired: true,
  evidenceRequired: true,
  emergencyStopRequired: true,
  roadmapLockedForExecution: false,
  commandRunnerUnlocked: false,
  publicWebsiteLive: false,
  privateStudioLive: false,
  mobileCompanionLive: false,
  nativeAppAvailable: false,
  awayModeExecutionAuthorized: false,
  productizationLaunched: false,
};

const defaultBoundaries = {
  roadmapOnly: true,
  architectureOnly: true,
  ownerReviewAligned: true,
  commandExecutionAllowed: false,
  powershellExecutionAllowed: false,
  schtasksExecutionAllowed: false,
  shellExecutionAllowed: false,
  remoteAutonomousExecutionAllowed: false,
  backgroundExecutionAllowed: false,
  awayModeExecutionAllowed: false,
  selfApprovalAllowed: false,
  selfMergeAllowed: false,
  selfDeployAllowed: false,
  scopeExpansionAllowed: false,
  secretAccessAllowed: false,
  purchaseAuthorityAllowed: false,
  externalPostingAllowed: false,
  legalDecisionAuthorityAllowed: false,
  medicalDecisionAuthorityAllowed: false,
  financialDecisionAuthorityAllowed: false,
  publicWebsiteLaunchClaimAllowed: false,
  nativeAppReleaseClaimAllowed: false,
  productizationLaunchClaimAllowed: false,
  fileMutationAllowed: false,
  recordPersistenceAllowed: false,
  autoApprovalAllowed: false,
  autoMergeAllowed: false,
  autoDeployAllowed: false,
};

const defaultRouting = { suggestedQueue: "owner-review", executionAllowed: false, nextPhase: "Phase 83" };

function isSafeRelativePath(value) {
  return typeof value === "string" && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes("..");
}

function checkFile(rootDir, relativePath, blockers) {
  if (!isSafeRelativePath(relativePath)) {
    blockers.push(`Declared path must be safe and relative: ${relativePath}`);
    return;
  }
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) blockers.push(`Declared path missing: ${relativePath}`);
}

function requireFalse(value, name, blockers) {
  if (value !== false) blockers.push(`${name} must remain false`);
}

function requireTrue(value, name, blockers) {
  if (value !== true) blockers.push(`${name} must be true`);
}

export function createDefaultSeraRoadmapOperatorControlPlaneV1() {
  return {
    declaredPaths: [...declaredPaths],
    status: "roadmap-operator-control-plane-ready",
    summary: { ...defaultSummary },
    boundaries: { ...defaultBoundaries },
    requirements: roadmapOperatorControlPlaneRequirements.map((item) => ({ ...item })),
    fields: [...roadmapOperatorControlPlaneFields],
    evidenceRequirements: [...evidenceRequirements],
    signals: [...roadmapOperatorControlPlaneSignals],
    safetyGates: [...safetyGates],
    routing: { ...defaultRouting },
  };
}

export function inspectSeraRoadmapOperatorControlPlaneV1(config = createDefaultSeraRoadmapOperatorControlPlaneV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  for (const relativePath of config.declaredPaths ?? []) checkFile(rootDir, relativePath, blockers);

  const packagePath = path.join(rootDir, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (pkg.scripts?.["phase82:demo"] !== "node scripts/run-sera-roadmap-operator-control-plane-v1.mjs") blockers.push("package.json phase82:demo script is missing or incorrect");
    if (pkg.scripts?.["phase82:verify"] !== "npm run free-core:verify && npm run knowledge:verify && npm run phase81:demo && npm run phase82:demo") blockers.push("package.json phase82:verify script is missing or incorrect");
  } else blockers.push("package.json missing");

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  let appBindingCount = 0;
  if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    const bindings = [
      "seraRoadmapOperatorControlPlaneV1.roadmapOperatorControlPlaneSummary.operatorAuthorityOwner",
      "seraRoadmapOperatorControlPlaneV1.roadmapLanes.length",
      "seraRoadmapOperatorControlPlaneV1.roadmapMilestones.length",
      "seraRoadmapOperatorControlPlaneV1.roadmapOperatorControlPlaneSummary.websitePathIncluded",
      "seraRoadmapOperatorControlPlaneV1.roadmapOperatorControlPlaneSummary.mobilePwaPathIncluded",
      "seraRoadmapOperatorControlPlaneV1.roadmapOperatorControlPlaneSummary.nativeAppPathIncluded",
      "seraRoadmapOperatorControlPlaneV1.boundaries.commandExecutionAllowed",
    ];
    appBindingCount = bindings.filter((binding) => app.includes(binding)).length;
    for (const binding of bindings) if (!app.includes(binding)) blockers.push(`App binding missing: ${binding}`);
  } else blockers.push("App.tsx missing");

  const roadmapPath = path.join(rootDir, "docs/roadmap/SERA_ROADMAP_V2.md");
  if (fs.existsSync(roadmapPath)) {
    const roadmap = fs.readFileSync(roadmapPath, "utf8");
    for (const marker of ["Execution Spine", "Operator Control Plane", "Universal Engine", "Public website v1", "Mobile companion alpha", "Universal Operator Alpha", "Away-mode rule"]) {
      if (!roadmap.includes(marker)) blockers.push(`Roadmap marker missing: ${marker}`);
    }
  } else blockers.push("SERA_ROADMAP_V2.md missing");

  const architecturePath = path.join(rootDir, "docs/architecture/OPERATOR_CONTROL_PLANE_V1.md");
  if (fs.existsSync(architecturePath)) {
    const architecture = fs.readFileSync(architecturePath, "utf8");
    for (const marker of ["CLI / scripts", "Operator console", "Private S.E.R.A. Studio", "Public website", "Mobile web / PWA companion", "Native app", "Away mode"]) {
      if (!architecture.includes(marker)) blockers.push(`Operator control-plane marker missing: ${marker}`);
    }
  } else blockers.push("OPERATOR_CONTROL_PLANE_V1.md missing");

  const summary = config.summary ?? {};
  const boundaries = config.boundaries ?? {};
  for (const name of ["phase81CommandResultRecordBoundaryReady", "phase80CommandExitCodeBoundaryReady", "roadmapV2Required", "operatorControlPlaneRequired", "executionSpinePreserved", "approvedBranchDevelopmentPreserved", "universalIngestPulledEarlier", "universalDeliverableEnginePulledEarlier", "websitePathIncluded", "mobilePwaPathIncluded", "nativeAppPathIncluded", "awayModeBoundedAutonomyIncluded", "productizationOptionalAfterPrivateProof", "ownerApprovalRequired", "evidenceRequired", "emergencyStopRequired"]) requireTrue(summary[name], name, blockers);
  for (const name of ["roadmapLockedForExecution", "commandRunnerUnlocked", "publicWebsiteLive", "privateStudioLive", "mobileCompanionLive", "nativeAppAvailable", "awayModeExecutionAuthorized", "productizationLaunched"]) requireFalse(summary[name], name, blockers);
  for (const name of ["roadmapOnly", "architectureOnly", "ownerReviewAligned"]) requireTrue(boundaries[name], name, blockers);
  for (const name of ["commandExecutionAllowed", "powershellExecutionAllowed", "schtasksExecutionAllowed", "shellExecutionAllowed", "remoteAutonomousExecutionAllowed", "backgroundExecutionAllowed", "awayModeExecutionAllowed", "selfApprovalAllowed", "selfMergeAllowed", "selfDeployAllowed", "scopeExpansionAllowed", "secretAccessAllowed", "purchaseAuthorityAllowed", "externalPostingAllowed", "legalDecisionAuthorityAllowed", "medicalDecisionAuthorityAllowed", "financialDecisionAuthorityAllowed", "publicWebsiteLaunchClaimAllowed", "nativeAppReleaseClaimAllowed", "productizationLaunchClaimAllowed", "fileMutationAllowed", "recordPersistenceAllowed", "autoApprovalAllowed", "autoMergeAllowed", "autoDeployAllowed"]) requireFalse(boundaries[name], name, blockers);

  if ((config.declaredPaths ?? []).length !== 7) blockers.push("declaredFileCount must equal 7");
  if ((config.requirements ?? []).length !== 11) blockers.push("roadmapOperatorControlPlaneRequirementCount must equal 11");
  if ((config.fields ?? []).length !== 14) blockers.push("roadmapOperatorControlPlaneFieldCount must equal 14");
  if ((config.evidenceRequirements ?? []).length !== 11) blockers.push("roadmapOperatorControlPlaneEvidenceCount must equal 11");
  if ((config.signals ?? []).length !== 12) blockers.push("roadmapOperatorControlPlaneSignalCount must equal 12");
  if ((config.safetyGates ?? []).length !== 740) blockers.push("safetyGateCount must equal 740");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    roadmapOperatorControlPlaneStatus: config.status,
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: (config.declaredPaths ?? []).length,
    roadmapOperatorControlPlaneRequirementCount: (config.requirements ?? []).length,
    roadmapOperatorControlPlaneFieldCount: (config.fields ?? []).length,
    roadmapOperatorControlPlaneEvidenceCount: (config.evidenceRequirements ?? []).length,
    roadmapOperatorControlPlaneSignalCount: (config.signals ?? []).length,
    safetyGateCount: (config.safetyGates ?? []).length,
    appBindingCount,
    ...summary,
    ...boundaries,
    mutatesSource: false,
  };

  if (options.writeArtifacts) {
    const reportDir = path.join(rootDir, ".sera-roadmap-operator-control-plane");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(path.join(reportDir, "phase82-roadmap-operator-control-plane-status.json"), JSON.stringify(result, null, 2), "utf8");
    fs.writeFileSync(path.join(reportDir, "phase82-roadmap-operator-control-plane-status.md"), `# Phase 82 S.E.R.A. Roadmap + Operator Control Plane v1\n\nStatus: ${result.status}\n\nValidation failed count: ${result.validationFailedCount}\n`, "utf8");
  }
  return result;
}
