import { execFileSync } from "node:child_process";

const forbiddenPrefixes = [
  "node_modules/",
  "dist/",
  "coverage/",
  ".sera-runs/",
  ".sera-cert/",
  ".sera-local/",
  ".sera-memory/",
  ".sera-tasks/",
  ".sera-knowledge/",
  ".sera-models/",
  ".sera-autonomy/",
  ".sera-console/",
  ".sera-operator-tui/",
  ".sera-sqlite/",
  ".sera-tools/",
  ".sera-capabilities/",
  ".sera-ci-gate/",
  ".sera-phase-packets/",
  ".sera-evals/"
];

function trackedFiles() {
  try {
    const output = execFileSync("git", ["ls-files", "-z"], {
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return output
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((file) => file.replace(/\\/g, "/"));
  } catch (error) {
    console.error("S.E.R.A. runtime artifact hygiene could not read tracked files with git ls-files.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function isForbiddenEnvFile(file) {
  if (!file.startsWith(".env")) {
    return false;
  }

  return file !== ".env.example";
}

function isForbiddenRuntimeFile(file) {
  return forbiddenPrefixes.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix));
}

const violations = trackedFiles().filter((file) => isForbiddenRuntimeFile(file) || isForbiddenEnvFile(file));

if (violations.length > 0) {
  console.error("S.E.R.A. runtime artifact hygiene failed.");
  console.error("The following tracked files or folders are runtime/local artifacts and must not be committed:");

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  console.error("\nRemove them from Git tracking, keep them ignored, then rerun npm run hygiene:runtime.");
  process.exit(1);
}

console.log("S.E.R.A. runtime artifact hygiene: PASS");
