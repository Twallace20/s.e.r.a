import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { baseMvpPolicy, capabilityClaimRegistry } from "@sera/portable-base-mvp";

describe("Capability Claim and Proof Standard v1", () => {
  it("keeps all capability claims tied to proof requirements", () => {
    const registry = capabilityClaimRegistry();

    expect(registry.schemaVersion).toBe("sera.capability-claim-proof-registry.v1");
    expect(registry.registryVersion).toBe("portable-offline-base-mvp-v1");
    expect(registry.modelUse).toBe(false);
    expect(registry.publicNetworkUse).toBe(false);
    expect(registry.claims.length).toBeGreaterThanOrEqual(3);

    for (const claim of registry.claims) {
      expect(claim.claimId.length).toBeGreaterThan(0);
      expect(claim.statement.length).toBeGreaterThan(0);
      expect(claim.proofRequired.length).toBeGreaterThan(0);
      expect(["implemented", "candidate", "blocked"]).toContain(claim.status);
      expect(claim.authorityBoundary.length).toBeGreaterThan(0);
    }
  });

  it("records the clean environment launch claim as blocked until external proof exists", () => {
    const registry = capabilityClaimRegistry();
    const cleanLaunch = registry.claims.find((claim) => claim.claimId === "clean-environment-offline-launch");

    expect(cleanLaunch).toBeDefined();
    expect(cleanLaunch?.status).toBe("blocked");
    expect(cleanLaunch?.proofRequired).toContain("external-clean-environment-run");
  });

  it("matches the checked-in architecture registry", () => {
    const registryPath = path.resolve("architecture", "capability-claim-proof-registry-v1.json");
    const checkedIn = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    const generated = capabilityClaimRegistry();

    expect(checkedIn.schemaVersion).toBe(generated.schemaVersion);
    expect(checkedIn.registryVersion).toBe(generated.registryVersion);
    expect(checkedIn.claims.map((claim: { claimId: string }) => claim.claimId)).toEqual(generated.claims.map((claim) => claim.claimId));
  });

  it("states that models have no approval, execution, or certification authority", () => {
    const policy = baseMvpPolicy() as { modelOutputAuthority: string; operatorReviewRequired: boolean; blockedClaimsRemainBlocked: boolean; automaticModelPullAllowed: boolean; publicNetworkAllowed: boolean };

    expect(policy.modelOutputAuthority).toBe("none");
    expect(policy.operatorReviewRequired).toBe(true);
    expect(policy.blockedClaimsRemainBlocked).toBe(true);
    expect(policy.automaticModelPullAllowed).toBe(false);
    expect(policy.publicNetworkAllowed).toBe(false);
  });
});
