#!/usr/bin/env node
import { SeraKernel } from "@sera/kernel";

function printHelp(): void {
  console.log(`S.E.R.A. CLI

Usage:
  sera run "create hello file"
  sera dev inspect <relative-file>
  sera dev suggest <relative-file> <find-text> <replace-text>
  sera dev apply <relative-file> <find-text> <replace-text>
  sera dev patch suggest <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera dev patch apply <relative-file> <find-text> <replace-text> [expected-occurrences]
  sera dev patch apply-build <relative-file> <find-text> <replace-text> [expected-occurrences]

NPM examples:
  npm run sera -- run "create hello file"
  npm run sera -- dev inspect README.md
  npm run sera -- dev suggest README.md "old" "new"
  npm run sera -- dev apply examples/demo.txt "old" "new"
  npm run sera -- dev patch suggest README.md "old" "new" 1
  npm run sera -- dev patch apply-build README.md "old" "new" 1

Secure base behavior:
  - runs locally
  - creates .sera-runs/<run-id>/
  - writes evidence artifacts
  - Developer Worker suggested mode does not modify source files
  - Developer Worker direct mode creates backup artifacts before writing
  - Developer Worker patch mode supports expected occurrence checks
  - Developer Worker apply-build validates with npm run build and rolls back on failure
  - does not require an LLM provider
`);
}

function requireArg(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function parseExpectedOccurrences(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Expected occurrences must be a non-negative integer when supplied.");
  }
  return parsed;
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
    const [modeRaw, ...devRest] = rest;

    if (modeRaw === "inspect") {
      const result = kernel.runDeveloperInspectTask({
        relativePath: requireArg(devRest[0], "relative file path")
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        exists: result.inspection.exists,
        sizeBytes: result.inspection.sizeBytes,
        lineCount: result.inspection.lineCount,
        sha256: result.inspection.sha256,
        artifactPath: result.inspection.artifactPath,
        runDir: result.run.runDir
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    if (modeRaw === "suggest" || modeRaw === "apply") {
      const [relativePath, find, replaceWith] = devRest;
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

    if (modeRaw === "patch") {
      const [patchModeRaw, relativePath, find, replaceWith, expectedRaw] = devRest;
      if (patchModeRaw !== "suggest" && patchModeRaw !== "apply" && patchModeRaw !== "apply-build") {
        throw new Error("Developer patch command must be 'suggest', 'apply', or 'apply-build'.");
      }
      const expectedOccurrences = parseExpectedOccurrences(expectedRaw);
      const result = kernel.runDeveloperPatchTask({
        mode: patchModeRaw === "suggest" ? "suggested" : "direct",
        relativePath: requireArg(relativePath, "relative file path"),
        operations: [
          {
            kind: "replace",
            find: requireArg(find, "find text"),
            replaceWith: requireArg(replaceWith, "replace text"),
            expectedOccurrences
          }
        ],
        validationCommand: patchModeRaw === "apply-build" ? { command: "npm", args: ["run", "build"] } : undefined
      });
      console.log(JSON.stringify({
        ok: result.ok,
        status: result.status,
        message: result.message,
        changed: result.patch.changed,
        totalOccurrences: result.patch.totalOccurrences,
        operationCount: result.patch.operationCount,
        patchArtifactPath: result.patch.patchArtifactPath,
        backupPath: result.patch.backupPath,
        restored: result.patch.restored,
        validation: result.patch.validation,
        runDir: result.run.runDir
      }, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    throw new Error("Developer command must be 'inspect', 'suggest', 'apply', or 'patch'.");
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
