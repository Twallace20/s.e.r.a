import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadRegistry() {
  return await import("../../scripts/lib/tool-plugin-registry-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-tool-registry-test-"));
}

describe("Tool / Plugin Registry v1", () => {
  it("initializes a local registry and event log", async () => {
    const root = tempRoot();
    const { ToolPluginRegistry } = await loadRegistry();
    const registry = new ToolPluginRegistry({ rootDir: root });
    const init = registry.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.registryPath)).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(init.toolCount).toBe(0);
  });

  it("registers free-core local tools and assesses approval boundaries", async () => {
    const root = tempRoot();
    const { ToolPluginRegistry } = await loadRegistry();
    const registry = new ToolPluginRegistry({ rootDir: root });
    registry.initialize();

    const tool = registry.registerTool({
      id: "local-dashboard-tool",
      name: "Local Dashboard Tool",
      version: "0.1.0",
      kind: "script",
      description: "Reads and writes local runtime dashboard artifacts.",
      permissions: ["read_runtime", "write_runtime"],
      mutationAuthority: "none"
    });

    const assessment = registry.assessTool(tool.id);
    expect(tool.freeCoreSafe).toBe(true);
    expect(tool.localOnly).toBe(true);
    expect(assessment.ok).toBe(true);
    expect(assessment.riskLevel).toBe("medium");
    expect(assessment.approvalRequired).toBe(false);
  });

  it("guards validation-gated source mutation tools", async () => {
    const root = tempRoot();
    const { ToolPluginRegistry } = await loadRegistry();
    const registry = new ToolPluginRegistry({ rootDir: root });
    registry.initialize();

    registry.registerTool({
      id: "validation-gated-dev-worker",
      name: "Validation Gated Dev Worker",
      version: "0.1.0",
      kind: "worker",
      description: "Can write source only behind validation and rollback gates.",
      permissions: ["read_source", "write_source", "execute_process", "write_runtime"],
      mutationAuthority: "validation_gated_apply"
    });

    const assessment = registry.assessTool("validation-gated-dev-worker");
    expect(assessment.freeCoreSafe).toBe(true);
    expect(assessment.riskLevel).toBe("high");
    expect(assessment.approvalRequired).toBe(true);
  });

  it("marks cloud or network adapters as excluded from the free core", async () => {
    const root = tempRoot();
    const { ToolPluginRegistry } = await loadRegistry();
    const registry = new ToolPluginRegistry({ rootDir: root });
    registry.initialize();

    registry.registerTool({
      id: "optional-network-adapter",
      name: "Optional Network Adapter",
      version: "0.0.0",
      kind: "adapter",
      status: "disabled",
      description: "Future optional network adapter.",
      localOnly: false,
      requiresCloud: true,
      permissions: ["network", "external_service"],
      mutationAuthority: "none"
    });

    const assessment = registry.assessTool("optional-network-adapter");
    expect(assessment.freeCoreSafe).toBe(false);
    expect(assessment.riskLevel).toBe("blocked");
    expect(assessment.approvalRequired).toBe(true);
  });

  it("writes summary artifacts and blocks registry paths outside the project root", async () => {
    const root = tempRoot();
    const { ToolPluginRegistry } = await loadRegistry();
    const registry = new ToolPluginRegistry({ rootDir: root });
    registry.initialize();
    registry.registerTool({
      id: "summary-tool",
      name: "Summary Tool",
      version: "0.1.0",
      kind: "script",
      description: "Summary artifact test tool.",
      permissions: ["read_runtime"],
      mutationAuthority: "none"
    });

    const artifacts = registry.writeSummaryArtifacts();
    expect(artifacts.ok).toBe(true);
    expect(artifacts.summary.toolCount).toBe(1);
    expect(artifacts.summary.localOnly).toBe(true);
    expect(artifacts.summary.paidProviderRequired).toBe(false);
    expect(artifacts.summary.cloudRequired).toBe(false);
    expect(fs.existsSync(artifacts.jsonPath)).toBe(true);
    expect(fs.existsSync(artifacts.markdownPath)).toBe(true);
    expect(fs.existsSync(artifacts.historyPath)).toBe(true);
    expect(fs.readFileSync(artifacts.markdownPath, "utf8")).toContain("Tool / Plugin Registry v1 Summary");

    expect(() => new ToolPluginRegistry({ rootDir: root, registryRelativeDir: "../outside-tools" })).toThrow(/inside the project root/);
  });
});
