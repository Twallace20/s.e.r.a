import fs from "node:fs";
import path from "node:path";

export function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function appendJsonLine(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

export function evidenceFilesComplete(evidenceRoot: string): boolean {
  return [
    "request.json",
    "authorization.json",
    "policy.json",
    "workspace-manifest.json",
    "input-manifest.json",
    "lifecycle-events.jsonl",
    "stdout.txt",
    "stderr.txt",
    "output-manifest.json",
    "process-result.json",
    "cleanup-report.json",
    "final-execution-report.json"
  ].every((file) => fs.existsSync(path.join(evidenceRoot, file)));
}
