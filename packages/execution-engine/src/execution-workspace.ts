import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ExecutionInputDeclaration, ExecutionOutputDeclaration } from "./execution-request";
import type { ExecutionPolicy } from "./execution-policy";

export interface MaterializedInput {
  id: string;
  sourceType: string;
  sourceReference: string;
  workspacePath: string;
  hash: string;
  size: number;
  metadata: Record<string, unknown>;
}

export interface HarvestedOutput {
  id: string;
  workspacePath: string;
  hash?: string;
  size: number;
  status: "harvested" | "missing";
  evidenceReference?: string;
  metadata: Record<string, unknown>;
}

export interface ExecutionWorkspace {
  workspaceRoot: string;
  workDir: string;
  inputs: MaterializedInput[];
}

export function createExecutionWorkspace(input: {
  projectRoot: string;
  executionId: string;
  workingDirectory: string;
  inputs: ExecutionInputDeclaration[];
  policy: ExecutionPolicy;
}): ExecutionWorkspace {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), `sera-execution-${safeName(input.executionId)}-`));
  const workDir = safeJoin(workspaceRoot, input.workingDirectory || ".");
  fs.mkdirSync(workDir, { recursive: true });
  materializeFixtureScript(workspaceRoot);
  const inputs = materializeInputs({ workspaceRoot, projectRoot: input.projectRoot, declarations: input.inputs, policy: input.policy });
  return { workspaceRoot, workDir, inputs };
}

export function materializeInputs(input: { workspaceRoot: string; projectRoot: string; declarations: ExecutionInputDeclaration[]; policy: ExecutionPolicy }): MaterializedInput[] {
  if (input.declarations.length > input.policy.maxInputFiles) throw new Error("Execution input file-count limit exceeded.");
  let total = 0;
  const results: MaterializedInput[] = [];
  for (const declaration of input.declarations) {
    const target = safeJoin(input.workspaceRoot, declaration.workspacePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (declaration.sourceType === "inline-text") {
      const content = declaration.content ?? "";
      fs.writeFileSync(target, content, "utf8");
    } else if (declaration.sourceType === "generated-fixture") {
      fs.writeFileSync(target, `generated:${declaration.fixtureName ?? declaration.id}\n`, "utf8");
    } else if (declaration.sourceType === "copy-file") {
      const source = approvedSource(input.projectRoot, declaration.source);
      const stat = fs.lstatSync(source);
      if (!stat.isFile()) throw new Error("Execution copy-file source must be a file.");
      if (stat.isSymbolicLink()) throw new Error("Execution input symlink escape is blocked.");
      fs.copyFileSync(source, target);
    } else if (declaration.sourceType === "copy-directory") {
      const source = approvedSource(input.projectRoot, declaration.source);
      copyDirectoryBounded(source, target, input.policy.maxInputFiles, input.policy.maxInputFileBytes);
    }
    const stat = fs.statSync(target);
    if (stat.size > input.policy.maxInputFileBytes) throw new Error("Execution individual input file-size limit exceeded.");
    total += stat.size;
    if (total > input.policy.maxInputBytes) throw new Error("Execution total input byte limit exceeded.");
    results.push({
      id: declaration.id,
      sourceType: declaration.sourceType,
      sourceReference: declaration.source ?? declaration.fixtureName ?? "inline",
      workspacePath: normalizeRelative(declaration.workspacePath),
      hash: sha256File(target),
      size: stat.size,
      metadata: {}
    });
  }
  return results;
}

export function harvestOutputs(workspaceRoot: string, outputs: ExecutionOutputDeclaration[], evidenceRoot: string): { declared: HarvestedOutput[]; undeclared: string[] } {
  const declaredPaths = new Set(outputs.map((item) => normalizeRelative(item.workspacePath)));
  const declared: HarvestedOutput[] = outputs.map((output) => {
    const absolute = safeJoin(workspaceRoot, output.workspacePath);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return { id: output.id, workspacePath: normalizeRelative(output.workspacePath), size: 0, status: "missing", metadata: { required: output.required !== false } };
    }
    const copyTarget = path.join(evidenceRoot, "outputs", normalizeRelative(output.workspacePath));
    fs.mkdirSync(path.dirname(copyTarget), { recursive: true });
    fs.copyFileSync(absolute, copyTarget);
    return { id: output.id, workspacePath: normalizeRelative(output.workspacePath), hash: sha256File(absolute), size: fs.statSync(absolute).size, status: "harvested", evidenceReference: normalizeRelative(path.relative(evidenceRoot, copyTarget)), metadata: { required: output.required !== false } };
  });
  const undeclared = listFiles(workspaceRoot)
    .map((absolute) => normalizeRelative(path.relative(workspaceRoot, absolute)))
    .filter((relative) => !relative.startsWith(".sera-fixture/") && !declaredPaths.has(relative) && !relative.endsWith(".tmp"));
  return { declared, undeclared };
}

export function cleanupWorkspace(workspaceRoot: string, preserve: boolean): { cleaned: boolean; workspaceRoot: string; message: string } {
  if (preserve) return { cleaned: false, workspaceRoot, message: "Workspace preserved by policy." };
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
  return { cleaned: !fs.existsSync(workspaceRoot), workspaceRoot, message: "Workspace cleanup completed." };
}

export function safeJoin(root: string, relativePath: string): string {
  const normalized = normalizeRelative(relativePath);
  const target = path.resolve(root, normalized);
  if (!isInside(root, target)) throw new Error("Execution workspace path escape is blocked.");
  return target;
}

function approvedSource(projectRoot: string, source: string | undefined): string {
  if (!source) throw new Error("Execution source path is required.");
  if (source.includes(".sera/state")) throw new Error("Operational database input is blocked.");
  const absolute = path.resolve(projectRoot, source);
  if (!isInside(projectRoot, absolute)) throw new Error("Execution source path escape is blocked.");
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error("Execution input symlink escape is blocked.");
  return absolute;
}

function materializeFixtureScript(workspaceRoot: string): void {
  const scriptPath = path.join(workspaceRoot, ".sera-fixture", "fixture.js");
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  fs.writeFileSync(scriptPath, [
    "const fs = require('fs');",
    "const path = require('path');",
    "const mode = process.argv[2];",
    "if (mode === 'fixture:echo') { console.log('sera-fixture-ok'); }",
    "else if (mode === 'fixture:stderr') { console.error('sera-fixture-stderr'); }",
    "else if (mode === 'fixture:output') { fs.mkdirSync('out', { recursive: true }); fs.writeFileSync(path.join('out','result.txt'), 'result-ok\\n'); console.log('wrote-output'); }",
    "else if (mode === 'fixture:undeclared') { fs.writeFileSync('extra.txt', 'extra\\n'); console.log('undeclared'); }",
    "else if (mode === 'fixture:large-stdout') { process.stdout.write('x'.repeat(200000)); }",
    "else if (mode === 'fixture:large-stderr') { process.stderr.write('e'.repeat(200000)); }",
    "else if (mode === 'fixture:timeout' || mode === 'fixture:cancel') { setTimeout(() => console.log('late'), 30000); }",
    "else if (mode === 'fixture:fail') { console.error('fixture failed'); process.exit(7); }",
    "else if (mode === 'fixture:network') { console.log('network would run'); }",
    "else { console.error('unknown fixture'); process.exit(9); }",
    ""
  ].join("\n"), "utf8");
}

function copyDirectoryBounded(source: string, target: string, maxFiles: number, maxFileBytes: number): void {
  let count = 0;
  for (const file of listFiles(source)) {
    count += 1;
    if (count > maxFiles) throw new Error("Execution input file-count limit exceeded.");
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error("Execution input symlink escape is blocked.");
    if (stat.size > maxFileBytes) throw new Error("Execution individual input file-size limit exceeded.");
    const rel = path.relative(source, file);
    const dest = safeJoin(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
}

function listFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(absolute));
    else if (entry.isFile()) result.push(absolute);
  }
  return result;
}

function normalizeRelative(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").includes("..") || path.isAbsolute(value)) throw new Error("Execution relative path is invalid.");
  return normalized;
}

function isInside(root: string, target: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
