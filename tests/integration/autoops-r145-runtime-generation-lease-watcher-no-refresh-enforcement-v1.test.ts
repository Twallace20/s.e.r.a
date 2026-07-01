import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("AutoOps R145 runtime generation lease watcher no-refresh enforcement", () => {
  it("ships the R145 overlay manifest, proof, runtime script, and verifier", () => {
    expect(existsSync(join(repoRoot, ".overlay", "autoops_r145_runtime_generation_lease_watcher_no_refresh_enforcement_v1.json"))).toBe(true);
    expect(existsSync(join(repoRoot, ".sera-proof", "autoops_r145_runtime_generation_lease_watcher_no_refresh_enforcement_v1.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "scripts", "autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1"))).toBe(true);
    expect(existsSync(join(repoRoot, "scripts", "verify-autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1"))).toBe(true);
  });

  it("requires a generation lease with no-refresh and no-resubmit fields", () => {
    const script = read("scripts/autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1");

    expect(script).toContain("generation-lease.json");
    expect(script).toContain("commandId");
    expect(script).toContain("phaseSlug");
    expect(script).toContain("expectedZipName");
    expect(script).toContain("leaseStatus");
    expect(script).toContain("leaseStartedAt");
    expect(script).toContain("leaseExpiresAt");
    expect(script).toContain("lastObservedAt");
    expect(script).toContain("submittedAt");
    expect(script).toContain("downloadedAt");
    expect(script).toContain("routedAt");
    expect(script).toContain("completedAt");
    expect(script).toContain("failureReason");
    expect(script).toContain("doNotRefresh");
    expect(script).toContain("doNotResubmit");
  });

  it("disables refresh by default unless the owner diagnostic flag exists", () => {
    const script = read("scripts/autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1");

    expect(script).toContain("ALLOW_BROWSER_REFRESH_DIAGNOSTIC.flag");
    expect(script).toContain("RefreshMinutes 0");
    expect(script).toContain("RefreshMs 0");
    expect(script).toContain("refreshAllowedByOwnerDiagnosticFlag");
  });

  it("requires exact ZIP routing evidence", () => {
    const script = read("scripts/autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1");

    expect(script).toContain("Route-R145ExpectedZip");
    expect(script).toContain("expectedZipName");
    expect(script).toContain("sourcePath");
    expect(script).toContain("destinationPath");
    expect(script).toContain("SHA256");
    expect(script).toContain("fileSize");
    expect(script).toContain("stabilityCheckResult");
    expect(script).toContain("routeTimestamp");
    expect(script).toContain("routeMode");
  });

  it("preserves saved-target-only and no random/new chat fallback safety gates", () => {
    const manifest = JSON.parse(read(".overlay/autoops_r145_runtime_generation_lease_watcher_no_refresh_enforcement_v1.json"));

    expect(manifest.safety.savedChatGptTargetOnly).toBe(true);
    expect(manifest.safety.allowRandomRecentChatFallback).toBe(false);
    expect(manifest.safety.allowNewChatFallback).toBe(false);
    expect(manifest.safety.noCredentialsOrTokens).toBe(true);
    expect(manifest.safety.noPaidServices).toBe(true);
    expect(manifest.safety.noProductionDeployment).toBe(true);
    expect(manifest.safety.noSelfMerge).toBe(true);
  });
});
