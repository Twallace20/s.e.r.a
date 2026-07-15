import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export class EvaluationEvidenceError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

export interface LoadedEvidence {
  id: string;
  path: string;
  absolutePath: string;
  size: number;
  sha256: string;
  text?: string;
}

export class EvidenceLoader {
  private readonly root: string;
  private readonly realRoot: string;

  constructor(evidenceRoot: string, private readonly maxBytes: number) {
    this.root = path.resolve(evidenceRoot);
    if (!fs.existsSync(this.root)) throw new EvaluationEvidenceError("Execution evidence root is missing.", "missing_evidence_root");
    this.realRoot = fs.realpathSync(this.root);
  }

  load(id: string, relativePath: string, expectedSha256?: string, expectedSize?: number): LoadedEvidence {
    const normalized = relativePath.replace(/\\/g, "/");
    if (!normalized || normalized.startsWith("/") || normalized.includes("..") || /^[A-Za-z]:/.test(normalized)) {
      throw new EvaluationEvidenceError("Evidence path traversal is blocked.", "evidence_path_escape");
    }
    const absolutePath = path.resolve(this.root, normalized);
    const rel = path.relative(this.root, absolutePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new EvaluationEvidenceError("Evidence path must stay inside evidence root.", "evidence_path_escape");
    if (!fs.existsSync(absolutePath)) throw new EvaluationEvidenceError(`Evidence file is missing: ${normalized}`, "missing_evidence");
    const lstat = fs.lstatSync(absolutePath);
    if (lstat.isSymbolicLink()) throw new EvaluationEvidenceError("Evidence symlink or junction escape is blocked.", "evidence_symlink_escape");
    const real = fs.realpathSync(absolutePath);
    const realRel = path.relative(this.realRoot, real);
    if (realRel.startsWith("..") || path.isAbsolute(realRel)) throw new EvaluationEvidenceError("Evidence real path escaped evidence root.", "evidence_symlink_escape");
    const stat = fs.statSync(real);
    if (!stat.isFile()) throw new EvaluationEvidenceError("Evidence reference is not a file.", "evidence_not_file");
    if (stat.size > this.maxBytes) throw new EvaluationEvidenceError("Evidence file exceeds policy size.", "evidence_too_large");
    if (expectedSize !== undefined && stat.size !== expectedSize) throw new EvaluationEvidenceError("Evidence file size differs from durable reference.", "evidence_size_mismatch");
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(real)).digest("hex");
    if (expectedSha256 && sha256 !== expectedSha256) throw new EvaluationEvidenceError("Evidence hash differs from durable reference.", "evidence_hash_mismatch");
    return { id, path: normalized, absolutePath: real, size: stat.size, sha256 };
  }

  readText(id: string, relativePath: string, limit: number, expectedSha256?: string, expectedSize?: number): LoadedEvidence {
    const loaded = this.load(id, relativePath, expectedSha256, expectedSize);
    if (loaded.size > limit) throw new EvaluationEvidenceError("Text evidence exceeds policy size.", "evidence_too_large");
    return { ...loaded, text: fs.readFileSync(loaded.absolutePath, "utf8").replace(/\r\n/g, "\n") };
  }
}
