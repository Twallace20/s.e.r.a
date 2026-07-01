import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AutoOps R153 fresh artifact request stale phase guard", () => {
  const repoRoot = process.cwd();
  const watcherPath = path.join(repoRoot, "scripts", "sera-chatgpt-artifact-watcher.mjs");
  const watcher = fs.readFileSync(watcherPath, "utf8");

  it("keeps fresh active artifact requests even when their phase is lower than the latest closed phase", () => {
    expect(watcher).toContain("function requestIsFreshAfterClosedHandoff");
    expect(watcher).toContain("function shouldArchiveAsStaleClosedPhaseRequest");
    expect(watcher).toContain("shouldArchiveAsStaleClosedPhaseRequest(request, closed)");
    expect(watcher).toContain("freshActiveRequestAfterClosed");
    expect(watcher).toContain("alreadyClosedByLatestPhase");
    expect(watcher).toContain("!freshActiveRequestAfterClosed");
  });
});
