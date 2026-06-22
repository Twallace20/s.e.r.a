import fs from "node:fs";
import path from "node:path";

export function createDefaultFileIntakeV1() {
  return {
    phase: 49,
    name: "file-intake-v1",
    declaredPaths: [
      "docs/phases/PHASE_49_FILE_INTAKE_V1.md",
      "apps/operator-console/src/file-intake.ts",
      "scripts/lib/file-intake-v1.mjs",
      "scripts/run-file-intake-v1.mjs",
      "tests/integration/file-intake-v1.test.ts",
    ],
    metadataFields: [
      "name",
      "extension",
      "category",
      "sizeLabel",
      "source",
      "classification",
      "reviewState",
      "routing.suggestedQueue",
    ],
    intakeSignals: [
      "file name",
      "file extension",
      "file category",
      "file size label",
      "file source",
      "file classification",
      "review state",
    ],
    requiredSafetyGates: [
      "Capture file metadata only",
      "Owner review required before file processing",
      "No arbitrary file access",
      "No file execution",
      "No file mutation",
      "No source mutation",
      "No runner connectivity",
      "No backend file service",
      "No authentication changes",
      "No auto-processing",
      "No auto-routing",
      "No auto-merge",
      "No self-approval",
    ],
    requiredAppBindings: [
      "fileIntakePacket.primaryFile.name",
      "fileIntakePacket.primaryFile.classification",
      "fileIntakePacket.routing.suggestedQueue",
      "fileIntakePacket.boundaries.fileExecutionAllowed",
    ],
    boundaries: {
      localOnly: true,
      privateAppOnly: true,
      metadataCaptureOnly: true,
      readOnly: true,
      frontendOnly: true,
      noBackendLogic: true,
      noAuthentication: true,
      arbitraryFileAccessAllowed: false,
      fileExecutionAllowed: false,
      fileMutationAllowed: false,
      runnerConnectivityAllowed: false,
      mutatesSource: false,
      autoProcessingAllowed: false,
      autoRouteAllowed: false,
      autoMergeAllowed: false,
      selfApprovalAllowed: false,
    },
  };
}

function isSafeRelativePath(relativePath) {
  return (
    typeof relativePath === "string" &&
    relativePath.length > 0 &&
    !path.isAbsolute(relativePath) &&
    !relativePath.split(/[\\/]+/).includes("..")
  );
}

function writeReports(rootDir, result) {
  const reportDir = path.join(rootDir, ".sera-file-intake");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "phase49-file-intake-status.json");
  const markdownPath = path.join(reportDir, "phase49-file-intake-status.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    [
      "# Phase 49 File Intake v1",
      "",
      `Status: ${result.fileIntakeStatus}`,
      `Validation failed count: ${result.validationFailedCount}`,
      `Declared file count: ${result.declaredFileCount}`,
      `File metadata field count: ${result.fileMetadataFieldCount}`,
      `Intake signal count: ${result.intakeSignalCount}`,
      `Safety gate count: ${result.safetyGateCount}`,
      "",
      "## Boundaries",
      "",
      `- Local only: ${result.localOnly}`,
      `- Private app only: ${result.privateAppOnly}`,
      `- Metadata capture only: ${result.metadataCaptureOnly}`,
      `- Read only: ${result.readOnly}`,
      `- Frontend only: ${result.frontendOnly}`,
      `- Backend logic disabled: ${result.noBackendLogic}`,
      `- Authentication disabled: ${result.noAuthentication}`,
      `- Arbitrary file access allowed: ${result.arbitraryFileAccessAllowed}`,
      `- File execution allowed: ${result.fileExecutionAllowed}`,
      `- File mutation allowed: ${result.fileMutationAllowed}`,
      `- Runner connectivity allowed: ${result.runnerConnectivityAllowed}`,
      `- Mutates source: ${result.mutatesSource}`,
      `- Auto-processing allowed: ${result.autoProcessingAllowed}`,
      `- Auto-route allowed: ${result.autoRouteAllowed}`,
      `- Auto-merge allowed: ${result.autoMergeAllowed}`,
      `- Self-approval allowed: ${result.selfApprovalAllowed}`,
      "",
      "## Blockers",
      "",
      ...(result.blockers.length === 0 ? ["- none"] : result.blockers.map((blocker) => `- ${blocker}`)),
      "",
    ].join("\n"),
    "utf8",
  );

  return { jsonPath, markdownPath };
}

export function inspectFileIntakeV1(config = createDefaultFileIntakeV1(), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const writeArtifacts = options.writeArtifacts ?? true;
  const blockers = [];

  for (const declaredPath of config.declaredPaths) {
    if (!isSafeRelativePath(declaredPath)) {
      blockers.push(`Declared path must be safe and relative: ${declaredPath}`);
      continue;
    }

    if (!fs.existsSync(path.join(rootDir, declaredPath))) {
      blockers.push(`Missing declared file: ${declaredPath}`);
    }
  }

  const appPath = path.join(rootDir, "apps/operator-console/src/App.tsx");
  const fileIntakePath = path.join(rootDir, "apps/operator-console/src/file-intake.ts");
  const packagePath = path.join(rootDir, "package.json");

  const appContent = fs.existsSync(appPath) ? fs.readFileSync(appPath, "utf8") : "";
  const fileIntakeContent = fs.existsSync(fileIntakePath) ? fs.readFileSync(fileIntakePath, "utf8") : "";
  const packageContent = fs.existsSync(packagePath) ? fs.readFileSync(packagePath, "utf8") : "";

  if (!fileIntakeContent.includes("fileIntakePacket")) {
    blockers.push("file-intake.ts must export fileIntakePacket");
  }

  if (!fileIntakeContent.includes("Phase 49 · File Intake v1")) {
    blockers.push("file intake packet must identify Phase 49");
  }

  for (const field of config.metadataFields) {
    const fieldName = field.split(".").at(-1);
    if (!fileIntakeContent.includes(fieldName)) {
      blockers.push(`file intake packet missing metadata field: ${field}`);
    }
  }

  for (const gate of config.requiredSafetyGates) {
    if (!fileIntakeContent.includes(gate)) {
      blockers.push(`file intake packet missing safety gate: ${gate}`);
    }
  }

  for (const binding of config.requiredAppBindings) {
    if (!appContent.includes(binding)) {
      blockers.push(`operator app missing file intake binding: ${binding}`);
    }
  }

  if (!appContent.includes("File Intake Review")) {
    blockers.push("operator app missing File Intake Review card");
  }

  if (!packageContent.includes('"phase49:demo"')) {
    blockers.push("package.json missing phase49:demo script");
  }

  if (!packageContent.includes('"phase49:verify"')) {
    blockers.push("package.json missing phase49:verify script");
  }

  const boundaries = config.boundaries;
  if (!boundaries.localOnly) blockers.push("localOnly must remain true");
  if (!boundaries.privateAppOnly) blockers.push("privateAppOnly must remain true");
  if (!boundaries.metadataCaptureOnly) blockers.push("metadataCaptureOnly must remain true");
  if (!boundaries.readOnly) blockers.push("readOnly must remain true");
  if (!boundaries.frontendOnly) blockers.push("frontendOnly must remain true");
  if (!boundaries.noBackendLogic) blockers.push("noBackendLogic must remain true");
  if (!boundaries.noAuthentication) blockers.push("noAuthentication must remain true");
  if (boundaries.arbitraryFileAccessAllowed) blockers.push("arbitraryFileAccessAllowed must remain false");
  if (boundaries.fileExecutionAllowed) blockers.push("fileExecutionAllowed must remain false");
  if (boundaries.fileMutationAllowed) blockers.push("fileMutationAllowed must remain false");
  if (boundaries.runnerConnectivityAllowed) blockers.push("runnerConnectivityAllowed must remain false");
  if (boundaries.mutatesSource) blockers.push("mutatesSource must remain false");
  if (boundaries.autoProcessingAllowed) blockers.push("autoProcessingAllowed must remain false");
  if (boundaries.autoRouteAllowed) blockers.push("autoRouteAllowed must remain false");
  if (boundaries.autoMergeAllowed) blockers.push("autoMergeAllowed must remain false");
  if (boundaries.selfApprovalAllowed) blockers.push("selfApprovalAllowed must remain false");

  const result = {
    ok: blockers.length === 0,
    status: blockers.length === 0 ? "passed" : "failed",
    fileIntakeStatus: blockers.length === 0 ? "ready" : "blocked",
    validationFailedCount: blockers.length,
    blockers,
    declaredFileCount: config.declaredPaths.length,
    fileMetadataFieldCount: config.metadataFields.length,
    intakeSignalCount: config.intakeSignals.length,
    safetyGateCount: config.requiredSafetyGates.length,
    appBindingCount: config.requiredAppBindings.length,
    localOnly: boundaries.localOnly,
    privateAppOnly: boundaries.privateAppOnly,
    metadataCaptureOnly: boundaries.metadataCaptureOnly,
    readOnly: boundaries.readOnly,
    frontendOnly: boundaries.frontendOnly,
    noBackendLogic: boundaries.noBackendLogic,
    noAuthentication: boundaries.noAuthentication,
    arbitraryFileAccessAllowed: boundaries.arbitraryFileAccessAllowed,
    fileExecutionAllowed: boundaries.fileExecutionAllowed,
    fileMutationAllowed: boundaries.fileMutationAllowed,
    runnerConnectivityAllowed: boundaries.runnerConnectivityAllowed,
    mutatesSource: boundaries.mutatesSource,
    autoProcessingAllowed: boundaries.autoProcessingAllowed,
    autoRouteAllowed: boundaries.autoRouteAllowed,
    autoMergeAllowed: boundaries.autoMergeAllowed,
    selfApprovalAllowed: boundaries.selfApprovalAllowed,
  };

  if (writeArtifacts) {
    Object.assign(result, writeReports(rootDir, result));
  }

  return result;
}
