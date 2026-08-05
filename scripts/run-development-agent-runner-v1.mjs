#!/usr/bin/env node
import path from "node:path";
import { runDevelopmentAgentAuditV1 } from "./lib/development-agent-runner-v1.mjs";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node scripts/run-development-agent-runner-v1.mjs --manifest <repo-relative-or-absolute-path> [--output <outside-repo-directory>]");
  process.exit(0);
}

try {
  const manifestInput = valueAfter("--manifest");
  if (!manifestInput) throw new Error("--manifest is required.");
  const result = runDevelopmentAgentAuditV1({
    repoRoot: process.cwd(),
    manifestPath: path.resolve(process.cwd(), manifestInput),
    outputDir: valueAfter("--output"),
  });
  console.log(JSON.stringify({
    ok: result.ok,
    result: result.result,
    executed: result.executed,
    outputDir: result.outputDir,
    evidenceReport: result.markdownPath,
    errors: result.errors,
  }, null, 2));
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  console.error(`Development Agent runner failed: ${error.message}`);
  process.exit(1);
}
