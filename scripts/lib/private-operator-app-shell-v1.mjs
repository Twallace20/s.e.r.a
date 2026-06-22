import fs from "node:fs";
import path from "node:path";

export function createDefaultPrivateOperatorAppShellV1() {
  return {
    phase: 46,
    name: "Private Operator App Shell v1",
    declaredPaths: [
      "docs/phases/PHASE_46_PRIVATE_OPERATOR_APP_SHELL_V1.md",
      "scripts/lib/private-operator-app-shell-v1.mjs",
      "scripts/run-private-operator-app-shell-v1.mjs",
      "tests/integration/private-operator-app-shell-v1.test.ts",
      "apps/operator-console/README.md",
      "apps/operator-console/package.json",
      "apps/operator-console/index.html",
      "apps/operator-console/vite.config.ts",
      "apps/operator-console/tsconfig.json",
      "apps/operator-console/src/main.tsx",
      "apps/operator-console/src/App.tsx",
      "apps/operator-console/src/styles.css",
    ],
    appSurfaces: [
      "Command Center",
      "Requests",
      "Overnight Queue",
      "Workflows",
      "Files",
      "Evidence",
      "Safety Gates",
      "Branches",
      "Settings",
    ],
    layoutSections: ["left sidebar navigation", "top status bar", "main dashboard overview", "right review panel"],
    dashboardModules: [
      "system status",
      "create request panel",
      "overnight queue",
      "safety gates",
      "morning review packet",
      "recent activity feed",
      "file intake area",
      "branch preview",
      "evidence preview",
      "settings placeholder",
    ],
    safetyGates: [
      "Allowed commands only",
      "Branch-only work",
      "No auto-merge",
      "Evidence required",
      "Manual approval required",
      "No backend execution in Phase 46",
      "No authentication yet",
      "No runner connectivity yet",
    ],
    validationCommands: [
      "npm run knowledge:verify",
      "npm run phase46:demo",
      "npm run phase46:verify",
      "npm run hygiene",
      "npm run build",
      "npm test",
      "npm run certify",
      "npm run verify",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      appShellOnly: true,
      designAssistedShell: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      freeCoreCompatible: true,
      commandExecutionAllowed: false,
      remoteExecutionAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
      autoMergeAllowed: false,
      selfApprovesPlan: false,
      selfApprovalAllowed: false,
    },
  };
}

function isSafeRelativePath(relativePath) {
  return typeof relativePath === "string" && relativePath.length > 0 && !path.isAbsolute(relativePath) && !relativePath.split(/[\\/]+/).includes("..");
}

function countMissingNeedles(content, needles) {
  return needles.filter((needle) => !content.includes(needle));
}

export function inspectPrivateOperatorAppShellV1(config = createDefaultPrivateOperatorAppShellV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const blockers = [];
  const missingFiles = [];

  for (const declaredPath of config.declaredPaths) {
    if (!isSafeRelativePath(declaredPath)) {
      blockers.push(`declared path must be safe and relative: ${declaredPath}`);
      continue;
    }

    if (!fs.existsSync(path.join(rootDir, declaredPath))) {
      missingFiles.push(declaredPath);
    }
  }

  if (missingFiles.length > 0) {
    blockers.push(`missing declared path(s): ${missingFiles.join(", ")}`);
  }

  const packagePath = path.join(rootDir, "apps", "operator-console", "package.json");
  const appPath = path.join(rootDir, "apps", "operator-console", "src", "App.tsx");
  const stylePath = path.join(rootDir, "apps", "operator-console", "src", "styles.css");
  const docsPath = path.join(rootDir, "docs", "phases", "PHASE_46_PRIVATE_OPERATOR_APP_SHELL_V1.md");

  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, "utf8") : "";
  const styleContent = fs.existsSync(stylePath) ? fs.readFileSync(stylePath, "utf8") : "";
  const docsContent = fs.existsSync(docsPath) ? fs.readFileSync(docsPath, "utf8") : "";
  const packageContent = fs.existsSync(packagePath) ? fs.readFileSync(packagePath, "utf8") : "";

  const missingSurfaces = countMissingNeedles(appContent, config.appSurfaces);
  if (missingSurfaces.length > 0) {
    blockers.push(`missing app surface label(s): ${missingSurfaces.join(", ")}`);
  }

  const requiredCopy = [
    "Desktop worker",
    "Local runtime",
    "GitHub bridge",
    "Tailscale access",
    "Attach files",
    "Submit to queue",
    "Approve",
    "Reject",
    "Request changes",
    "No auto-merge",
  ];
  const missingCopy = countMissingNeedles(appContent, requiredCopy);
  if (missingCopy.length > 0) {
    blockers.push(`missing dashboard module copy: ${missingCopy.join(", ")}`);
  }

  const requiredDocs = [
    "How to build Phase 46",
    "Phase 46 intentionally does not add backend logic",
    "Phase 47",
    "Phase 48",
    "Phase 49",
    "Phase 50",
  ];
  const missingDocs = countMissingNeedles(docsContent, requiredDocs);
  if (missingDocs.length > 0) {
    blockers.push(`phase doc missing build/roadmap detail: ${missingDocs.join(", ")}`);
  }

  const requiredPackageText = ["vite", "react", "typescript"];
  const missingPackageText = countMissingNeedles(packageContent, requiredPackageText);
  if (missingPackageText.length > 0) {
    blockers.push(`operator app package missing dependency marker(s): ${missingPackageText.join(", ")}`);
  }

  if (!styleContent.includes("operator-shell") || !styleContent.includes("dashboard-grid")) {
    blockers.push("operator app CSS must include shell and dashboard layout classes");
  }

  const boundaries = config.boundaries;
  const boundaryFailures = [];
  const requiredTrue = ["localOnly", "privateAppOnly", "appShellOnly", "designAssistedShell", "frontendOnly", "noBackendLogic", "noAuthentication", "freeCoreCompatible"];
  const requiredFalse = ["commandExecutionAllowed", "remoteExecutionAllowed", "runnerConnectivityAllowed", "mutatesSource", "autoMergeAllowed", "selfApprovesPlan", "selfApprovalAllowed"];

  for (const key of requiredTrue) {
    if (boundaries[key] !== true) boundaryFailures.push(`${key} must be true`);
  }

  for (const key of requiredFalse) {
    if (boundaries[key] !== false) boundaryFailures.push(`${key} must be false`);
  }

  blockers.push(...boundaryFailures);

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "blocked",
    phase: config.phase,
    privateOperatorAppShellStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    missingFiles,
    declaredFileCount: config.declaredPaths.length,
    layoutSectionCount: config.layoutSections.length,
    dashboardModuleCount: config.dashboardModules.length,
    appSurfaceCount: config.appSurfaces.length,
    safetyGateCount: config.safetyGates.length,
    validationCommandCount: config.validationCommands.length,
    ...boundaries,
  };

  const reportDir = path.join(rootDir, ".sera-private-operator-app-shell");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase46-private-operator-app-shell-v1.json");
  const markdownPath = path.join(reportDir, "phase46-private-operator-app-shell-v1.md");
  const historyPath = path.join(reportDir, "history.jsonl");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    `# Phase 46 Private Operator App Shell v1\n\nStatus: ${result.status}\n\nDeclared files: ${result.declaredFileCount}\n\nBlockers: ${blockers.length === 0 ? "none" : blockers.join("; ")}\n`,
    "utf8",
  );
  fs.appendFileSync(historyPath, `${JSON.stringify({ timestamp: new Date().toISOString(), ...result })}\n`, "utf8");

  return { ...result, jsonPath, markdownPath, historyPath };
}
