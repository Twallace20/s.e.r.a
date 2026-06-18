import fs from "node:fs";
import path from "node:path";
import { redactSecrets } from "@sera/shared";

export class ArtifactStore {
  readonly runDir: string;

  constructor(runDir: string) {
    this.runDir = path.resolve(runDir);
    fs.mkdirSync(this.runDir, { recursive: true });
  }

  path(...segments: string[]): string {
    return path.join(this.runDir, ...segments);
  }

  ensureDir(...segments: string[]): string {
    const p = this.path(...segments);
    fs.mkdirSync(p, { recursive: true });
    return p;
  }

  writeJson(relativePath: string, value: unknown): string {
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, redactSecrets(JSON.stringify(value, null, 2)) + "\n", "utf8");
    return target;
  }

  appendJsonl(relativePath: string, value: unknown): string {
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, redactSecrets(JSON.stringify(value)) + "\n", "utf8");
    return target;
  }

  writeMarkdown(relativePath: string, markdown: string): string {
    const target = this.path(relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, redactSecrets(markdown).trimEnd() + "\n", "utf8");
    return target;
  }
}
