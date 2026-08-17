import crypto from "node:crypto";
import type { RuntimeCapabilityRegistryEntry, RuntimeCapabilityRegistrySnapshot } from "./runtime-capability-registry-reader";

export const M16_A1_PROFILE_ID = "deterministic-text-transform-acquisition-v1";
export const M16_A1_PROFILE_VERSION = "1.0.0";
export const M16_A1_EXECUTABLE_ID = "deterministic-text-transform-v1";
export const M16_A1_OPERATION = "stable-unique-line-sort";
export const M16_A1_MAX_INPUT_BYTES = 64 * 1024;

export interface BoundedCapabilityRequirement {
  schemaVersion: "sera.bounded-capability-requirement.v1";
  capabilityId: string;
  objective: string;
  acceptedInputType: "newline-delimited-utf8-text";
  producedOutputType: "deterministic-utf8-text";
  operation: typeof M16_A1_OPERATION;
  normalizationPolicy: {
    crlf: "normalize-to-lf";
    cr: "normalize-to-lf";
    emptyLines: "remove";
    duplicates: "retain-one-exact-instance";
    ordering: "lexicographic-case-sensitive";
    internalWhitespace: "preserve";
    trailingNewline: "omit";
  };
  resourceLimits: { maxInputBytes: number; maxOutputBytes: number; timeoutMs: number };
  networkPolicy: "offline-strict";
  sideEffectPolicy: "none";
  modelPolicy: "none";
  packageAcquisition: false;
  shell: false;
  executableId: typeof M16_A1_EXECUTABLE_ID;
  permissions: string[];
  limitations: string[];
  expectedTests: string[];
}

export interface BoundedCapabilityAcquisitionRequest {
  profileId: typeof M16_A1_PROFILE_ID | string;
  capabilityId?: string;
  requestedExecutableId?: string;
  networkPolicy?: string;
  shell?: boolean;
  packageAcquisition?: boolean;
  cloudProviderUse?: boolean;
  modelUse?: boolean;
  sideEffectPolicy?: string;
  maxInputBytes?: number;
}

export interface CapabilityGapComparison {
  capabilityId: string;
  compositionState: string;
  activeStatus: "ACTIVE" | "INACTIVE_OR_UNDECLARED";
  certifiedContract: Record<string, unknown>;
  comparedFields: string[];
  unsatisfiedFields: Array<{ field: string; required: unknown; actual: unknown; reason: string }>;
  sufficient: boolean;
}

export interface CapabilityGapReport {
  schemaVersion: "sera.capability-gap-report.v1";
  profileId: typeof M16_A1_PROFILE_ID;
  profileVersion: typeof M16_A1_PROFILE_VERSION;
  profileHash: string;
  requirement: BoundedCapabilityRequirement;
  registrySchemaVersion: string;
  registrySha256: string;
  registryRelativePath: string;
  considered: CapabilityGapComparison[];
  gapStatus: "SATISFIED" | "UNSATISFIED";
  satisfyingCapabilityId: string | null;
  determinationHash: string;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function hashBoundedValue(value: unknown): string {
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

export function resolveBoundedAcquisitionProfile(request: BoundedCapabilityAcquisitionRequest, objective: string): { requirement: BoundedCapabilityRequirement; profileHash: string } {
  if (request.profileId !== M16_A1_PROFILE_ID) throw new Error("Requested capability contract is outside the bounded M16-A1 acquisition profile.");
  if (request.requestedExecutableId !== undefined && request.requestedExecutableId !== M16_A1_EXECUTABLE_ID) throw new Error("Unknown executable ID is blocked by the bounded acquisition profile.");
  if (request.networkPolicy !== undefined && request.networkPolicy !== "offline-strict") throw new Error("Public-network capability acquisition is blocked.");
  if (request.shell === true) throw new Error("Shell-capable candidate acquisition is blocked.");
  if (request.packageAcquisition === true) throw new Error("External package acquisition is blocked.");
  if (request.cloudProviderUse === true) throw new Error("Cloud provider use is blocked for deterministic offline acquisition.");
  if (request.modelUse === true) throw new Error("Model use is not required or authorized by the deterministic M16-A1 profile.");
  if (request.sideEffectPolicy !== undefined && request.sideEffectPolicy !== "none") throw new Error("Undeclared side effects are blocked.");
  if (request.maxInputBytes !== undefined && (!Number.isSafeInteger(request.maxInputBytes) || request.maxInputBytes <= 0 || request.maxInputBytes > M16_A1_MAX_INPUT_BYTES)) throw new Error("Requested input limit exceeds the bounded acquisition profile.");

  const requirement: BoundedCapabilityRequirement = {
    schemaVersion: "sera.bounded-capability-requirement.v1",
    capabilityId: request.capabilityId ?? "stable-unique-line-sort-v1",
    objective,
    acceptedInputType: "newline-delimited-utf8-text",
    producedOutputType: "deterministic-utf8-text",
    operation: M16_A1_OPERATION,
    normalizationPolicy: {
      crlf: "normalize-to-lf",
      cr: "normalize-to-lf",
      emptyLines: "remove",
      duplicates: "retain-one-exact-instance",
      ordering: "lexicographic-case-sensitive",
      internalWhitespace: "preserve",
      trailingNewline: "omit"
    },
    resourceLimits: { maxInputBytes: M16_A1_MAX_INPUT_BYTES, maxOutputBytes: M16_A1_MAX_INPUT_BYTES, timeoutMs: 5000 },
    networkPolicy: "offline-strict",
    sideEffectPolicy: "none",
    modelPolicy: "none",
    packageAcquisition: false,
    shell: false,
    executableId: M16_A1_EXECUTABLE_ID,
    permissions: ["read isolated input", "write declared isolated output", "emit immutable evidence"],
    limitations: ["bounded deterministic text transform only", "no shell", "no network", "no package acquisition", "no model/provider dependency", "candidate-only until later certification/promotion"],
    expectedTests: ["duplicate-lines", "empty-lines", "already-sorted", "reverse-sorted", "case-sensitive-order", "internal-whitespace", "crlf-lf-policy", "empty-input", "source-unmodified", "deterministic-replay", "bounded-input", "malformed-input", "oversized-input"]
  };
  return { requirement, profileHash: hashBoundedValue({ profileId: M16_A1_PROFILE_ID, profileVersion: M16_A1_PROFILE_VERSION, requirement: { ...requirement, objective: "<operator-objective>" } }) };
}

function certifiedContract(entry: RuntimeCapabilityRegistryEntry, activeVersion: string | null): Record<string, unknown> {
  const searchable = `${entry.name} ${entry.layer} ${entry.resourceTypes.map((resource) => `${resource.id} ${resource.description}`).join(" ")} ${entry.knownLimitations.join(" ")}`.toLowerCase();
  const operations: string[] = [];
  if (searchable.includes("text-normalization") || searchable.includes("text normalization")) operations.push("text-normalization");
  return {
    capabilityId: entry.capabilityId,
    compositionState: entry.compositionState,
    layer: entry.layer,
    resourceTypes: entry.resourceTypes.map((resource) => resource.id),
    declaredOperations: operations,
    selfAuthorizationAllowed: entry.authority.selfAuthorizationAllowed,
    activeVersion
  };
}

export function determineCapabilityGap(snapshot: RuntimeCapabilityRegistrySnapshot, requirement: BoundedCapabilityRequirement, activeVersionByCapability: Record<string, string | null> = {}): CapabilityGapReport {
  const considered = snapshot.document.capabilities.map((entry): CapabilityGapComparison => {
    const contract = certifiedContract(entry, activeVersionByCapability[entry.capabilityId] ?? null);
    const unsatisfiedFields: CapabilityGapComparison["unsatisfiedFields"] = [];
    if (entry.compositionState !== "certified") unsatisfiedFields.push({ field: "compositionState", required: "certified", actual: entry.compositionState, reason: "Capability is not certified in the authoritative runtime registry." });
    if (!(contract.declaredOperations as string[]).includes(requirement.operation)) unsatisfiedFields.push({ field: "operation", required: requirement.operation, actual: contract.declaredOperations, reason: "Certified registry entry does not declare the requested deterministic operation." });
    if (entry.authority.selfAuthorizationAllowed !== false) unsatisfiedFields.push({ field: "selfAuthorizationAllowed", required: false, actual: entry.authority.selfAuthorizationAllowed, reason: "Requested capability requires Control Plane authority." });
    return {
      capabilityId: entry.capabilityId,
      compositionState: entry.compositionState,
      activeStatus: activeVersionByCapability[entry.capabilityId] ? "ACTIVE" : "INACTIVE_OR_UNDECLARED",
      certifiedContract: contract,
      comparedFields: ["compositionState", "operation", "selfAuthorizationAllowed"],
      unsatisfiedFields,
      sufficient: unsatisfiedFields.length === 0
    };
  });
  const satisfying = considered.find((candidate) => candidate.sufficient);
  const unsigned = {
    schemaVersion: "sera.capability-gap-report.v1" as const,
    profileId: M16_A1_PROFILE_ID as typeof M16_A1_PROFILE_ID,
    profileVersion: M16_A1_PROFILE_VERSION as typeof M16_A1_PROFILE_VERSION,
    profileHash: hashBoundedValue({ profileId: M16_A1_PROFILE_ID, profileVersion: M16_A1_PROFILE_VERSION, executableId: requirement.executableId }),
    requirement,
    registrySchemaVersion: snapshot.schemaVersion,
    registrySha256: snapshot.sha256,
    registryRelativePath: snapshot.registryRelativePath,
    considered,
    gapStatus: satisfying ? "SATISFIED" as const : "UNSATISFIED" as const,
    satisfyingCapabilityId: satisfying?.capabilityId ?? null
  };
  return { ...unsigned, determinationHash: hashBoundedValue(unsigned) };
}

export const M16_A1_CANDIDATE_TESTS = [
  { id: "duplicate-lines", input: "beta\nalpha\nbeta\n", expected: "alpha\nbeta", expectSuccess: true },
  { id: "empty-lines", input: "beta\n\nalpha\n\n", expected: "alpha\nbeta", expectSuccess: true },
  { id: "already-sorted", input: "alpha\nbeta", expected: "alpha\nbeta", expectSuccess: true },
  { id: "reverse-sorted", input: "gamma\nbeta\nalpha", expected: "alpha\nbeta\ngamma", expectSuccess: true },
  { id: "case-sensitive-order", input: "a\nB\nA\nb", expected: "A\nB\na\nb", expectSuccess: true },
  { id: "internal-whitespace", input: "a b\na  b\na b", expected: "a  b\na b", expectSuccess: true },
  { id: "crlf-lf-policy", input: "beta\r\nalpha\r\nbeta\r", expected: "alpha\nbeta", expectSuccess: true },
  { id: "empty-input", input: "", expected: "", expectSuccess: true },
  { id: "malformed-input", input: "alpha\u0000beta", expected: null, expectSuccess: false },
  { id: "oversized-input", input: "x".repeat(M16_A1_MAX_INPUT_BYTES + 1), expected: null, expectSuccess: false }
] as const;
