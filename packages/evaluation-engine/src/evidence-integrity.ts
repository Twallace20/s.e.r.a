import type { EvaluationEvidenceReference } from "./evaluation-spec";
import { EvidenceLoader } from "./evidence-loader";

export function verifyEvidenceReferences(loader: EvidenceLoader, references: EvaluationEvidenceReference[]): Array<{ id: string; path: string; sha256: string; size: number }> {
  return references.map((reference) => {
    const loaded = loader.load(reference.id, reference.path, reference.sha256, reference.size);
    return { id: reference.id, path: loaded.path, sha256: loaded.sha256, size: loaded.size };
  });
}
