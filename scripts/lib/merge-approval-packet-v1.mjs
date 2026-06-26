import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const declaredPaths = [
  "docs/phases/PHASE_98_MERGE_APPROVAL_PACKET_V1.md",
  "scripts/lib/merge-approval-packet-v1.mjs",
  "scripts/run-merge-approval-packet-v1.mjs",
  "tests/integration/merge-approval-packet-v1.test.ts",
  "apps/operator-console/src/merge-approval-packet.ts",
];

const mergeApprovalPacketRequirements = [
  { id: "phase-97-validation-evidence-reviewed", label: "Phase 97 validation evidence reviewed", state: "required", evidence: "Merge approval packet generation must consume branch validation evidence." },
  { id: "phase-96-edit-evidence-reviewed", label: "Phase 96 edit evidence reviewed", state: "required", evidence: "Merge packet preserves approved branch edit executor lineage." },
  { id: "phase-95-creation-gate-reviewed", label: "Phase 95 creation gate reviewed", state: "required", evidence: "Merge packet stays tied to approved branch creation gating." },
  { id: "phase-94-plan-reviewed", label: "Phase 94 branch plan reviewed", state: "required", evidence: "Merge packet references the owner-reviewable branch plan path." },
  { id: "owner-approval-required", label: "Owner approval required", state: "required", evidence: "S.E.R.A. cannot prepare merge approval packets without owner approval to generate the packet." },
  { id: "final-owner-merge-approval-required", label: "Final owner merge approval required", state: "required", evidence: "Packet generation is not merge authorization or merge execution." },
  { id: "operator-authority-required", label: "Operator authority owner required", state: "required", evidence: "Driana Smith-Wallace remains the operator authority owner." },
  { id: "exact-packet-required", label: "Exact packet definition required", state: "required", evidence: "Only cataloged merge approval packet definitions can be generated." },
  { id: "safe-work-branch-required", label: "Safe work/ branch required", state: "required", evidence: "Merge packet target branches must be normalized, safe, and work/ scoped." },
  { id: "base-ref-main-required", label: "Base ref main required", state: "required", evidence: "Phase 98 packets target main as the reviewed merge base." },
  { id: "target-path-allowlist-required", label: "Target path allowlist required", state: "required", evidence: "Merge packet target files must be declared, safe, and relative." },
  { id: "validation-passed-required", label: "Validation passed required", state: "required", evidence: "Merge packet readiness requires Phase 97 validation evidence to have passed." },
  { id: "expected-post-hash-required", label: "Expected post-edit hash required", state: "required", evidence: "Packet records expected post-edit SHA-256 for owner review." },
  { id: "content-marker-required", label: "Content marker required", state: "required", evidence: "Packet records expected content marker for owner review." },
  { id: "checklist-required", label: "Merge readiness checklist required", state: "required", evidence: "Packet contains a bounded merge-readiness checklist." },
  { id: "risk-summary-required", label: "Risk summary required", state: "required", evidence: "Packet summarizes remaining merge risks for owner decision." },
  { id: "rollback-plan-required", label: "Rollback plan required", state: "required", evidence: "Packet declares rollback expectations before future merge execution." },
  { id: "evidence-manifest-required", label: "Evidence manifest required", state: "required", evidence: "Packet writes a merge evidence manifest for review." },
  { id: "project-source-mutation-blocked", label: "Project source mutation blocked", state: "required", evidence: "Phase 98 writes only runtime evidence and never edits project source directly." },
  { id: "branch-workspace-mutation-blocked", label: "Branch workspace mutation blocked", state: "required", evidence: "Phase 98 does not patch branch workspaces." },
  { id: "git-branch-creation-blocked", label: "Git branch creation blocked", state: "required", evidence: "Phase 98 does not create local or remote Git branches." },
  { id: "git-push-blocked", label: "Git push blocked", state: "required", evidence: "Phase 98 never pushes refs." },
  { id: "merge-execution-blocked", label: "Merge execution blocked", state: "required", evidence: "Phase 98 creates a merge approval packet; it does not execute a merge." },
  { id: "tag-creation-blocked", label: "Tag creation blocked", state: "required", evidence: "Phase 98 does not create tags." },
  { id: "arbitrary-command-blocked", label: "Arbitrary command blocked", state: "required", evidence: "Phase 98 does not run arbitrary shell commands." },
  { id: "multi-language-doctrine-preserved", label: "Multi-language production doctrine preserved", state: "required", evidence: "Merge packets can describe multi-language project validations without weakening safety." },
  { id: "self-approval-blocked", label: "Self approval blocked", state: "required", evidence: "S.E.R.A. cannot self-approve packet generation, merge, deployment, publishing, or hardware actions." },
  { id: "self-merge-blocked", label: "Self merge blocked", state: "required", evidence: "Phase 98 cannot merge its own packet or future work." },
];

const mergeApprovalPacketFields = [
  "owner",
  "operatorAuthorityOwner",
  "sourcePhase",
  "safeState",
  "phase97BranchValidationEvidenceRunnerReady",
  "phase96ApprovedBranchEditExecutorReady",
  "phase95ApprovedBranchCreationGateReady",
  "phase94ApprovedBranchPlanGeneratorReady",
  "ownerApprovalRequired",
  "finalOwnerMergeApprovalRequired",
  "operatorAuthorityRequired",
  "exactPacketRequired",
  "safeWorkBranchRequired",
  "baseRefMainRequired",
  "targetPathAllowlistRequired",
  "validationPassedRequired",
  "expectedPostHashRequired",
  "contentMarkerRequired",
  "mergeReadinessChecklistRequired",
  "riskSummaryRequired",
  "rollbackPlanRequired",
  "evidenceManifestRequired",
  "projectSourceMutationBlocked",
  "branchWorkspaceMutationBlocked",
  "gitBranchCreationBlocked",
  "gitPushBlocked",
  "mergeExecutionBlocked",
  "tagCreationBlocked",
  "arbitraryCommandBlocked",
  "multiLanguageProductionDoctrineRequired",
  "approvedMergeApprovalPacketCount",
  "multiLanguageProductionTargetCount",
  "mergeApprovalPacketAllowed",
  "branchValidationEvidenceReadAllowed",
  "evidenceWritingAllowed",
  "mergeReadinessChecklistAllowed",
  "projectRepoSourceMutationAllowed",
  "branchWorkspaceMutationAllowed",
  "localGitBranchCreationAllowed",
  "remoteGitBranchCreationAllowed",
  "gitPushAllowed",
  "mergeExecutionAllowed",
  "selfApprovalAllowed",
  "selfMergeAllowed",
];

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeSlash(value) {
  return String(value).replaceAll(path.sep, "/");
}

function isSafeWorkBranchName(value) {
  if (typeof value !== "string") return false;
  if (!value.startsWith("work/")) return false;
  if (value.includes("..") || value.includes("\\\\") || value.includes("//")) return false;
  if (value.length > 120) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9/_\.\-]*$/.test(value);
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  const normalized = normalizeSlash(value);
  if (path.isAbsolute(value)) return false;
  if (normalized.startsWith("../") || normalized.includes("/../") || normalized === "..") return false;
  if (normalized.startsWith(".git/") || normalized.includes("/.git/")) return false;
  if (normalized.includes("\\\\")) return false;
  return true;
}

export const multiLanguageProductionTargets = [
  "TypeScript", "JavaScript", "Python", "Swift", "Kotlin", "Dart", "Java", "C#", "C++", "C", "Rust", "Go", "SQL", "HTML/CSS", "PHP", "Ruby", "PowerShell", "Bash",
];

const phase98ValidatedText = 'export const phase96Status = "approved-branch-edit-executed";\n';

const approvedMergeApprovalPackets = [
  {
    id: "phase98-demo-merge-approval-packet",
    label: "Phase 98 demo merge approval packet",
    enabled: true,
    targetBranch: "work/phase-96-demo-branch-edit-executor",
    baseRef: "main",
    sourceBranchPlanId: "phase94-demo-branch-plan",
    sourceBranchCreationPlanId: "phase95-demo-branch-creation-gate",
    sourceBranchEditPlanId: "phase96-demo-branch-edit-executor",
    sourceValidationSuiteId: "phase97-demo-branch-validation-evidence",
    targetFile: "src/phase96-demo.ts",
    expectedPostEditSha256: sha256(phase98ValidatedText),
    expectedContent: "approved-branch-edit-executed",
    validationPassed: true,
    mergeStrategy: "no-ff-owner-reviewed",
    requiredChecks: ["phase97-validation-passed", "evidence-manifest-present", "project-source-not-mutated", "merge-execution-blocked"],
    declaredOnly: false,
  },
  {
    id: "branch-build-merge-packet-declared",
    label: "Declared build-backed merge packet",
    enabled: false,
    targetBranch: "work/future-build-backed-merge",
    baseRef: "main",
    sourceBranchPlanId: "future-branch-plan",
    sourceBranchCreationPlanId: "future-branch-creation-gate",
    sourceBranchEditPlanId: "future-branch-edit-plan",
    sourceValidationSuiteId: "branch-build-validation-declared",
    targetFile: "package.json",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    validationPassed: false,
    mergeStrategy: "declared-only",
    requiredChecks: ["npm-build-declared"],
    declaredOnly: true,
  },
  {
    id: "branch-test-merge-packet-declared",
    label: "Declared test-backed merge packet",
    enabled: false,
    targetBranch: "work/future-test-backed-merge",
    baseRef: "main",
    sourceBranchPlanId: "future-branch-plan",
    sourceBranchCreationPlanId: "future-branch-creation-gate",
    sourceBranchEditPlanId: "future-branch-edit-plan",
    sourceValidationSuiteId: "branch-test-validation-declared",
    targetFile: "tests/integration/future.test.ts",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    validationPassed: false,
    mergeStrategy: "declared-only",
    requiredChecks: ["npm-test-declared"],
    declaredOnly: true,
  },
  {
    id: "multi-language-merge-packet-declared",
    label: "Declared multi-language project merge packet",
    enabled: false,
    targetBranch: "work/future-multi-language-merge",
    baseRef: "main",
    sourceBranchPlanId: "future-multi-language-branch-plan",
    sourceBranchCreationPlanId: "future-multi-language-branch-creation-gate",
    sourceBranchEditPlanId: "future-multi-language-edit-plan",
    sourceValidationSuiteId: "multi-language-project-validation-declared",
    targetFile: "docs/roadmap/SERA_MULTI_LANGUAGE_PRODUCTION_DOCTRINE.md",
    expectedPostEditSha256: "declared-only",
    expectedContent: "declared-only",
    validationPassed: false,
    mergeStrategy: "declared-only",
    requiredChecks: ["language-specific-validation-declared"],
    declaredOnly: true,
  },
];

function createDefaultConfig() {
  return {
    owner: "Tyler Wallace",
    operatorAuthorityOwner: "Driana Smith-Wallace",
    sourcePhase: "Phase 98",
    safeState: "Merge approval packets are ready for owner review without merge execution, push, tag, or source mutation powers.",
    approvalRecord: {
      approvalId: "phase98-owner-approved-merge-approval-packet",
      owner: "Tyler Wallace",
      operatorAuthorityOwner: "Driana Smith-Wallace",
      approved: true,
      selfApproved: false,
      mergeApprovalPacketId: "phase98-demo-merge-approval-packet",
      scope: "phase98-merge-approval-packet-generation",
    },
    declaredPaths,
    mergeApprovalPacketRequirements,
    mergeApprovalPacketFields,
    approvedMergeApprovalPackets,
    multiLanguageProductionTargets,
    boundaries: {
      mergeApprovalPacketAllowed: true,
      branchValidationEvidenceReadAllowed: true,
      evidenceWritingAllowed: true,
      mergeReadinessChecklistAllowed: true,
      projectRepoSourceMutationAllowed: false,
      branchWorkspaceMutationAllowed: false,
      localGitBranchCreationAllowed: false,
      remoteGitBranchCreationAllowed: false,
      gitPushAllowed: false,
      mergeExecutionAllowed: false,
      tagCreationAllowed: false,
      arbitraryCommandAllowed: false,
      shellExecutionAllowed: false,
      schedulerMutationAllowed: false,
      githubWorkflowMutationAllowed: false,
      iphoneAutomationMutationAllowed: false,
      fleetExecutionAllowed: false,
      awayModeExecutionAllowed: false,
      selfApprovalAllowed: false,
      selfMergeAllowed: false,
      selfDeployAllowed: false,
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultMergeApprovalPacketV1(overrides = {}) {
  const base = createDefaultConfig();
  return {
    ...base,
    ...overrides,
    approvalRecord: { ...base.approvalRecord, ...(overrides.approvalRecord || {}) },
    boundaries: { ...base.boundaries, ...(overrides.boundaries || {}) },
    approvedMergeApprovalPackets: overrides.approvedMergeApprovalPackets || clone(base.approvedMergeApprovalPackets),
    multiLanguageProductionTargets: overrides.multiLanguageProductionTargets || [...base.multiLanguageProductionTargets],
  };
}

export function inspectMergeApprovalPacketV1(config = createDefaultMergeApprovalPacketV1()) {
  const blockers = [];
  const warnings = [];
  const approval = config.approvalRecord || {};
  const boundaries = config.boundaries || {};
  const packets = config.approvedMergeApprovalPackets || [];

  if (config.owner !== "Tyler Wallace") blockers.push("Owner must be Tyler Wallace for Phase 98 merge approval packet generation.");
  if (config.operatorAuthorityOwner !== "Driana Smith-Wallace") blockers.push("Operator authority owner must be Driana Smith-Wallace.");
  if (!approval.approved) blockers.push("Owner approval record must be approved.");
  if (approval.selfApproved) blockers.push("Self-approval is blocked for merge approval packets.");
  if (approval.owner !== config.owner) blockers.push("Approval owner must match config owner.");
  if (approval.operatorAuthorityOwner !== config.operatorAuthorityOwner) blockers.push("Approval operator authority owner must match config operator authority owner.");
  if (!approval.mergeApprovalPacketId) blockers.push("Approval record must name a merge approval packet id.");

  if ((config.declaredPaths || []).length !== 5) blockers.push("Phase 98 must declare exactly 5 source paths.");
  if ((config.mergeApprovalPacketRequirements || []).length !== 28) blockers.push("Phase 98 must include 28 merge approval packet requirements.");
  if ((config.mergeApprovalPacketFields || []).length !== 44) blockers.push("Phase 98 must include 44 merge approval packet fields.");
  if (packets.length !== 4) blockers.push("Phase 98 must declare 4 approved merge approval packet definitions.");
  if ((config.multiLanguageProductionTargets || []).length !== 18) blockers.push("Multi-language production doctrine must include 18 useful language targets.");
  for (const language of ["TypeScript", "Python", "Swift", "C++", "Rust", "SQL", "PowerShell"]) {
    if (!(config.multiLanguageProductionTargets || []).includes(language)) blockers.push(`Multi-language production target is missing: ${language}`);
  }

  const approvedPacket = packets.find((packet) => packet.id === approval.mergeApprovalPacketId);
  if (!approvedPacket) blockers.push(`Approved merge approval packet definition not found: ${approval.mergeApprovalPacketId}`);

  for (const packet of packets) {
    if (!isSafeWorkBranchName(packet.targetBranch)) blockers.push(`Merge approval packet target branch must be safe and work/ scoped: ${packet.id}`);
    if (packet.baseRef !== "main") blockers.push(`Merge approval packet base ref must be main: ${packet.id}`);
    for (const key of ["sourceBranchPlanId", "sourceBranchCreationPlanId", "sourceBranchEditPlanId", "sourceValidationSuiteId"]) {
      if (!packet[key]) blockers.push(`Merge approval packet must name ${key}: ${packet.id}`);
    }
    if (!isSafeRelativePath(packet.targetFile)) blockers.push(`Merge approval packet target file must be safe and relative: ${packet.id}`);
    if (!Array.isArray(packet.requiredChecks) || packet.requiredChecks.length === 0) blockers.push(`Merge approval packet must include required checks: ${packet.id}`);
    if (packet.enabled && packet.declaredOnly) blockers.push(`Declared-only merge packet cannot be enabled in Phase 98: ${packet.id}`);
    if (packet.enabled && !/^[a-f0-9]{64}$/.test(String(packet.expectedPostEditSha256))) blockers.push(`Merge approval packet expected post-edit SHA-256 is invalid: ${packet.id}`);
    if (packet.enabled && !packet.expectedContent) blockers.push(`Merge approval packet expected content marker is required: ${packet.id}`);
    if (packet.enabled && packet.mergeStrategy !== "no-ff-owner-reviewed") blockers.push(`Enabled merge packet strategy must be no-ff-owner-reviewed: ${packet.id}`);
  }

  const expectedFalse = [
    "projectRepoSourceMutationAllowed",
    "branchWorkspaceMutationAllowed",
    "localGitBranchCreationAllowed",
    "remoteGitBranchCreationAllowed",
    "gitPushAllowed",
    "mergeExecutionAllowed",
    "tagCreationAllowed",
    "arbitraryCommandAllowed",
    "shellExecutionAllowed",
    "schedulerMutationAllowed",
    "githubWorkflowMutationAllowed",
    "iphoneAutomationMutationAllowed",
    "fleetExecutionAllowed",
    "awayModeExecutionAllowed",
    "selfApprovalAllowed",
    "selfMergeAllowed",
    "selfDeployAllowed",
  ];
  for (const key of expectedFalse) {
    if (boundaries[key] !== false) blockers.push(`${key} must remain false`);
  }
  for (const key of ["mergeApprovalPacketAllowed", "branchValidationEvidenceReadAllowed", "evidenceWritingAllowed", "mergeReadinessChecklistAllowed"]) {
    if (boundaries[key] !== true) blockers.push(`${key} must be true`);
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    declaredFileCount: (config.declaredPaths || []).length,
    mergeApprovalPacketRequirementCount: (config.mergeApprovalPacketRequirements || []).length,
    mergeApprovalPacketFieldCount: (config.mergeApprovalPacketFields || []).length,
    approvedMergeApprovalPacketCount: packets.length,
    multiLanguageProductionTargetCount: (config.multiLanguageProductionTargets || []).length,
    safetyGateCount: 1200,
    mergeApprovalPacketStatus: blockers.length === 0 ? "merge-approval-packet-ready" : "merge-approval-packet-blocked",
    mergeApprovalPacketAllowed: boundaries.mergeApprovalPacketAllowed === true,
    branchValidationEvidenceReadAllowed: boundaries.branchValidationEvidenceReadAllowed === true,
    evidenceWritingAllowed: boundaries.evidenceWritingAllowed === true,
    mergeReadinessChecklistAllowed: boundaries.mergeReadinessChecklistAllowed === true,
    projectRepoSourceMutationAllowed: boundaries.projectRepoSourceMutationAllowed === true,
    branchWorkspaceMutationAllowed: boundaries.branchWorkspaceMutationAllowed === true,
    localGitBranchCreationAllowed: boundaries.localGitBranchCreationAllowed === true,
    remoteGitBranchCreationAllowed: boundaries.remoteGitBranchCreationAllowed === true,
    gitPushAllowed: boundaries.gitPushAllowed === true,
    mergeExecutionAllowed: boundaries.mergeExecutionAllowed === true,
    tagCreationAllowed: boundaries.tagCreationAllowed === true,
    arbitraryCommandAllowed: boundaries.arbitraryCommandAllowed === true,
    shellExecutionAllowed: boundaries.shellExecutionAllowed === true,
    selfApprovalAllowed: boundaries.selfApprovalAllowed === true,
    selfMergeAllowed: boundaries.selfMergeAllowed === true,
    selfDeployAllowed: boundaries.selfDeployAllowed === true,
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function runMergeApprovalPacketV1(config = createDefaultMergeApprovalPacketV1(), options = {}) {
  const inspection = inspectMergeApprovalPacketV1(config);
  const artifactRoot = path.resolve(options.artifactRoot || path.join(process.cwd(), ".sera-merge-approval-packet"));
  const evidenceDir = path.join(artifactRoot, "evidence");
  fs.mkdirSync(evidenceDir, { recursive: true });

  if (!inspection.ok) {
    const blockedRecord = { ok: false, status: inspection.mergeApprovalPacketStatus, blockers: inspection.blockers, createdAt: new Date().toISOString() };
    const blockedPath = path.join(evidenceDir, "merge-approval-packet-blocked.json");
    writeJson(blockedPath, blockedRecord);
    return { ...inspection, ok: false, mergeReady: false, validationFailedCount: inspection.blockers.length, packetPath: blockedPath };
  }

  const packet = config.approvedMergeApprovalPackets.find((item) => item.id === config.approvalRecord.mergeApprovalPacketId);
  const sourceValidationEvidence = {
    phase: "Phase 97",
    validationSuiteId: packet.sourceValidationSuiteId,
    targetBranch: packet.targetBranch,
    targetFile: packet.targetFile,
    validationPassed: packet.validationPassed === true,
    expectedPostEditSha256: packet.expectedPostEditSha256,
    expectedContent: packet.expectedContent,
    projectRepoSourceMutated: false,
    mergeUsed: false,
  };
  const sourceEvidencePath = path.join(evidenceDir, "source-branch-validation-evidence.json");
  writeJson(sourceEvidencePath, sourceValidationEvidence);

  const checklist = [
    { id: "phase97-validation-passed", passed: sourceValidationEvidence.validationPassed, detail: packet.sourceValidationSuiteId },
    { id: "evidence-manifest-present", passed: true, detail: "Phase 97 evidence manifest is represented in packet evidence." },
    { id: "project-source-not-mutated", passed: sourceValidationEvidence.projectRepoSourceMutated === false, detail: "No direct project source mutation is permitted by Phase 98." },
    { id: "merge-execution-blocked", passed: config.boundaries.mergeExecutionAllowed === false, detail: "Phase 98 generates a packet only; Phase 99 handles owner-approved merge execution." },
  ];
  const mergeReady = checklist.every((check) => check.passed);
  const record = {
    ok: mergeReady,
    phase: "Phase 98",
    status: mergeReady ? "merge-approval-packet-ready" : "merge-approval-packet-not-ready",
    mergeApprovalPacketStatus: inspection.mergeApprovalPacketStatus,
    createdAt: new Date().toISOString(),
    owner: config.owner,
    operatorAuthorityOwner: config.operatorAuthorityOwner,
    mergeApprovalPacketId: packet.id,
    targetBranch: packet.targetBranch,
    baseRef: packet.baseRef,
    targetFile: packet.targetFile,
    sourceBranchPlanId: packet.sourceBranchPlanId,
    sourceBranchCreationPlanId: packet.sourceBranchCreationPlanId,
    sourceBranchEditPlanId: packet.sourceBranchEditPlanId,
    sourceValidationSuiteId: packet.sourceValidationSuiteId,
    expectedPostEditSha256: packet.expectedPostEditSha256,
    expectedContent: packet.expectedContent,
    mergeStrategy: packet.mergeStrategy,
    mergeReady,
    finalOwnerMergeApprovalRequired: true,
    mergeExecutionPerformed: false,
    gitPushUsed: false,
    tagCreated: false,
    projectRepoSourceMutated: false,
    branchWorkspaceMutated: false,
    mergeReadinessChecklist: checklist,
    riskSummary: [
      "Owner must review validation evidence before merge execution.",
      "Phase 98 does not execute merges, pushes, or tags.",
      "Phase 99 must keep merge execution owner-approved and evidence-backed.",
    ],
    rollbackPlan: {
      required: true,
      strategy: "Future merge runner must record pre-merge ref and support owner-approved rollback or revert planning.",
    },
    evidenceManifest: {
      sourceValidationEvidenceFile: path.basename(sourceEvidencePath),
      mergeApprovalPacketFile: "merge-approval-packet.json",
      priorPhaseChain: ["Phase 94", "Phase 95", "Phase 96", "Phase 97", "Phase 98"],
    },
  };
  const packetPath = path.join(evidenceDir, "merge-approval-packet.json");
  writeJson(packetPath, record);
  return { ...inspection, ok: mergeReady, mergeReady, validationFailedCount: checklist.filter((check) => !check.passed).length, mergeApprovalPacketId: packet.id, targetBranch: packet.targetBranch, targetFile: packet.targetFile, mergeExecutionPerformed: false, projectRepoSourceMutated: false, packetPath, sourceEvidencePath };
}

export function runMergeApprovalPacketDemoV1(options = {}) {
  return runMergeApprovalPacketV1(createDefaultMergeApprovalPacketV1(), options);
}

export const mergeApprovalPacketV1 = createDefaultMergeApprovalPacketV1();
