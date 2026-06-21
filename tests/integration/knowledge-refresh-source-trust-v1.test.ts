import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function loadSourceTrust() {
  return await import("../../scripts/lib/knowledge-refresh-source-trust-v1.mjs");
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sera-source-trust-test-"));
}

describe("Knowledge Refresh + Source Trust v1", () => {
  it("initializes local source trust runtime artifacts", async () => {
    const root = tempRoot();
    const { KnowledgeRefreshSourceTrust } = await loadSourceTrust();
    const trust = new KnowledgeRefreshSourceTrust({ rootDir: root });
    const init = trust.initialize();

    expect(init.ok).toBe(true);
    expect(fs.existsSync(init.eventPath)).toBe(true);
    expect(fs.existsSync(init.registryDir)).toBe(true);
    expect(fs.existsSync(init.reportDir)).toBe(true);
  });

  it("creates a source trust registry connected to domain learning packs", async () => {
    const root = tempRoot();
    const { KnowledgeRefreshSourceTrust } = await loadSourceTrust();
    const trust = new KnowledgeRefreshSourceTrust({ rootDir: root });
    trust.initialize();
    const registry = trust.createDefaultRegistry();

    expect(registry.registryVersion).toBe(1);
    expect(registry.sources.length).toBeGreaterThanOrEqual(8);
    expect(registry.domainLearningPacks.packCount).toBeGreaterThanOrEqual(5);
    expect(registry.refreshPolicy.allowNetworkRefresh).toBe(false);
    expect(fs.existsSync(trust.defaultRegistryPath)).toBe(true);
  });

  it("validates trust levels, freshness states, evidence requirements, and approval boundaries", async () => {
    const root = tempRoot();
    const { KnowledgeRefreshSourceTrust } = await loadSourceTrust();
    const trust = new KnowledgeRefreshSourceTrust({ rootDir: root });
    trust.initialize();
    const registry = trust.createDefaultRegistry();
    const validation = trust.validateRegistry(registry);

    expect(validation.ok).toBe(true);
    expect(validation.failedCount).toBe(0);
    expect(registry.sources.every((source) => source.evidenceRequired === true)).toBe(true);
    expect(registry.sources.every((source) => source.sourceMutationAllowed === false)).toBe(true);
    expect(registry.sources.every((source) => source.networkRefreshAllowed === false)).toBe(true);
    expect(registry.boundaries.ownerApprovalRequiredForTrustChanges).toBe(true);
  });

  it("summarizes trusted, generated, and review-required sources", async () => {
    const root = tempRoot();
    const { KnowledgeRefreshSourceTrust } = await loadSourceTrust();
    const trust = new KnowledgeRefreshSourceTrust({ rootDir: root });
    trust.initialize();
    const registry = trust.createDefaultRegistry();
    const summary = trust.summarizeRegistry(registry);

    expect(summary.ok).toBe(true);
    expect(summary.trustedSourceCount).toBeGreaterThanOrEqual(6);
    expect(summary.reviewRequiredSourceCount).toBeGreaterThanOrEqual(1);
    expect(summary.generatedSourceCount).toBeGreaterThanOrEqual(1);
    expect(summary.missingEvidenceSourceIds).toEqual([]);
    expect(summary.staleWithoutReviewSourceIds).toEqual([]);
  });

  it("writes source trust evidence reports without network refresh, paid providers, cloud, secrets, arbitrary execution, or source mutation", async () => {
    const root = tempRoot();
    const { KnowledgeRefreshSourceTrust } = await loadSourceTrust();
    const trust = new KnowledgeRefreshSourceTrust({ rootDir: root });
    const summary = trust.writeSummaryArtifacts();

    expect(summary.ok).toBe(true);
    expect(summary.sourceCount).toBeGreaterThanOrEqual(8);
    expect(summary.paidProviderRequired).toBe(false);
    expect(summary.cloudRequired).toBe(false);
    expect(summary.requiresSecrets).toBe(false);
    expect(summary.mutatesSource).toBe(false);
    expect(summary.executesArbitraryCode).toBe(false);
    expect(summary.performsNetworkRefresh).toBe(false);
    expect(summary.ownerApprovalRequiredForTrustChanges).toBe(true);
    expect(summary.staleSourceUseAllowedWithoutReview).toBe(false);
    expect(fs.existsSync(summary.jsonPath)).toBe(true);
    expect(fs.existsSync(summary.markdownPath)).toBe(true);
    expect(fs.existsSync(summary.historyPath)).toBe(true);
  });
});
