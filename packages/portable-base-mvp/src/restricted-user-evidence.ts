import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const EVIDENCE_MANIFEST_FILE = "restricted-user-evidence-manifest.json";
export const EVIDENCE_MANIFEST_SCHEMA = "sera.restricted-user-evidence-manifest.v3";
export type ProofStage = "preparation" | "pre-restart" | "post-restart";

export interface EvidenceEntry {
  path: string; artifactType: string; collectorId: string; collectorSha256: string; size: number; sha256: string;
  capturedAt: string; proofStage: ProofStage; proofSid: string; sessionId: string; nonce: string;
}
export interface EvidenceManifest {
  schemaVersion: string; profileId: string; evidenceMode: "governed-windows-v2" | "synthetic-test-v2";
  sessionId: string; nonce: string; installationIdentity: string; subjectCollectorDigest: string; preparationManifestDigest: string; governanceDecisionDigest: string;
  files: EvidenceEntry[]; manifestDigest: string;
}

export const sha256 = (bytes: Buffer | string) => crypto.createHash("sha256").update(bytes).digest("hex");
export const sha256File = (file: string) => sha256(fs.readFileSync(file));
export function stableJson(value: unknown): string {
  const norm = (v: any): any => Array.isArray(v) ? v.map(norm) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, norm(x)])) : v;
  return JSON.stringify(norm(value));
}
export function manifestDigest(manifest: Omit<EvidenceManifest, "manifestDigest">): string { return sha256(stableJson(manifest)); }
export function safeArtifactPath(root: string, relative: string): string | null {
  if (!relative || path.isAbsolute(relative) || relative.includes("\\") || path.posix.normalize(relative) !== relative || relative === ".." || relative.startsWith("../")) return null;
  const full = path.resolve(root, ...relative.split("/"));
  return full.startsWith(`${path.resolve(root)}${path.sep}`) ? full : null;
}
export function listBundleFiles(root: string): string[] {
  const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) return [full];
    return entry.isDirectory() ? walk(full) : [full];
  });
  return walk(path.resolve(root)).map((file) => path.relative(path.resolve(root), file).replace(/\\/g, "/")).sort((a, b) => a.localeCompare(b));
}
export function normalizedTreeDigest(root: string): string {
  const resolved = path.resolve(root);
  const records = listBundleFiles(resolved).map((relative) => {
    const full = safeArtifactPath(resolved, relative);
    if (!full || fs.lstatSync(full).isSymbolicLink()) throw new Error(`Unsafe tree entry: ${relative}`);
    return `${relative}\0${fs.statSync(full).size}\0${sha256File(full)}`;
  });
  return sha256(records.join("\n"));
}
export function readJson(file: string): any { return JSON.parse(fs.readFileSync(file, "utf8")); }
