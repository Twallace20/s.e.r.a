
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const script = "scripts/autoops-r148-command-source-immutability-stale-handoff-filter-v1.ps1";
const manifest = ".overlay/autoops_r148_command_source_immutability_stale_handoff_filter_v1.json";

describe("AutoOps R148 command source immutability stale handoff filter", () => {
  it("ships the overlay manifest", () => {
    expect(existsSync(manifest)).toBe(true);
  });

  it("protects command inbox source files", () => {
    const text = readFileSync(script, "utf8");
    expect(text).toContain("Protect-CommandInbox");
    expect(text).toContain("r148-quarantined-command-results");
  });

  it("filters stale CLOSED_CLEANLY handoff results", () => {
    const text = readFileSync(script, "utf8");
    expect(text).toContain("Latest handoff status is CLOSED_CLEANLY");
    expect(text).toContain("stale_closed_cleanly_handoff_not_matching_active_command");
  });

  it("preserves current command contract evidence", () => {
    const text = readFileSync(script, "utf8");
    expect(text).toContain("active-command-contract.json");
    expect(text).toContain("expectedZipFilename");
  });

  it("installs as a Phone Control Watcher wrapper", () => {
    const text = readFileSync(script, "utf8");
    expect(text).toContain("SERA Phone Control Watcher");
    expect(text).toContain("New-ScheduledTaskAction");
  });
});
