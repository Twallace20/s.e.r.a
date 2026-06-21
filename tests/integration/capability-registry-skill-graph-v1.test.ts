import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadCapabilityRegistry() {
  return await import("../../scripts/lib/capability-registry-skill-graph-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-capability-registry-test-"));
}

describe("Capability Registry + Skill Graph v1", () => {
  it("initializes a local capability registry and skill graph", async () => {
    const root = tempRoot();
    const { CapabilityRegistrySkillGraph } = await loadCapabilityRegistry();
    const registry = new CapabilityRegistrySkillGraph({ rootDir: root });
    const init = registry.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.capabilityPath)).toBe(true);
    expect(fs.existsSync(init.skillGraphPath)).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(init.capabilityCount).toBe(0);
  });

  it("registers evidence-backed free-core capabilities", async () => {
    const root = tempRoot();
    const { CapabilityRegistrySkillGraph } = await loadCapabilityRegistry();
    const registry = new CapabilityRegistrySkillGraph({ rootDir: root });
    registry.initialize();

    const capability = registry.registerCapability({
      id: "local-knowledge-search",
      name: "Local Knowledge Search",
      domain: "knowledge",
      status: "available",
      currentLevel: "certified",
      certificationStatus: "certified",
      evidence: ["tests/integration/knowledge.test.ts"],
      requiredTools: [],
      requiredKnowledge: ["docs/knowledge/SOURCE_MAP.md"]
    });

    const assessment = registry.assessCapability(capability.id);
    expect(capability.freeCoreSafe).toBe(true);
    expect(capability.localOnly).toBe(true);
    expect(assessment.ok).toBe(true);
    expect(assessment.status).toBe("ready");
  });

  it("links capabilities in a local skill graph", async () => {
    const root = tempRoot();
    const { CapabilityRegistrySkillGraph } = await loadCapabilityRegistry();
    const registry = new CapabilityRegistrySkillGraph({ rootDir: root });
    registry.initialize();

    registry.registerCapability({
      id: "research-answers",
      name: "Research Answers",
      status: "available",
      currentLevel: "certified",
      certificationStatus: "certified",
      evidence: ["tests/integration/research-knowledge-worker.test.ts"]
    });
    registry.registerCapability({
      id: "local-knowledge-search",
      name: "Local Knowledge Search",
      status: "available",
      currentLevel: "certified",
      certificationStatus: "certified",
      evidence: ["tests/integration/knowledge.test.ts"]
    });

    const edge = registry.linkCapabilities("research-answers", "local-knowledge-search", "requires", ["Research requires indexed local knowledge."]);
    const graph = registry.readSkillGraph();
    expect(edge.relationship).toBe("requires");
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });

  it("flags planned external capabilities as outside the free core", async () => {
    const root = tempRoot();
    const { CapabilityRegistrySkillGraph } = await loadCapabilityRegistry();
    const registry = new CapabilityRegistrySkillGraph({ rootDir: root });
    registry.initialize();

    registry.registerCapability({
      id: "external-web-research",
      name: "External Web Research",
      status: "planned",
      currentLevel: "none",
      certificationStatus: "uncertified",
      evidence: [],
      requiredTools: ["optional-web-research-adapter"],
      localOnly: false,
      freeCoreSafe: false,
      requiresCloud: true
    });

    const assessment = registry.assessCapability("external-web-research");
    expect(assessment.ok).toBe(false);
    expect(assessment.freeCoreSafe).toBe(false);
    expect(assessment.blockers).toContain("requires_cloud");
    expect(assessment.attentionRequired).toBe(true);
  });

  it("writes local summary artifacts without requiring paid providers or cloud", async () => {
    const root = tempRoot();
    const { CapabilityRegistrySkillGraph } = await loadCapabilityRegistry();
    const registry = new CapabilityRegistrySkillGraph({ rootDir: root });
    registry.initialize();

    registry.registerCapability({
      id: "tool-governance",
      name: "Tool Governance",
      status: "available",
      currentLevel: "certified",
      certificationStatus: "certified",
      evidence: ["tests/integration/tool-plugin-registry-v1.test.ts"],
      requiredTools: ["tool-plugin-registry-v1"]
    });

    const summary = registry.writeSummaryArtifacts();
    expect(summary.ok).toBe(true);
    expect(summary.localOnly).toBe(true);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});
