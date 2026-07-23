import fs from "node:fs";
import path from "node:path";

export type ProbeClassification = "EXISTS_ACCESS_DENIED" | "ABSENT" | "READABLE" | "ENUMERABLE" | "EXECUTABLE" | "REPARSE_ESCAPE" | "PROBE_ERROR";
export interface DenialTarget { targetRole: string; requestedPath: string; knownChild?: string; executionApplicable?: boolean; }
const operations = ["identity", "enumerate", "known-child-read", "file-open", "execution", "reparse-inspection", "parent-traversal"];
export function collectDenialObservations(targets: DenialTarget[], proofSid: string): any[] { return targets.flatMap((target) => operations.map((operation) => probe(target, operation, proofSid))); }
function probe(target: DenialTarget, operation: string, proofSid: string): any {
  const requestedPath = path.resolve(target.requestedPath), timestamp = new Date().toISOString(); let classification: ProbeClassification = "PROBE_ERROR", windowsErrorCode = 0, canonicalIdentity: string | null = null;
  try {
    const stat = fs.lstatSync(requestedPath); canonicalIdentity = fs.realpathSync(requestedPath);
      if (stat.isSymbolicLink() || canonicalIdentity.toLowerCase() !== requestedPath.toLowerCase()) { classification = "REPARSE_ESCAPE"; windowsErrorCode = 4390; }
      else if (operation === "enumerate" && stat.isDirectory()) { fs.readdirSync(requestedPath); classification = "ENUMERABLE"; }
      else if (operation === "known-child-read" && target.knownChild) { fs.readFileSync(path.join(requestedPath, target.knownChild)); classification = "READABLE"; }
      else if (operation === "file-open" && stat.isFile()) { const fd = fs.openSync(requestedPath, "r"); fs.closeSync(fd); classification = "READABLE"; }
      else if (operation === "execution" && target.executionApplicable) { fs.accessSync(requestedPath, fs.constants.X_OK); classification = "EXECUTABLE"; }
      else classification = "READABLE";
  } catch (error) { const code = (error as NodeJS.ErrnoException).code; classification = code === "ENOENT" ? "ABSENT" : code === "EACCES" || code === "EPERM" ? "EXISTS_ACCESS_DENIED" : "PROBE_ERROR"; windowsErrorCode = code === "ENOENT" ? 2 : code === "EACCES" || code === "EPERM" ? 5 : -1; }
  return { requestedPath: target.requestedPath, normalizedPath: requestedPath, canonicalIdentity, targetRole: target.targetRole, operation, windowsErrorCode, classification, proofSid, timestamp, parentTraversalBlocked: classification === "EXISTS_ACCESS_DENIED" || classification === "ABSENT" };
}
