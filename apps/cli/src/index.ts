#!/usr/bin/env node
import { SeraKernel } from "@sera/kernel";

function printHelp(): void {
  console.log(`S.E.R.A. CLI

Usage:
  sera run "create hello file"
  npm run sera -- run "create hello file"

Secure base behavior:
  - runs locally
  - creates .sera-runs/<run-id>/
  - writes evidence artifacts
  - does not require an LLM provider
`);
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }

  if (cmd !== "run") {
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }

  const prompt = rest.join(" ").trim();
  if (!prompt) {
    console.error("Missing task prompt.");
    process.exit(1);
  }

  const kernel = new SeraKernel({ rootDir: process.cwd() });
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
