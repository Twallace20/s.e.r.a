import { execFileSync } from "node:child_process";

const forbiddenSourceSuffixes = [".js", ".js.map", ".d.ts"];

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
    console.error("S.E.R.A. source hygiene could not read tracked files with git ls-files.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function isTypeScriptBuildCache(file) {
  return file.endsWith(".tsbuildinfo");
}

function isGeneratedSourceArtifact(file) {
  const inWorkspaceSource =
    (file.startsWith("packages/") || file.startsWith("apps/")) && file.includes("/src/");

  if (!inWorkspaceSource) {
    return false;
  }

  return forbiddenSourceSuffixes.some((suffix) => file.endsWith(suffix));
}

const violations = trackedFiles().filter((file) => isTypeScriptBuildCache(file) || isGeneratedSourceArtifact(file));

if (violations.length > 0) {
  console.error("S.E.R.A. source hygiene failed.");
  console.error("The following tracked files look generated and should not live in source control:");

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  console.error("\nRemove generated artifacts from Git tracking, then rerun npm run hygiene:source.");
  process.exit(1);
}

console.log("S.E.R.A. source hygiene: PASS");
