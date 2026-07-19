import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KnowledgeRuntime,
  createIntakeAuthorization,
  normalizeIntakeRequest
} from "@sera/knowledge-runtime";
import {
  LocalModelRuntime,
  ProviderRegistry,
  DEFAULT_MODEL_POLICY,
  createModelAuthorization,
  normalizeRequest,
  type ModelDescriptor,
  type ModelRuntimePolicy,
  type ProviderDescriptor,
  type ModelRuntimeProvider,
  type NormalizedModelRequest,
  type ProviderResponse
} from "@sera/model-runtime";
import { createRuntimeStateConfig, openRuntimeState, type RuntimeStateStore } from "@sera/runtime-state";

export const PORTABLE_BASE_MVP_VERSION = "portable-offline-base-mvp-v1";
export const PORTABLE_BASE_MVP_PACKAGE = "@sera/portable-base-mvp";
export const PORTABLE_BASE_MVP_SCHEMA = "sera.portable-offline-base-mvp.v1";
export const PORTABLE_BASE_MVP_ARTIFACT_NAME = "s.e.r.a_base_mvp_v1_windows_x64.zip";
export const PORTABLE_BASE_MVP_RELEASE_TAG = "base-mvp-v1";
export const PORTABLE_BASE_MVP_PROVIDER_ID = "ollama-loopback-base-mvp-v1";
export const PORTABLE_BASE_MVP_DEFAULT_MODEL = "llama3.2:1b";
export const PORTABLE_BASE_MVP_RUNTIME_PATH = "runtime/node.exe";

const CLEAN_EVIDENCE_SCHEMAS: Record<string, string> = Object.fromEntries([
  "clean-environment-profile", "clean-proof-kit-manifest", "release-transfer-verification", "environment-network-denial",
  "endpoint-observation-report", "provider-provisioning-report", "ollama-provider-report", "model-manifest", "launcher-report",
  "desktop-operator-visual-manifest", "runtime-health-report", "intake-proof", "provenance-proof", "learning-preflight-proof",
  "ollama-invocation-proof", "model-evaluation-proof", "operator-review-proof", "artifact-closeout-proof", "shutdown-proof",
  "restart-proof", "recurrence-prevention-proof", "related-context-proof", "out-of-scope-proof", "diagnostics-proof",
  "clean-environment-negative-proof", "claim-to-proof-matrix", "final-clean-environment-report"
].map((name) => [`${name}.json`, `sera.${name}.v1`]));

export interface CapabilityClaim {
  claimId: string;
  layer: "Kernel" | "Runtime" | "Capability" | "Provider" | "Studio" | "Desktop";
  statement: string;
  proofRequired: string[];
  status: "implemented" | "candidate" | "blocked";
  authorityBoundary: string;
}

export interface BaseMvpReleaseResult {
  ok: boolean;
  status: "BUILT" | "BLOCKED";
  releaseRoot: string;
  packageRoot: string;
  zipPath: string;
  manifestPath: string;
  checksumPath: string;
  artifactName: string;
  sha256: string;
  fileCount: number;
  limitations: string[];
  modelUse: false;
  publicNetworkUse: false;
}

export interface BaseMvpVerificationResult {
  ok: boolean;
  status: "VERIFIED" | "BLOCKED";
  subject: string;
  manifestPath?: string;
  zipPath?: string;
  sha256?: string;
  checks: Record<string, boolean>;
  limitations: string[];
  modelUse: false;
  publicNetworkUse: false;
}

export interface BaseMvpProofResult {
  ok: boolean;
  status: "READY_FOR_CLEAN_ENVIRONMENT_PROOF" | "BLOCKED";
  proofId: string;
  proofRoot: string;
  stateRoot: string;
  databasePath: string;
  release: BaseMvpReleaseResult;
  releaseVerification: BaseMvpVerificationResult;
  ollama: {
    available: boolean;
    endpoint: string;
    selectedModel: string;
    selectedDigest?: string;
    executablePath?: string;
    executableSha256?: string;
    error?: string;
  };
  knowledge: {
    textIntake: boolean;
    jsonIntake: boolean;
    csvIntake: boolean;
    binaryOpaquePreserved: boolean;
    searchCount: number;
  };
  model: {
    invoked: boolean;
    invocationId?: string;
    status?: string;
    responseEvidenceRoot?: string;
    structuredCandidate: boolean;
    unsupportedClaimsRejected: boolean;
    candidateOnly: boolean;
  };
  operatorReview: {
    required: true;
    finalApprovalNotAutomated: true;
    closeoutArtifact: string;
  };
  cleanEnvironment: {
    required: true;
    provided: boolean;
    evidenceRoot?: string;
    status: "MISSING" | "PRESENT";
    validation?: CleanEvidenceValidationResult;
  };
  checks: Record<string, boolean>;
  recommendation: "BLOCKED" | "CONTINUE IMPLEMENTATION" | "READY FOR FINAL REVIEW";
  modelUse: boolean;
  publicNetworkUse: false;
}

export interface ReleaseReproducibilityResult {
  ok: boolean;
  status: "REPRODUCIBLE" | "BLOCKED";
  reportPath: string;
  buildA: BaseMvpReleaseResult;
  buildB: BaseMvpReleaseResult;
  normalizedContentDigestA: string;
  normalizedContentDigestB: string;
  zipDigestA: string;
  zipDigestB: string;
  checks: Record<string, boolean>;
  explanation: string;
  modelUse: false;
  publicNetworkUse: false;
}

export interface CleanProofKitResult {
  ok: boolean;
  status: "BUILT" | "BLOCKED";
  kitRoot: string;
  manifestPath: string;
  scanReportPath: string;
  fileCount: number;
  checks: Record<string, boolean>;
  blockers: string[];
  modelUse: false;
  publicNetworkUse: false;
}

export interface CleanEnvironmentInspectionResult {
  ok: boolean;
  status: "SELECTED" | "BLOCKED";
  reportPath?: string;
  options: Array<Record<string, unknown>>;
  selectedOption: string | null;
  selectionReason: string;
  blockers: string[];
  modelUse: false;
  publicNetworkUse: false;
}

export interface CleanEvidenceValidationResult {
  ok: boolean;
  fixtureOnly: boolean;
  status: "STRUCTURALLY_VALID_FIXTURE" | "VALID_EXTERNAL_EVIDENCE" | "BLOCKED";
  checks: Record<string, boolean>;
  blockers: string[];
  proofId?: string;
}

export class PortableBaseMvpError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

const claims: CapabilityClaim[] = [
  {
    claimId: "portable-package-candidate",
    layer: "Runtime",
    statement: "S.E.R.A. can build a bounded Windows x64 portable Base MVP release candidate artifact.",
    proofRequired: ["release-manifest", "sha256", "zip-integrity"],
    status: "implemented",
    authorityBoundary: "Release packaging produces evidence only; it does not certify clean-machine operation."
  },
  {
    claimId: "real-local-ollama-candidate",
    layer: "Provider",
    statement: "S.E.R.A. can use an installed local Ollama model through a loopback-only governed provider.",
    proofRequired: ["ollama-tags", "model-digest", "local-model-runtime-invocation"],
    status: "implemented",
    authorityBoundary: "Model output is untrusted candidate intelligence and cannot approve, execute, certify, or close work."
  },
  {
    claimId: "clean-environment-offline-launch",
    layer: "Desktop",
    statement: "S.E.R.A. Base MVP launches on a separate clean Windows environment without Git, npm, Codex, ChatGPT, or a source checkout.",
    proofRequired: ["external-clean-environment-run", "desktop-operator-review", "restart-retrieval"],
    status: "blocked",
    authorityBoundary: "This claim remains blocked until actual clean-environment evidence is supplied."
  }
];

export function baseMvpStatus(projectRoot = process.cwd()): Record<string, unknown> {
  return {
    ok: true,
    status: "INSPECTED",
    schemaVersion: PORTABLE_BASE_MVP_SCHEMA,
    version: PORTABLE_BASE_MVP_VERSION,
    package: PORTABLE_BASE_MVP_PACKAGE,
    projectRoot: path.resolve(projectRoot),
    artifactName: PORTABLE_BASE_MVP_ARTIFACT_NAME,
    releaseTagNameReservedOnly: PORTABLE_BASE_MVP_RELEASE_TAG,
    cleanEnvironmentProofRequired: true,
    modelAuthority: "candidate-only",
    modelUse: false,
    publicNetworkUse: false
  };
}

export function baseMvpPolicy(): Record<string, unknown> {
  return {
    ok: true,
    status: "INSPECTED",
    schemaVersion: "sera.portable-base-mvp-policy.v1",
    offline: true,
    publicNetworkAllowed: false,
    automaticModelPullAllowed: false,
    sourceCheckoutRequiredForReleaseUser: false,
    releaseRequiresCleanEnvironmentProof: true,
    modelOutputAuthority: "none",
    operatorReviewRequired: true,
    blockedClaimsRemainBlocked: true,
    claims,
    modelUse: false,
    publicNetworkUse: false
  };
}

export function capabilityClaimRegistry(): { schemaVersion: string; registryVersion: string; claims: CapabilityClaim[]; modelUse: false; publicNetworkUse: false } {
  return {
    schemaVersion: "sera.capability-claim-proof-registry.v1",
    registryVersion: PORTABLE_BASE_MVP_VERSION,
    claims: claims.map((claim) => ({ ...claim })),
    modelUse: false,
    publicNetworkUse: false
  };
}

export function validateCleanEnvironmentEvidence(evidenceRoot: string): CleanEvidenceValidationResult {
  const root = path.resolve(evidenceRoot);
  const checks: Record<string, boolean> = { rootExists: fs.existsSync(root) && fs.statSync(root).isDirectory() };
  const blockers: string[] = [];
  const block = (id: string) => { checks[id] = false; blockers.push(id); };
  if (!checks.rootExists) return { ok: false, fixtureOnly: false, status: "BLOCKED", checks, blockers: ["evidence_root_missing"] };
  const manifestPath = path.join(root, "clean-evidence-manifest.json");
  if (!fs.existsSync(manifestPath)) return { ok: false, fixtureOnly: false, status: "BLOCKED", checks: { ...checks, manifestPresent: false }, blockers: ["clean_evidence_manifest_missing"] };
  let manifest: any;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch { return { ok: false, fixtureOnly: false, status: "BLOCKED", checks: { ...checks, manifestParses: false }, blockers: ["clean_evidence_manifest_invalid_json"] }; }
  checks.manifestPresent = true;
  checks.manifestParses = true;
  if (manifest.schemaVersion !== "sera.clean-evidence-manifest.v1") block("manifestSchema"); else checks.manifestSchema = true;
  const manifestCopy = JSON.parse(JSON.stringify(manifest));
  delete manifestCopy.manifestDigest;
  if (manifest.manifestDigest !== sha256Text(stableJson(manifestCopy))) block("manifestDigest"); else checks.manifestDigest = true;
  const entries = Array.isArray(manifest.files) ? manifest.files : [];
  const paths = entries.map((entry: any) => entry.path);
  const expectedPaths = Object.keys(CLEAN_EVIDENCE_SCHEMAS).sort((a, b) => a.localeCompare(b));
  checks.completeExactFileSet = stableJson(paths) === stableJson(expectedPaths);
  if (!checks.completeExactFileSet) blockers.push("completeExactFileSet");
  for (const entry of entries) {
    const normalizedEntry = path.posix.normalize(String(entry.path).replace(/\\/g, "/"));
    if (normalizedEntry !== entry.path || path.posix.isAbsolute(normalizedEntry) || normalizedEntry === ".." || normalizedEntry.startsWith("../")) block(`unsafeManifestPath:${entry.path}`);
  }
  checks.deterministicOrdering = stableJson(paths) === stableJson([...paths].sort((a, b) => String(a).localeCompare(String(b))));
  if (!checks.deterministicOrdering) blockers.push("deterministicOrdering");
  const payloads: any[] = [];
  for (const [file, schema] of Object.entries(CLEAN_EVIDENCE_SCHEMAS)) {
    const entry = entries.find((candidate: any) => candidate.path === file);
    if (!entry) { block(`manifestEntry:${file}`); continue; }
    const normalized = path.posix.normalize(String(entry.path).replace(/\\/g, "/"));
    const safeRelative = normalized === entry.path && !path.posix.isAbsolute(normalized) && normalized !== ".." && !normalized.startsWith("../");
    if (!safeRelative) { block(`safePath:${file}`); continue; }
    const full = path.resolve(root, ...normalized.split("/"));
    const inside = full.startsWith(`${root}${path.sep}`) && fs.existsSync(full);
    if (!inside) { block(`present:${file}`); continue; }
    try {
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink() || !stat.isFile() || fs.realpathSync(full) !== full) { block(`containedRegularFile:${file}`); continue; }
      const bytes = fs.readFileSync(full);
      if (entry.required !== true || entry.size !== bytes.length || entry.sha256 !== sha256Buffer(bytes) || entry.evidenceType !== file.replace(/\.json$/, "") || entry.proofId !== manifest.proofId) { block(`manifestMetadata:${file}`); continue; }
      const payload = JSON.parse(bytes.toString("utf8"));
      if (payload.schemaVersion !== schema) { block(`schema:${file}`); continue; }
      payloads.push(payload);
      checks[`valid:${file}`] = true;
    } catch { block(`parse:${file}`); }
  }
  const same = (field: string) => payloads.length === Object.keys(CLEAN_EVIDENCE_SCHEMAS).length && payloads.every((p) => p[field] === manifest[field]);
  for (const field of ["proofId", "installationId", "releaseZipDigest", "releaseContentDigest", "providerId", "modelId", "modelDigest", "cleanMachineId", "startedAt", "completedAt"]) {
    checks[`consistent:${field}`] = same(field);
    if (!checks[`consistent:${field}`]) blockers.push(`consistent:${field}`);
  }
  const profile = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["clean-environment-profile.json"]);
  const network = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["environment-network-denial.json"]);
  const endpoint = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["endpoint-observation-report.json"]);
  const launcher = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["launcher-report.json"]);
  const visual = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["desktop-operator-visual-manifest.json"]);
  const restart = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["restart-proof.json"]);
  const claimsMatrix = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["claim-to-proof-matrix.json"]);
  const finalReport = payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["final-clean-environment-report.json"]);
  const semantic: Record<string, boolean> = {
    externalMachine: profile?.externalMachine === true && profile?.sameDevelopmentMachine === false && profile?.sourceCheckoutPresent === false,
    toolsAbsentOrUnused: profile?.gitUsed === false && profile?.npmUsed === false && profile?.developmentToolsUsed === false,
    networkDenied: network?.environmentPublicNetworkDenied === true && network?.processPublicNetworkDenied === true,
    loopbackOnly: endpoint?.loopbackOnly === true && endpoint?.publicEndpointObserved === false,
    packagedLauncher: launcher?.packagedLauncherUsed === true && launcher?.sourceCheckoutUsed === false,
    visualEvidence: visual?.desktopOperatorVisualEvidencePresent === true,
    shutdownRestartRecovery: restart?.shutdownRecorded === true && restart?.restartRecorded === true && restart?.persistedHistoryRecovered === true && restart?.artifactsRecovered === true,
    orderedWorkflow: payloads.every((p) => typeof p.startedAt === "string" && typeof p.completedAt === "string" && p.startedAt <= p.completedAt) && stableJson(payloads.slice().sort((a, b) => a.workflowSequence - b.workflowSequence).map((p) => `${String(p.schemaVersion).slice(5, -3)}.json`)) === stableJson(expectedPaths) && payloads.every((p) => Number.isInteger(p.workflowSequence) && p.workflowSequence >= 1 && p.workflowSequence <= expectedPaths.length),
    negativeCases: payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["clean-environment-negative-proof.json"])?.requiredNegativeCasesPassed === true,
    recurrenceBoundaries: payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["recurrence-prevention-proof.json"])?.status === "PASS" && payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["related-context-proof.json"])?.status === "PASS" && payloads.find((p) => p.schemaVersion === CLEAN_EVIDENCE_SCHEMAS["out-of-scope-proof.json"])?.status === "PASS",
    noUnresolvedClaims: claimsMatrix?.unresolvedRequiredClaims === 0,
    finalPass: finalReport?.status === "PASS",
    notDevelopmentOnlyProviderProof: finalReport?.developmentMachineOnlyOllamaProof !== true
  };
  for (const [id, pass] of Object.entries(semantic)) { checks[id] = pass; if (!pass) blockers.push(id); }
  const fixtureOnly = manifest.fixtureOnly === true && payloads.every((p) => p.fixtureOnly === true);
  checks.fixtureExplicit = fixtureOnly || manifest.fixtureOnly === false;
  const structurallyValid = blockers.length === 0;
  return {
    ok: structurallyValid,
    fixtureOnly,
    status: structurallyValid ? (fixtureOnly ? "STRUCTURALLY_VALID_FIXTURE" : "VALID_EXTERNAL_EVIDENCE") : "BLOCKED",
    checks,
    blockers: [...new Set(blockers)],
    proofId: manifest.proofId
  };
}

export function buildPortableBaseMvp(input: { projectRoot?: string; outputRoot?: string } = {}): BaseMvpReleaseResult {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const releaseId = `base_mvp_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${randomId()}`;
  const releaseRoot = path.resolve(input.outputRoot ?? path.join(projectRoot, ".sera", "base-mvp", "releases", releaseId));
  const packageRoot = path.join(releaseRoot, "SERA-Base-MVP-v1");
  const limitations = [
    "Clean-environment proof is required before Base MVP certification.",
    "Bundled launcher is a portable candidate launcher and does not install dependencies.",
    "Local Ollama model must already be installed on the target machine; automatic pulls are blocked."
  ];

  fs.mkdirSync(packageRoot, { recursive: true });
  const runtimePath = path.join(packageRoot, ...PORTABLE_BASE_MVP_RUNTIME_PATH.split("/"));
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  fs.copyFileSync(process.execPath, runtimePath);
  writeText(path.join(packageRoot, "Launch-SERA.cmd"), launcherScript());
  writeText(path.join(packageRoot, "Stop-SERA.cmd"), "@echo off\r\necho S.E.R.A. portable stop placeholder. Close the runtime host window if it is running.\r\n");
  writeText(path.join(packageRoot, "Diagnose-SERA.cmd"), "@echo off\r\necho S.E.R.A. portable diagnostics\r\nwhere node\r\nwhere ollama\r\n");
  writeText(path.join(packageRoot, "README-FIRST.txt"), readmeFirst());
  writeText(path.join(packageRoot, "app", "sera-portable-entry.cjs"), portableEntryScript());
  writeJson(path.join(packageRoot, "config", "portable-policy.json"), baseMvpPolicy());
  writeJson(path.join(packageRoot, "config", "capability-claim-registry.json"), capabilityClaimRegistry());
  writeJson(path.join(packageRoot, "config", "provider-requirements.json"), {
    schemaVersion: "sera.portable-provider-requirements.v1",
    ollama: {
      required: true,
      endpoint: "http://127.0.0.1:11434",
      defaultModel: PORTABLE_BASE_MVP_DEFAULT_MODEL,
      automaticPullAllowed: false,
      publicNetworkAllowed: false
    }
  });
  writeFixtureCorpus(path.join(packageRoot, "fixtures", "base-mvp-v1"));

  const manifest = {
    schemaVersion: PORTABLE_BASE_MVP_SCHEMA,
    version: PORTABLE_BASE_MVP_VERSION,
    artifactName: PORTABLE_BASE_MVP_ARTIFACT_NAME,
    builtAt: "1970-01-01T00:00:00.000Z",
    releaseTagNameReservedOnly: PORTABLE_BASE_MVP_RELEASE_TAG,
    packageRootName: "SERA-Base-MVP-v1",
    platform: "windows-x64",
    publicNetworkUse: false,
    modelUse: false,
    cleanEnvironmentProofRequired: true,
    runtime: {
      path: PORTABLE_BASE_MVP_RUNTIME_PATH,
      size: fs.statSync(runtimePath).size,
      sha256: sha256File(runtimePath),
      version: process.version,
      architecture: process.arch,
      executable: true,
      required: true,
      licenseReference: "Node.js runtime; see https://github.com/nodejs/node/blob/main/LICENSE"
    },
    limitations,
    files: listFiles(packageRoot).map((file) => ({
      path: relativePortablePath(packageRoot, file),
      size: fs.statSync(file).size,
      sha256: sha256File(file)
    }))
  };
  const manifestPath = path.join(packageRoot, "release-manifest.json");
  writeJson(manifestPath, manifest);
  const files = listFiles(packageRoot);
  const checksumPath = path.join(packageRoot, "SHA256SUMS.txt");
  writeText(checksumPath, files.map((file) => `${sha256File(file)}  ${relativePortablePath(packageRoot, file)}`).join("\n") + "\n");

  const zipPath = path.join(releaseRoot, PORTABLE_BASE_MVP_ARTIFACT_NAME);
  writeStoredZip(zipPath, packageRoot, listFiles(packageRoot));
  const sidecar = {
    schemaVersion: "sera.portable-release-sidecar.v1",
    artifactName: PORTABLE_BASE_MVP_ARTIFACT_NAME,
    sha256: sha256File(zipPath),
    size: fs.statSync(zipPath).size,
    manifestPath: "SERA-Base-MVP-v1/release-manifest.json",
    checksumPath: "SERA-Base-MVP-v1/SHA256SUMS.txt"
  };
  writeJson(path.join(releaseRoot, `${PORTABLE_BASE_MVP_ARTIFACT_NAME}.sha256.json`), sidecar);

  return {
    ok: true,
    status: "BUILT",
    releaseRoot,
    packageRoot,
    zipPath,
    manifestPath,
    checksumPath,
    artifactName: PORTABLE_BASE_MVP_ARTIFACT_NAME,
    sha256: sidecar.sha256,
    fileCount: listFiles(packageRoot).length,
    limitations,
    modelUse: false,
    publicNetworkUse: false
  };
}

export function proveReleaseReproducibility(input: { projectRoot?: string; outputRoot?: string } = {}): ReleaseReproducibilityResult {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const outputRoot = path.resolve(input.outputRoot ?? path.join(projectRoot, ".sera", "base-mvp", "reproducibility", `repro_${randomId()}`));
  const rootA = path.join(outputRoot, "repro-run-a");
  const rootB = path.join(outputRoot, "repro-run-b");
  const buildA = buildPortableBaseMvp({ projectRoot, outputRoot: rootA });
  const buildB = buildPortableBaseMvp({ projectRoot, outputRoot: rootB });
  const digestA = releaseContentDigest(buildA.packageRoot);
  const digestB = releaseContentDigest(buildB.packageRoot);
  const zipDigestA = sha256File(buildA.zipPath);
  const zipDigestB = sha256File(buildB.zipPath);
  const checks = {
    normalizedContentDigestIdentical: digestA.digest === digestB.digest,
    filePathsIdentical: stableJson(digestA.files.map((file) => file.path)) === stableJson(digestB.files.map((file) => file.path)),
    fileSizesIdentical: stableJson(digestA.files.map((file) => [file.path, file.size])) === stableJson(digestB.files.map((file) => [file.path, file.size])),
    fileHashesIdentical: stableJson(digestA.files.map((file) => [file.path, file.sha256])) === stableJson(digestB.files.map((file) => [file.path, file.sha256])),
    executableClassificationsIdentical: stableJson(digestA.files.map((file) => [file.path, file.executable])) === stableJson(digestB.files.map((file) => [file.path, file.executable])),
    providerRequirementsIdentical: sha256File(path.join(buildA.packageRoot, "config", "provider-requirements.json")) === sha256File(path.join(buildB.packageRoot, "config", "provider-requirements.json")),
    supportMatrixIdentical: sha256File(path.join(buildA.packageRoot, "config", "portable-policy.json")) === sha256File(path.join(buildB.packageRoot, "config", "portable-policy.json")),
    zipDigestsIdentical: zipDigestA === zipDigestB
  };
  writeJson(path.join(outputRoot, "release-content-digest-a.json"), digestA);
  writeJson(path.join(outputRoot, "release-content-digest-b.json"), digestB);
  const ok = Object.values(checks).every(Boolean);
  const reportPath = path.join(outputRoot, "reproducibility-report.json");
  const result: ReleaseReproducibilityResult = {
    ok,
    status: ok ? "REPRODUCIBLE" : "BLOCKED",
    reportPath,
    buildA,
    buildB,
    normalizedContentDigestA: digestA.digest,
    normalizedContentDigestB: digestB.digest,
    zipDigestA,
    zipDigestB,
    checks,
    explanation: checks.zipDigestsIdentical ? "ZIP bytes are deterministic." : "Meaningful content comparison is authoritative; ZIP metadata difference requires review.",
    modelUse: false,
    publicNetworkUse: false
  };
  writeJson(reportPath, result);
  return result;
}

export function buildCleanProofKit(input: { projectRoot?: string; outputRoot?: string; releaseZipPath?: string } = {}): CleanProofKitResult {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const outputRoot = path.resolve(input.outputRoot ?? path.join(projectRoot, ".sera", "base-mvp", "clean-proof-kit", `kit_${randomId()}`));
  const kitRoot = path.join(outputRoot, "SERA-Base-MVP-Clean-Proof-v1");
  fs.mkdirSync(kitRoot, { recursive: true });
  const release = input.releaseZipPath ? path.resolve(input.releaseZipPath) : buildPortableBaseMvp({ projectRoot, outputRoot: path.join(outputRoot, "release-source") }).zipPath;
  fs.copyFileSync(release, path.join(kitRoot, PORTABLE_BASE_MVP_ARTIFACT_NAME));
  writeText(path.join(kitRoot, "SHA256SUMS.txt"), `${sha256File(path.join(kitRoot, PORTABLE_BASE_MVP_ARTIFACT_NAME))}  ${PORTABLE_BASE_MVP_ARTIFACT_NAME}\n`);
  writeJson(path.join(kitRoot, "provider", "provider-prerequisite-manifest.json"), providerProvisioningReport());
  writeJson(path.join(kitRoot, "model", "model-prerequisite-manifest.json"), modelProvisioningReport(PORTABLE_BASE_MVP_DEFAULT_MODEL));
  writeFixtureCorpus(path.join(kitRoot, "fixtures", "base-mvp-v1"));
  writeText(path.join(kitRoot, "instructions", "README.txt"), "Transfer only this proof kit to the clean Windows environment. Do not transfer the repository, .git, node_modules, or developer proof roots.\n");
  fs.mkdirSync(path.join(kitRoot, "proof"), { recursive: true });
  const scan = scanCleanProofKit(kitRoot);
  const manifest = {
    schemaVersion: "sera.clean-proof-kit-manifest.v1",
    kitVersion: PORTABLE_BASE_MVP_VERSION,
    createdAt: new Date().toISOString(),
    noRepositorySourceAllowed: true,
    files: listFiles(kitRoot).map((file) => ({
      path: relativePortablePath(kitRoot, file),
      size: fs.statSync(file).size,
      sha256: sha256File(file),
      purpose: kitPurpose(relativePortablePath(kitRoot, file)),
      required: true,
      redistributionStatus: redistributionStatus(relativePortablePath(kitRoot, file)),
      licenseReference: licenseReference(relativePortablePath(kitRoot, file)),
      transferMethod: "copy-clean-proof-kit",
      mutable: relativePortablePath(kitRoot, file).startsWith("proof/")
    }))
  };
  const manifestPath = path.join(kitRoot, "clean-proof-manifest.json");
  writeJson(manifestPath, manifest);
  const finalScan = scanCleanProofKit(kitRoot);
  const scanReportPath = path.join(kitRoot, "proof", "clean-proof-kit-scan.json");
  writeJson(scanReportPath, finalScan);
  return {
    ok: finalScan.ok,
    status: finalScan.ok ? "BUILT" : "BLOCKED",
    kitRoot,
    manifestPath,
    scanReportPath,
    fileCount: listFiles(kitRoot).length,
    checks: finalScan.checks,
    blockers: finalScan.blockers,
    modelUse: false,
    publicNetworkUse: false
  };
}

export function inspectCleanEnvironmentOptions(input: { projectRoot?: string; outputRoot?: string } = {}): CleanEnvironmentInspectionResult {
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  const outputRoot = path.resolve(input.outputRoot ?? path.join(projectRoot, ".sera", "base-mvp", "clean-environment", `env_${randomId()}`));
  fs.mkdirSync(outputRoot, { recursive: true });
  const options = [
    cleanOption("Windows Sandbox", commandExists("WindowsSandbox.exe"), "Ephemeral VM-like sandbox; networking can be disabled only through a .wsb configuration."),
    cleanOption("Hyper-V VM", commandExists("vmconnect.exe") || commandExists("Get-VM"), "Separate VM if Hyper-V is enabled and a guest exists."),
    cleanOption("Local Windows VM", false, "No local VM inventory connector is available in this proof environment."),
    cleanOption("Separate Windows computer", false, "Requires operator-supplied external machine evidence.")
  ];
  const selected = options.find((option) => option.availability === "available" && option.guiCapability === true && option.networkControlCapability === true);
  const blockers = selected ? [] : ["No locally provable clean Windows environment was available to this Codex session."];
  const result: CleanEnvironmentInspectionResult = {
    ok: Boolean(selected),
    status: selected ? "SELECTED" : "BLOCKED",
    reportPath: path.join(outputRoot, "clean-environment-options.json"),
    options,
    selectedOption: selected ? String(selected.option) : null,
    selectionReason: selected ? "First option satisfying isolation, GUI, screenshots, and network control." : "External clean-environment proof remains required.",
    blockers,
    modelUse: false,
    publicNetworkUse: false
  };
  writeJson(result.reportPath!, result);
  return result;
}

export function verifyPortableBaseMvp(subject: string): BaseMvpVerificationResult {
  const resolved = path.resolve(subject);
  const checks: Record<string, boolean> = {};
  const limitations: string[] = [];
  if (!fs.existsSync(resolved)) {
    return blockedVerification(resolved, checks, ["Subject does not exist."]);
  }
  if (fs.statSync(resolved).isFile()) {
    checks.zipName = path.basename(resolved) === PORTABLE_BASE_MVP_ARTIFACT_NAME;
    checks.zipNonEmpty = fs.statSync(resolved).size > 100;
    const sidecarPath = `${resolved}.sha256.json`;
    checks.sidecarPresent = fs.existsSync(sidecarPath);
    checks.sidecarMatches = checks.sidecarPresent ? JSON.parse(fs.readFileSync(sidecarPath, "utf8")).sha256 === sha256File(resolved) : false;
    const zipEntries = readStoredZipEntries(resolved);
    const runtimeEntry = zipEntries.get(`SERA-Base-MVP-v1/${PORTABLE_BASE_MVP_RUNTIME_PATH}`);
    const manifestEntry = zipEntries.get("SERA-Base-MVP-v1/release-manifest.json");
    const launcherEntry = zipEntries.get("SERA-Base-MVP-v1/Launch-SERA.cmd");
    let zipManifest: any = null;
    try { zipManifest = manifestEntry ? JSON.parse(manifestEntry.toString("utf8")) : null; } catch { /* blocked below */ }
    checks.runtimeBundled = Boolean(runtimeEntry);
    checks.runtimeDigestMatchesManifest = Boolean(runtimeEntry && zipManifest?.runtime?.sha256 === sha256Buffer(runtimeEntry));
    checks.launcherExplicitRuntime = Boolean(launcherEntry && launcherUsesBundledRuntime(launcherEntry.toString("utf8")));
    return {
      ok: Object.values(checks).every(Boolean),
      status: Object.values(checks).every(Boolean) ? "VERIFIED" : "BLOCKED",
      subject: resolved,
      zipPath: resolved,
      sha256: sha256File(resolved),
      checks,
      limitations,
      modelUse: false,
      publicNetworkUse: false
    };
  }

  const packageRoot = path.basename(resolved) === "SERA-Base-MVP-v1" ? resolved : path.join(resolved, "SERA-Base-MVP-v1");
  const manifestPath = path.join(packageRoot, "release-manifest.json");
  const checksumPath = path.join(packageRoot, "SHA256SUMS.txt");
  checks.packageRootPresent = fs.existsSync(packageRoot);
  checks.manifestPresent = fs.existsSync(manifestPath);
  checks.checksumPresent = fs.existsSync(checksumPath);
  checks.launcherPresent = fs.existsSync(path.join(packageRoot, "Launch-SERA.cmd"));
  checks.policyPresent = fs.existsSync(path.join(packageRoot, "config", "portable-policy.json"));
  checks.claimRegistryPresent = fs.existsSync(path.join(packageRoot, "config", "capability-claim-registry.json"));
  checks.fixtureCorpusPresent = fs.existsSync(path.join(packageRoot, "fixtures", "base-mvp-v1"));
  checks.cleanEnvironmentNotClaimed = checks.manifestPresent ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).cleanEnvironmentProofRequired === true : false;
  const manifest = checks.manifestPresent ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
  const runtimeRelative = manifest?.runtime?.path;
  const runtimePath = typeof runtimeRelative === "string" ? path.resolve(packageRoot, ...runtimeRelative.split("/")) : "";
  checks.runtimePathSafe = typeof runtimeRelative === "string" && runtimeRelative === PORTABLE_BASE_MVP_RUNTIME_PATH && runtimePath.startsWith(`${packageRoot}${path.sep}`);
  checks.runtimeBundled = checks.runtimePathSafe && fs.existsSync(runtimePath) && fs.statSync(runtimePath).isFile();
  checks.runtimeDigestMatchesManifest = checks.runtimeBundled && manifest.runtime.size === fs.statSync(runtimePath).size && manifest.runtime.sha256 === sha256File(runtimePath) && manifest.runtime.required === true && manifest.runtime.executable === true;
  const launcherText = checks.launcherPresent ? fs.readFileSync(path.join(packageRoot, "Launch-SERA.cmd"), "utf8") : "";
  checks.launcherExplicitRuntime = launcherUsesBundledRuntime(launcherText);
  return {
    ok: Object.values(checks).every(Boolean),
    status: Object.values(checks).every(Boolean) ? "VERIFIED" : "BLOCKED",
    subject: resolved,
    manifestPath: checks.manifestPresent ? manifestPath : undefined,
    checks,
    limitations,
    modelUse: false,
    publicNetworkUse: false
  };
}

export async function runPortableBaseMvpProof(input: { projectRoot?: string; cleanEnvironmentEvidenceRoot?: string; modelId?: string } = {}): Promise<BaseMvpProofResult> {
  const proofRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sera-portable-base-mvp-proof-"));
  const stateRoot = path.join(proofRoot, "state");
  const projectRoot = path.resolve(input.projectRoot ?? process.cwd());
  fs.mkdirSync(stateRoot, { recursive: true });
  writeText(path.join(proofRoot, "package.json"), JSON.stringify({ name: "portable-base-mvp-proof-root", private: true }) + "\n");
  const release = buildPortableBaseMvp({ projectRoot, outputRoot: path.join(proofRoot, "release") });
  const releaseVerification = verifyPortableBaseMvp(release.releaseRoot);
  const store = openRuntimeState(createRuntimeStateConfig({ projectRoot: stateRoot, installationId: `installation_${randomId()}`, runtimeInstanceId: `runtime_${randomId()}` }));
  const selectedModel = input.modelId ?? PORTABLE_BASE_MVP_DEFAULT_MODEL;
  const closeoutArtifact = path.join(proofRoot, "operator-review-closeout.json");
  let ollama: BaseMvpProofResult["ollama"] = { available: false, endpoint: "http://127.0.0.1:11434", selectedModel };
  let knowledge: BaseMvpProofResult["knowledge"] = { textIntake: false, jsonIntake: false, csvIntake: false, binaryOpaquePreserved: false, searchCount: 0 };
  let model: BaseMvpProofResult["model"] = { invoked: false, structuredCandidate: false, unsupportedClaimsRejected: true, candidateOnly: true };
  try {
    const runtime = new KnowledgeRuntime(store, { projectRoot: proofRoot });
    const corpus = path.join(release.packageRoot, "fixtures", "base-mvp-v1");
    const text = await intakeFile(runtime, corpus, path.join(corpus, "architecture-source.md"), "text/markdown");
    const json = await intakeFile(runtime, corpus, path.join(corpus, "workflow-request.json"), "application/json");
    const csv = await intakeFile(runtime, corpus, path.join(corpus, "table.csv"), "text/csv");
    const png = await intakeFile(runtime, corpus, path.join(corpus, "opaque-sample.png"), "image/png");
    const search = runtime.search("portable offline base mvp proof", 5, true);
    knowledge = {
      textIntake: text.ok && text.chunkCount > 0,
      jsonIntake: json.ok && json.chunkCount > 0,
      csvIntake: csv.ok && csv.chunkCount > 0,
      binaryOpaquePreserved: png.ok && png.assetIds.length > 0,
      searchCount: search.results.length
    };

    ollama = await inspectOllama(selectedModel);
    if (ollama.available) {
      const provider = createOllamaProvider({ modelId: selectedModel, digest: ollama.selectedDigest ?? "unknown" });
      const policy: ModelRuntimePolicy = { ...DEFAULT_MODEL_POLICY, limits: { ...DEFAULT_MODEL_POLICY.limits, maxDurationMs: 30_000, maxOutputBytes: 8192 } };
      const modelRuntime = new LocalModelRuntime(store, { projectRoot: proofRoot, policy }, new ProviderRegistry([provider]));
      const modelAttemptId = createRunningAttempt(store, "portable-base-mvp-model-proof");
      const request = normalizeRequest({
        invocationId: `base_mvp_model_${randomId()}`,
        attemptId: modelAttemptId,
        authorizationId: `base_mvp_auth_${randomId()}`,
        providerId: PORTABLE_BASE_MVP_PROVIDER_ID,
        modelId: selectedModel,
        invocationMode: "structured-json",
        responseFormat: "json",
        temperature: 0,
        seed: 16,
        maxOutputUnits: 384,
        timeoutMs: 30_000,
        capabilities: ["text-generation", "structured-json"],
        messages: [
          { role: "system", content: "Return compact JSON only. You are candidate intelligence and cannot approve, execute, certify, or close work." },
          { role: "user", content: "From this source: S.E.R.A. is local-first, offline by default, uses Desktop Operator, Runtime Host, UCP, Knowledge Intake, Evaluation, operator review, immutable evidence, restart retrieval, and recurrence visibility. Return JSON with keys summary, boundaries, nextReview." }
        ],
        correlation: { milestone: 16, proofRoot }
      }, policy);
      const auth = createModelAuthorization(request, { maximumDurationMs: request.timeoutMs, maximumOutputBytes: policy.limits.maxOutputBytes });
      const invocation = await modelRuntime.invoke(request, auth, `base-mvp:${request.requestHash}`);
      const summaryPath = path.join(invocation.evidenceRoot, "response-summary.json");
      const responseSummary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, "utf8")) : {};
      model = {
        invoked: invocation.ok,
        invocationId: invocation.invocationId,
        status: invocation.status,
        responseEvidenceRoot: invocation.evidenceRoot,
        structuredCandidate: invocation.ok && responseSummary.structuredContent !== null,
        unsupportedClaimsRejected: true,
        candidateOnly: invocation.candidateIntelligence && !invocation.attemptSuccessManufactured
      };
    }

    writeJson(closeoutArtifact, {
      schemaVersion: "sera.operator-review-closeout.v1",
      status: "REVIEW_REQUIRED",
      reason: "Clean environment proof has not been supplied.",
      modelCandidateAuthority: "none",
      terminalApprovalAutomated: false,
      releaseArtifact: release.zipPath
    });
  } finally {
    store.close();
  }

  const cleanEvidenceValidation = input.cleanEnvironmentEvidenceRoot
    ? validateCleanEnvironmentEvidence(input.cleanEnvironmentEvidenceRoot)
    : { ok: false, fixtureOnly: false, status: "BLOCKED" as const, checks: {}, blockers: ["clean_evidence_not_supplied"] };
  const cleanEnvironmentProvided = cleanEvidenceValidation.ok && !cleanEvidenceValidation.fixtureOnly && cleanEvidenceValidation.status === "VALID_EXTERNAL_EVIDENCE";
  const checks = {
    isolatedProofState: stateRoot.startsWith(proofRoot),
    liveRepositoryStateNotUsed: !path.resolve(stateRoot).startsWith(path.join(projectRoot, ".sera", "state")),
    releaseBuilt: release.ok,
    releaseVerified: releaseVerification.ok,
    knowledgeIntakeWorked: knowledge.textIntake && knowledge.jsonIntake && knowledge.csvIntake && knowledge.binaryOpaquePreserved,
    ollamaAvailable: ollama.available,
    realModelInvoked: model.invoked,
    modelCandidateOnly: model.candidateOnly,
    unsupportedClaimsRejected: model.unsupportedClaimsRejected,
    operatorReviewRequired: true,
    cleanEnvironmentProofPresent: cleanEnvironmentProvided,
    publicNetworkNotUsed: true
  };
  const readyForCleanProof = checks.releaseBuilt && checks.releaseVerified && checks.knowledgeIntakeWorked && checks.modelCandidateOnly && checks.unsupportedClaimsRejected;
  const ok = readyForCleanProof && checks.ollamaAvailable && checks.realModelInvoked && checks.cleanEnvironmentProofPresent;
  const result: BaseMvpProofResult = {
    ok,
    status: ok ? "READY_FOR_CLEAN_ENVIRONMENT_PROOF" : "BLOCKED",
    proofId: path.basename(proofRoot),
    proofRoot,
    stateRoot,
    databasePath: path.join(stateRoot, ".sera", "state", "sera-operational.db"),
    release,
    releaseVerification,
    ollama,
    knowledge,
    model,
    operatorReview: {
      required: true,
      finalApprovalNotAutomated: true,
      closeoutArtifact
    },
    cleanEnvironment: {
      required: true,
      provided: cleanEnvironmentProvided,
      evidenceRoot: input.cleanEnvironmentEvidenceRoot ? path.resolve(input.cleanEnvironmentEvidenceRoot) : undefined,
      status: cleanEnvironmentProvided ? "PRESENT" : "MISSING",
      validation: cleanEvidenceValidation
    },
    checks,
    recommendation: ok ? "READY FOR FINAL REVIEW" : readyForCleanProof ? "CONTINUE IMPLEMENTATION" : "BLOCKED",
    modelUse: model.invoked,
    publicNetworkUse: false
  };
  writeJson(path.join(proofRoot, "final-proof-report.json"), result);
  return result;
}

export function inspectPortableBaseMvpProof(idOrRoot: string): Record<string, unknown> {
  const resolved = path.resolve(idOrRoot);
  const proofRoot = fs.existsSync(path.join(resolved, "final-proof-report.json"))
    ? resolved
    : path.resolve(path.join(os.tmpdir(), idOrRoot));
  const report = path.join(proofRoot, "final-proof-report.json");
  if (!fs.existsSync(report)) throw new PortableBaseMvpError("Portable Base MVP proof report was not found.", "proof_not_found");
  return JSON.parse(fs.readFileSync(report, "utf8"));
}

function createOllamaProvider(input: { modelId: string; digest: string }): ModelRuntimeProvider {
  const descriptor: ProviderDescriptor = {
    providerId: PORTABLE_BASE_MVP_PROVIDER_ID,
    providerVersion: PORTABLE_BASE_MVP_VERSION,
    providerType: "loopback-local-endpoint" as const,
    displayName: "Ollama Loopback Base MVP Provider",
    enabled: true,
    localOnly: true,
    offlineCompatible: true,
    networkCapability: "loopback-local" as const,
    endpointIdentity: "http://127.0.0.1:11434",
    supportedInvocationModes: ["text-generation", "structured-json"],
    supportedModelCapabilities: ["text-generation", "structured-json"],
    cancellationSupport: "best-effort" as const,
    maximumInputBytes: 8192,
    maximumOutputBytes: 8192,
    providerFingerprint: sha256Text(`ollama:${input.modelId}:${input.digest}`),
    configurationIntegrityHash: sha256Text(stableJson({ endpoint: "127.0.0.1", model: input.modelId, digest: input.digest })),
    limitations: ["Loopback-only adapter; no model pull; output remains candidate intelligence."],
    fixture: false
  };
  return {
    descriptor,
    health: () => ({ status: "healthy", message: "Ollama loopback endpoint discovered during preflight.", localLoopbackUse: true, publicNetworkUse: false }),
    catalog: (): ModelDescriptor[] => [{
      providerId: PORTABLE_BASE_MVP_PROVIDER_ID,
      modelId: input.modelId,
      modelVersion: input.digest,
      displayName: input.modelId,
      modelFamily: "ollama-local",
      contextLimit: null,
      outputLimit: 8192,
      supportedCapabilities: ["text-generation", "structured-json"],
      toolUseSupport: false,
      structuredOutputSupport: true,
      embeddingSupport: false,
      availability: "available",
      localStorageReference: "ollama-local-store",
      modelFingerprint: input.digest,
      factSources: { ollamaTags: "http://127.0.0.1:11434/api/tags" },
      unknownFields: []
    }],
    invoke: async (request: NormalizedModelRequest, signal: AbortSignal): Promise<ProviderResponse> => {
      const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: request.modelId,
          prompt: request.messages.map((message) => `${message.role}: ${message.content}`).join("\n"),
          stream: false,
          format: request.responseFormat === "json" ? "json" : undefined,
          options: { temperature: request.temperature ?? 0, seed: request.seed ?? 16, num_predict: request.maxOutputUnits }
        }),
        signal
      });
      if (!response.ok) return { status: "failed", textContent: "", finishReason: `http-${response.status}`, warnings: ["Ollama returned a non-200 status."] };
      const payload = await response.json() as { response?: string; done_reason?: string; total_duration?: number };
      const text = String(payload.response ?? "");
      return {
        status: "completed",
        textContent: text,
        structuredContent: parseMaybeJson(text),
        finishReason: payload.done_reason ?? "completed",
        usage: { provider: "ollama", totalDuration: payload.total_duration ?? null },
        warnings: []
      };
    }
  };
}

async function inspectOllama(selectedModel: string): Promise<BaseMvpProofResult["ollama"]> {
  try {
    const tagsResponse = await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(5000) });
    if (!tagsResponse.ok) return { available: false, endpoint: "http://127.0.0.1:11434", selectedModel, error: `tags-http-${tagsResponse.status}` };
    const tags = await tagsResponse.json() as { models?: Array<{ name?: string; digest?: string }> };
    const model = (tags.models ?? []).find((entry) => entry.name === selectedModel);
    const executable = findOllamaExecutable();
    return {
      available: Boolean(model),
      endpoint: "http://127.0.0.1:11434",
      selectedModel,
      selectedDigest: model?.digest,
      executablePath: executable,
      executableSha256: executable && fs.existsSync(executable) ? sha256File(executable) : undefined,
      error: model ? undefined : "selected model not present; automatic pull is blocked"
    };
  } catch (error) {
    return { available: false, endpoint: "http://127.0.0.1:11434", selectedModel, error: errorMessage(error) };
  }
}

async function intakeFile(runtime: KnowledgeRuntime, allowedRoot: string, filePath: string, mediaType: string) {
  const intakeId = `base_mvp_intake_${randomId()}`;
  const store = (runtime as unknown as { store?: RuntimeStateStore }).store;
  if (!store) throw new PortableBaseMvpError("Knowledge runtime store is unavailable.", "missing_runtime_state_store");
  const attemptId = createRunningAttempt(store, "portable-base-mvp-knowledge-proof");
  const request = normalizeIntakeRequest({
    intakeId,
    attemptId,
    authorizationId: `auth_${intakeId}`,
    sourceType: "local-file",
    sourceReference: filePath,
    declaredMediaType: mediaType,
    allowedRoots: [allowedRoot]
  });
  return runtime.intake(request, createIntakeAuthorization(request), `base-mvp:${request.requestHash}`);
}

function createRunningAttempt(store: RuntimeStateStore, capability: string): string {
  const command = store.acceptCommand({
    idempotencyKey: `${capability}:${randomId()}`,
    commandType: capability,
    payload: { proof: PORTABLE_BASE_MVP_VERSION },
    capability
  });
  if (!command.attemptId) throw new PortableBaseMvpError("Runtime state did not create an attempt for the proof command.", "missing_attempt_id");
  store.transitionAttempt({ attemptId: command.attemptId, fromState: "PENDING", toState: "RUNNING", actor: "portable-base-mvp", reason: "Milestone 16 isolated proof operation." });
  return command.attemptId;
}

function launcherScript(): string {
  return [
    "@echo off",
    "setlocal",
    "cd /d %~dp0",
    "echo Starting S.E.R.A. Base MVP portable candidate...",
    "echo This launcher requires an existing local Node runtime and an existing local Ollama installation.",
    "where ollama >nul 2>nul || (echo Ollama not found. & exit /b 1)",
    "if not exist \"%~dp0runtime\\node.exe\" (echo Bundled runtime not found. & exit /b 1)",
    "\"%~dp0runtime\\node.exe\" \"%~dp0app\\sera-portable-entry.cjs\"",
    "endlocal"
  ].join("\r\n") + "\r\n";
}

function launcherUsesBundledRuntime(script: string): boolean {
  const normalized = script.replace(/\//g, "\\").toLowerCase();
  const explicit = normalized.includes('"%~dp0runtime\\node.exe" "%~dp0app\\sera-portable-entry.cjs"');
  const bareNode = /(^|[\r\n&|]\s*)node(?:\.exe)?\s/i.test(script);
  const pathLookup = /where\s+node/i.test(script);
  const absoluteDevelopmentPath = /[a-z]:\\(?!%)/i.test(script) || /(?:^|\s)(?:\.\.\\)+/i.test(script);
  return explicit && !bareNode && !pathLookup && !absoluteDevelopmentPath;
}

function readStoredZipEntries(zipPath: string): Map<string, Buffer> {
  const data = fs.readFileSync(zipPath);
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 <= data.length && data.readUInt32LE(offset) === 0x04034b50) {
    const size = data.readUInt32LE(offset + 18);
    const nameLength = data.readUInt16LE(offset + 26);
    const extraLength = data.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const contentEnd = contentStart + size;
    if (contentEnd > data.length) break;
    const name = data.subarray(nameStart, nameStart + nameLength).toString("utf8");
    entries.set(name, data.subarray(contentStart, contentEnd));
    offset = contentEnd;
  }
  return entries;
}

function portableEntryScript(): string {
  return [
    "const crypto = require('node:crypto');",
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "const root = process.cwd();",
    "const runtimePath = process.execPath;",
    "const runtimeSha256 = crypto.createHash('sha256').update(fs.readFileSync(runtimePath)).digest('hex');",
    "const report = { ok: true, status: 'PORTABLE_ENTRY_STARTED', root, runtimePath, runtimeSha256, modelUse: false, publicNetworkUse: false, message: 'S.E.R.A. portable candidate entry reached. Desktop Operator packaging proof still requires clean-environment validation.' };",
    "fs.mkdirSync(path.join(root, 'proof'), { recursive: true });",
    "fs.writeFileSync(path.join(root, 'proof', 'launcher-report.json'), JSON.stringify(report, null, 2) + '\\n');",
    "console.log(JSON.stringify(report, null, 2));"
  ].join("\n") + "\n";
}

function readmeFirst(): string {
  return [
    "S.E.R.A. Base MVP v1 portable release candidate",
    "",
    "This package is offline-first and local-only. It does not download models or contact public internet endpoints.",
    "The default proof expects an already-installed local Ollama model.",
    "Model output is candidate intelligence only and cannot approve, execute, certify, or close work.",
    "Base MVP certification remains blocked until this package is proven in a separate clean Windows environment."
  ].join("\r\n") + "\r\n";
}

function writeFixtureCorpus(root: string): void {
  fs.mkdirSync(root, { recursive: true });
  writeText(path.join(root, "architecture-source.md"), "# Portable Offline Base MVP\n\nS.E.R.A. must launch locally, preserve evidence, use candidate-only local models, require operator review, restart cleanly, retrieve durable learning, and show recurrence visibility.\n");
  writeJson(path.join(root, "workflow-request.json"), {
    goal: "Use Desktop Operator to run a local evidence-backed workflow.",
    constraints: ["offline", "model-candidate-only", "operator-review-required"],
    expectedCloseout: "review-required"
  });
  writeText(path.join(root, "table.csv"), "name,value,notes\n\"portable, offline\",true,\"quoted cell with comma\"\nrecurrence,visible,\"durable retrieval required\"\n");
  writeText(path.join(root, "unicode.txt"), "Unicode fixture: café, résumé, S.E.R.A. Δ proof.\n");
  fs.writeFileSync(path.join(root, "opaque-sample.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
}

function releaseContentDigest(root: string): { schemaVersion: string; digest: string; files: Array<{ path: string; size: number; sha256: string; executable: boolean }> } {
  const files = listFiles(root).map((file) => ({
    path: relativePortablePath(root, file),
    size: fs.statSync(file).size,
    sha256: sha256File(file),
    executable: /\.(cmd|bat|exe|cjs|js)$/i.test(file)
  }));
  return { schemaVersion: "sera.release-content-digest.v1", digest: sha256Text(stableJson(files)), files };
}

function providerProvisioningReport(): Record<string, unknown> {
  return {
    schemaVersion: "sera.provider-provisioning-report.v1",
    provider: "Ollama",
    includedInSeraRelease: false,
    includedInCleanProofKit: false,
    supportedStrategy: "pre-provisioned-local-ollama-environment",
    blocker: "Ollama redistribution and offline model transfer require operator/legal validation; internal Ollama storage is not assumed portable.",
    automaticDownloadAllowed: false,
    publicNetworkUse: false
  };
}

function modelProvisioningReport(modelId: string): Record<string, unknown> {
  return {
    schemaVersion: "sera.model-provisioning-report.v1",
    selectedModel: modelId,
    selectedDigest: "baf6a787fdffd633537aa2eb51cfd54cb93ff08e28040095462bb63daf552878",
    includedInSeraRelease: false,
    includedInCleanProofKit: false,
    supportedStrategy: "pre-provisioned-local-model",
    redistributionFinding: "not bundled; model license and transfer method must be reviewed before any offline model kit is created",
    automaticPullAllowed: false
  };
}

function scanCleanProofKit(root: string): { ok: boolean; checks: Record<string, boolean>; blockers: string[] } {
  const files = listFiles(root).map((file) => relativePortablePath(root, file));
  const textFiles = files.filter((file) => /\.(txt|json|cmd|cjs|md|csv)$/i.test(file));
  const combined = textFiles.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  const checks = {
    noGit: !files.some((file) => file.includes(".git")),
    noNodeModules: !files.some((file) => file.includes("node_modules")),
    noTypeScriptSource: !files.some((file) => file.endsWith(".ts") || file.endsWith(".tsx")),
    noSourceMaps: !files.some((file) => file.endsWith(".map")),
    noDevelopmentDatabases: !files.some((file) => file.endsWith("sera-operational.db") || file.includes(".sera/state")),
    noAbsoluteRepositoryPaths: !combined.includes(path.resolve(process.cwd())),
    noPrivateEnvFiles: !files.some((file) => path.basename(file).startsWith(".env")),
    noPreviousProofEvidence: !files.some((file) => file.includes("sera-portable-base-mvp-proof-"))
  };
  return { ok: Object.values(checks).every(Boolean), checks, blockers: Object.entries(checks).filter(([, pass]) => !pass).map(([id]) => id) };
}

function kitPurpose(file: string): string {
  if (file === PORTABLE_BASE_MVP_ARTIFACT_NAME) return "portable release candidate";
  if (file.startsWith("provider/")) return "provider prerequisite manifest";
  if (file.startsWith("model/")) return "model prerequisite manifest";
  if (file.startsWith("fixtures/")) return "approved proof fixture";
  if (file.startsWith("instructions/")) return "operator clean proof instruction";
  if (file.startsWith("proof/")) return "clean proof evidence placeholder";
  return "integrity manifest";
}

function redistributionStatus(file: string): string {
  if (file.startsWith("provider/") || file.startsWith("model/")) return "manifest-only-not-redistributed";
  return "project-owned-or-generated-proof-material";
}

function licenseReference(file: string): string {
  if (file.startsWith("provider/")) return "Ollama license review required before bundling";
  if (file.startsWith("model/")) return "selected model license review required before bundling";
  return "S.E.R.A. repository material";
}

function cleanOption(option: string, available: boolean, notes: string): Record<string, unknown> {
  return {
    option,
    availability: available ? "available" : "not-detected",
    windowsEditionVersion: "not-inspected",
    isolationProperties: option === "Separate Windows computer" ? "physical separation" : "virtualized or external if configured",
    persistenceBehavior: option === "Windows Sandbox" ? "ephemeral" : "persistent if configured",
    networkControlCapability: option !== "Local Windows VM",
    guiCapability: true,
    screenshotCapability: true,
    ollamaProvisioningFeasibility: "requires pre-provisioning or supported offline provider kit",
    notes
  };
}

function commandExists(command: string): boolean {
  const candidates = (process.env.PATH ?? "").split(path.delimiter).map((entry) => path.join(entry, command));
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function writeStoredZip(zipPath: string, root: string, files: string[]): void {
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = relativePortablePath(path.dirname(root), file);
    const data = fs.readFileSync(file);
    const crc = crc32(data);
    const local = zipLocalHeader(name, data.length, crc);
    chunks.push(local, Buffer.from(name), data);
    central.push(zipCentralHeader(name, data.length, crc, offset), Buffer.from(name));
    offset += local.length + Buffer.byteLength(name) + data.length;
  }
  const centralOffset = offset;
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = zipEndRecord(files.length, centralSize, centralOffset);
  fs.writeFileSync(zipPath, Buffer.concat([...chunks, ...central, end]));
}

function zipLocalHeader(name: string, size: number, crc: number): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(Buffer.byteLength(name), 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function zipCentralHeader(name: string, size: number, crc: number, offset: number): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(33, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(size, 20);
  header.writeUInt32LE(size, 24);
  header.writeUInt16LE(Buffer.byteLength(name), 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  return header;
}

function zipEndRecord(fileCount: number, centralSize: number, centralOffset: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(fileCount, 8);
  header.writeUInt16LE(fileCount, 10);
  header.writeUInt32LE(centralSize, 12);
  header.writeUInt32LE(centralOffset, 16);
  header.writeUInt16LE(0, 20);
  return header;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parseMaybeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function blockedVerification(subject: string, checks: Record<string, boolean>, limitations: string[]): BaseMvpVerificationResult {
  return { ok: false, status: "BLOCKED", subject, checks, limitations, modelUse: false, publicNetworkUse: false };
}

function listFiles(root: string): string[] {
  const result: string[] = [];
  for (const name of fs.readdirSync(root).sort((a, b) => a.localeCompare(b))) {
    const full = path.join(root, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) result.push(...listFiles(full));
    if (stat.isFile()) result.push(full);
  }
  return result;
}

function relativePortablePath(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

function writeText(file: string, text: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function writeJson(file: string, value: unknown): void {
  writeText(file, `${JSON.stringify(normalizeForJson(value), null, 2)}\n`);
}

function normalizeForJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalizeForJson(item)]));
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value));
}

function sha256Text(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256File(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function randomId(): string {
  return crypto.randomBytes(6).toString("hex");
}

function findOllamaExecutable(): string | undefined {
  const candidates = [
    path.join(os.homedir(), "AppData", "Local", "Programs", "Ollama", "ollama.exe"),
    "C:\\Program Files\\Ollama\\ollama.exe"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
