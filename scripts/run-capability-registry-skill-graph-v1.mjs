#!/usr/bin/env node
import { CapabilityRegistrySkillGraph } from "./lib/capability-registry-skill-graph-v1.mjs";

const registry = new CapabilityRegistrySkillGraph({ rootDir: process.cwd() });
const init = registry.initialize();

const capabilities = [
  registry.registerCapability({
    id: "local-knowledge-search",
    name: "Local Knowledge Search",
    version: "0.1.0",
    domain: "knowledge",
    status: "available",
    currentLevel: "certified",
    certificationStatus: "certified",
    description: "Searches indexed local knowledge and returns local evidence hits.",
    evidence: ["tests/integration/knowledge.test.ts", "docs/phases/PHASE_9_KNOWLEDGE_INGESTION_RETRIEVAL_V1.md"],
    requiredTools: [],
    requiredKnowledge: ["docs/knowledge/SOURCE_MAP.md"],
    lastSuccessfulRun: "npm run knowledge:verify",
    nextImprovementTarget: "semantic-memory-indexing",
    confidence: 0.9
  }),
  registry.registerCapability({
    id: "research-answers-with-citations",
    name: "Research Answers With Local Citations",
    version: "0.1.0",
    domain: "research",
    status: "available",
    currentLevel: "certified",
    certificationStatus: "certified",
    description: "Answers, compares, and summarizes from local indexed knowledge with citations and uncertainty boundaries.",
    evidence: ["tests/integration/research-knowledge-worker.test.ts", "docs/phases/PHASE_21_RESEARCH_KNOWLEDGE_WORKER_V1.md"],
    knownLimitations: ["local evidence only", "no live web browsing in the free core"],
    requiredTools: ["research-knowledge-worker-v1", "local-knowledge-search"],
    requiredKnowledge: ["docs/knowledge/SOURCE_MAP.md"],
    lastSuccessfulRun: "npm run phase21:verify",
    nextImprovementTarget: "semantic-memory-retrieval-quality",
    confidence: 0.86
  }),
  registry.registerCapability({
    id: "validation-gated-code-change",
    name: "Validation-Gated Code Change",
    version: "0.1.0",
    domain: "development",
    status: "available",
    currentLevel: "certified",
    certificationStatus: "certified",
    description: "Proposes and applies source changes behind validation and rollback gates.",
    evidence: ["tests/integration/developer-worker-v2.test.ts", "tests/integration/multi-file-dev-worker.test.ts"],
    knownLimitations: ["requires explicit validation gate", "does not bypass path safety"],
    requiredTools: ["developer-worker-v2"],
    requiredKnowledge: ["docs/architecture/PACKAGE_BOUNDARIES.md"],
    lastSuccessfulRun: "npm test",
    nextImprovementTarget: "eval-harness-for-code-quality",
    confidence: 0.82
  }),
  registry.registerCapability({
    id: "tool-governance",
    name: "Tool Governance",
    version: "0.1.0",
    domain: "governance",
    status: "available",
    currentLevel: "certified",
    certificationStatus: "certified",
    description: "Tracks tools, permissions, free-core boundaries, and optional external adapter status.",
    evidence: ["tests/integration/tool-plugin-registry-v1.test.ts", "docs/phases/PHASE_24_TOOL_PLUGIN_REGISTRY_V1.md"],
    requiredTools: ["tool-plugin-registry-v1"],
    requiredKnowledge: ["docs/roadmap/CERTIFICATION_LADDER.md"],
    lastSuccessfulRun: "npm run phase24:verify",
    nextImprovementTarget: "capability-aware tool recommendations",
    confidence: 0.88
  }),
  registry.registerCapability({
    id: "external-web-research",
    name: "External Web Research",
    version: "0.0.0",
    domain: "research",
    status: "planned",
    currentLevel: "none",
    certificationStatus: "uncertified",
    description: "Future optional web research adapter capability. It is outside the free/local core until explicitly approved.",
    evidence: [],
    knownLimitations: ["requires network", "excluded from free-core certification", "must be optional and disabled by default"],
    requiredTools: ["optional-web-research-adapter"],
    requiredKnowledge: ["docs/governance/FREE_CORE_COVENANT.md"],
    lastSuccessfulRun: null,
    lastFailure: null,
    nextImprovementTarget: "manual-web-ingestion-first",
    localOnly: false,
    freeCoreSafe: false,
    requiresPaidProvider: false,
    requiresCloud: true,
    confidence: 0.1
  })
];

registry.linkCapabilities("research-answers-with-citations", "local-knowledge-search", "requires", ["Research worker requires indexed local knowledge."]);
registry.linkCapabilities("validation-gated-code-change", "tool-governance", "requires", ["Mutation-capable tools must be governed by tool metadata."]);
registry.linkCapabilities("tool-governance", "external-web-research", "blocks", ["Optional external web research remains disabled outside the free core."]);
registry.linkCapabilities("research-answers-with-citations", "external-web-research", "related_to", ["External web research is a future optional adapter, not a Phase 25 dependency."]);

const summary = registry.writeSummaryArtifacts();

const output = {
  ok: summary.ok,
  status: summary.status,
  init,
  capabilityPath: summary.capabilityPath,
  skillGraphPath: summary.skillGraphPath,
  capabilityCount: summary.capabilityCount,
  graphNodeCount: summary.graphNodeCount,
  graphEdgeCount: summary.graphEdgeCount,
  certifiedCount: summary.certifiedCount,
  learningCount: summary.learningCount,
  plannedCount: summary.plannedCount,
  blockedCount: summary.blockedCount,
  freeCoreSafeCount: summary.freeCoreSafeCount,
  localOnlyCount: summary.localOnlyCount,
  attentionRequiredCount: summary.attentionRequiredCount,
  jsonPath: summary.jsonPath,
  markdownPath: summary.markdownPath,
  historyPath: summary.historyPath,
  localOnly: summary.localOnly,
  paidProviderRequired: summary.paidProviderRequired,
  cloudRequired: summary.cloudRequired,
  capabilityIds: summary.capabilityIds,
  attentionCapabilityIds: summary.attentionCapabilityIds
};

if (!output.ok) {
  console.error("S.E.R.A. phase25 capability registry skill graph v1: FAIL");
  console.error(JSON.stringify(output, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase25 capability registry skill graph v1: PASS");
console.log(JSON.stringify(output, null, 2));
