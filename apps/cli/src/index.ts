#!/usr/bin/env node
import { SeraKernel } from "@sera/kernel";

function printHelp(): void {
  console.log(`S.E.R.A. CLI

Usage:
  sera run "create hello file"
  sera dev suggest <relative-file> <find-text> <replace-text>
  sera dev apply <relative-file> <find-text> <replace-text>

NPM examples:
  npm run sera -- run "create hello file"
  npm run sera -- dev suggest README.md "old" "new"
  npm run sera -- dev apply examples/demo.txt "old" "new"

Secure base behavior:
  - runs locally
  - creates .sera-runs/<run-id>/
  - writes evidence artifacts
  - Developer Worker suggested mode does not modify source files
  - Developer Worker direct mode creates backup artifacts before writing
  - does not require an LLM provider
`);
}

function requireArg(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  const kernel = new SeraKernel({ rootDir: process.cwd() });

  if (cmd === "run") {
    const prompt = rest.join(" ").trim();
    if (!prompt) {
      console.error("Missing task prompt.");
      process.exit(1);
    }

    const result = kernel.runTask(prompt);
    console.log(JSON.stringify({
      ok: result.ok,
      status: result.status,
      message: result.message,
      runDir: result.run.runDir,
      workspaceDir: result.run.workspaceDir
    }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (cmd === "dev") {
    const [modeRaw, relativePath, find, replaceWith] = rest;
    if (modeRaw !== "suggest" && modeRaw !== "apply") {
      throw new Error("Developer command must be either 'suggest' or 'apply'.");
    }
    const result = kernel.runDeveloperEditTask({
      mode: modeRaw === "suggest" ? "suggested" : "direct",
      relativePath: requireArg(relativePath, "relative file path"),
      find: requireArg(find, "find text"),
      replaceWith: requireArg(replaceWith, "replace text")
    });
    console.log(JSON.stringify({
      ok: result.ok,
      status: result.status,
      message: result.message,
      changed: result.developer.changed,
      occurrences: result.developer.occurrences,
      suggestionPath: result.developer.suggestionPath,
      backupPath: result.developer.backupPath,
      runDir: result.run.runDir
    }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
