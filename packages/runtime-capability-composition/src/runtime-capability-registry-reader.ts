import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const RUNTIME_CAPABILITY_REGISTRY_SCHEMA = "sera.runtime-capability-registry.v1";
export const DEFAULT_RUNTIME_CAPABILITY_REGISTRY_RELATIVE_PATH = "architecture/runtime-capability-registry-v1.json";
export const DEFAULT_RUNTIME_CAPABILITY_REGISTRY_HASH_RELATIVE_PATH = "architecture/runtime-capability-registry-v1.sha256";

export interface RuntimeCapabilityRegistryEntry {
  capabilityId: string;
  name: string;
  layer: string;
  productionEntryPoint: string;
  compositionState: string;
  authority: {
    requestAuthority: string;
    executionAuthority: string;
    stateAuthority: string;
    evidenceAuthority: string;
    selfAuthorizationAllowed: boolean;
  };
  resourceTypes: Array<{ id: string; description: string; requiresRealResource: boolean; proofState: string; knownLimitations?: string[] }>;
  existingEvidence: string[];
  knownLimitations: string[];
}

export interface RuntimeCapabilityRegistryDocument {
  schemaVersion: string;
  milestone: number;
  purpose: string;
  authorityRule: string;
  realResourceProofRule: Record<string, unknown>;
  capabilities: RuntimeCapabilityRegistryEntry[];
}

export interface RuntimeCapabilityRegistrySnapshot {
  schemaVersion: typeof RUNTIME_CAPABILITY_REGISTRY_SCHEMA;
  registryPath: string;
  registryRelativePath: string;
  sha256: string;
  bytes: number;
  document: RuntimeCapabilityRegistryDocument;
}

export interface RuntimeCapabilityRegistryReader {
  read(): RuntimeCapabilityRegistrySnapshot;
}

function sha256Buffer(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertReleaseRelative(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized || path.isAbsolute(normalized) || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Runtime capability registry path must remain release-relative.");
  }
  return normalized;
}

export class ReleaseRelativeRuntimeCapabilityRegistryReader implements RuntimeCapabilityRegistryReader {
  constructor(
    private readonly releaseRoot: string,
    private readonly registryRelativePath = DEFAULT_RUNTIME_CAPABILITY_REGISTRY_RELATIVE_PATH,
    private readonly hashRelativePath = DEFAULT_RUNTIME_CAPABILITY_REGISTRY_HASH_RELATIVE_PATH
  ) {}

  read(): RuntimeCapabilityRegistrySnapshot {
    const registryRelativePath = assertReleaseRelative(this.registryRelativePath);
    const hashRelativePath = assertReleaseRelative(this.hashRelativePath);
    const registryPath = path.resolve(this.releaseRoot, registryRelativePath);
    const hashPath = path.resolve(this.releaseRoot, hashRelativePath);
    if (!registryPath.startsWith(path.resolve(this.releaseRoot) + path.sep) || !hashPath.startsWith(path.resolve(this.releaseRoot) + path.sep)) {
      throw new Error("Runtime capability registry path escaped the release root.");
    }
    const bytes = fs.readFileSync(registryPath);
    const actualHash = sha256Buffer(bytes);
    const expectedHash = fs.readFileSync(hashPath, "utf8").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expectedHash) || actualHash !== expectedHash) {
      throw new Error("Runtime capability registry hash mismatch.");
    }
    const document = JSON.parse(bytes.toString("utf8")) as RuntimeCapabilityRegistryDocument;
    if (document.schemaVersion !== RUNTIME_CAPABILITY_REGISTRY_SCHEMA) {
      throw new Error("Unsupported runtime capability registry schema.");
    }
    if (!Array.isArray(document.capabilities) || document.capabilities.some((entry) => !entry.capabilityId || !entry.compositionState)) {
      throw new Error("Runtime capability registry is malformed.");
    }
    return {
      schemaVersion: RUNTIME_CAPABILITY_REGISTRY_SCHEMA,
      registryPath,
      registryRelativePath,
      sha256: actualHash,
      bytes: bytes.length,
      document
    };
  }
}
