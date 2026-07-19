import { describe, expect, it } from "vitest";

type LedgerModule = typeof import("../scripts/lib/validation-ledger-v1.mjs");

async function ledger(): Promise<LedgerModule> {
  return import("../scripts/lib/validation-ledger-v1.mjs");
}

function baseEvidence() {
  return {
    schemaVersion: "sera.validation-ledger.v1",
    validationId: "validation_test",
    createdAt: "2026-07-18T00:00:00.000Z",
    currentGitCommit: "abc123",
    currentGitCommitFull: "abc123full",
    currentBranch: "milestone-16-portable-offline-base-mvp-v1",
    sourceTreeDigest: "source-digest",
    sourceTreeEntryCount: 10,
    packageLockDigest: "lock-digest",
    dirtyTreeState: { dirty: true, statusShort: " M package.json" },
    cleanTree: false,
    commands: [
      { component: "hygiene", exitCode: 0 },
      { component: "free-core", exitCode: 0 },
      { component: "knowledge", exitCode: 0 },
      { component: "build", exitCode: 0 },
      { component: "vitest", exitCode: 0 }
    ],
    buildResult: "PASS",
    testFileCount: 153,
    testCount: 2210,
    testResult: "PASS",
    environmentProfile: { nodeVersion: "v24.0.0", platform: "win32", architecture: "x64" },
    requiredComponents: ["hygiene", "free-core", "knowledge", "build", "vitest"],
    modelUse: false,
    publicNetworkUse: false
  };
}

function expectations() {
  return {
    currentGitCommitFull: "abc123full",
    currentBranch: "milestone-16-portable-offline-base-mvp-v1",
    sourceTreeDigest: "source-digest",
    packageLockDigest: "lock-digest",
    dirtyTreeState: { dirty: true, statusShort: " M package.json" }
    ,cleanTree: false
  };
}

describe("Validation Ledger v1 evidence verifier", () => {
  it.each([
    ["plain LF", " Test Files  154 passed (154)\n      Tests  2234 passed (2234)\n"],
    ["ANSI", "\u001b[2m Test Files \u001b[22m \u001b[32m154 passed\u001b[39m (154)\n\u001b[2m      Tests \u001b[22m \u001b[32m2234 passed\u001b[39m (2234)\n"],
    ["CRLF", " Test Files  154 passed (154)\r\n      Tests  2234 passed (2234)\r\n"]
  ])("parses %s Vitest summaries", async (_name, stdoutTail) => {
    const { parseVitest } = await ledger();
    expect(parseVitest({ exitCode: 0, stdoutTail, stderrTail: "" })).toMatchObject({ testFileCount: 154, testCount: 2234, testFileCountParsed: true, testCountParsed: true, summaryParsed: true, passed: true });
  });

  it("rejects successful commands with unparseable or zero-count summaries", async () => {
    const { parseVitest } = await ledger();
    expect(parseVitest({ exitCode: 0, stdoutTail: "all good", stderrTail: "" }).passed).toBe(false);
    expect(parseVitest({ exitCode: 0, stdoutTail: "Test Files  0 passed (0)\nTests  1 passed (1)", stderrTail: "" }).passed).toBe(false);
    expect(parseVitest({ exitCode: 0, stdoutTail: "Test Files  1 passed (1)\nTests  0 passed (0)", stderrTail: "" }).passed).toBe(false);
  });

  it("requires parsed positive test evidence and a successful test command", async () => {
    const { validationEvidenceOutcome } = await ledger();
    expect(validationEvidenceOutcome({ ...baseEvidence(), testResult: undefined }).ok).toBe(false);
    expect(validationEvidenceOutcome({ ...baseEvidence(), testFileCount: 0 }).ok).toBe(false);
    expect(validationEvidenceOutcome({ ...baseEvidence(), testCount: 0 }).ok).toBe(false);
    const failedCommand = { ...baseEvidence(), commands: baseEvidence().commands.map((command) => command.component === "vitest" ? { ...command, exitCode: 1 } : command) };
    expect(validationEvidenceOutcome(failedCommand).ok).toBe(false);
  });

  it("accepts matching dirty-tree evidence for development inspection only", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };

    expect(verifyValidationEvidence(signed, expectations()).ok).toBe(true);
  });

  it("rejects matching dirty evidence for certification and does not promote it later", async () => {
    const { CLEAN_TREE_REQUIRED_CODE, finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };
    const currentClean = { ...expectations(), cleanTree: true, dirtyTreeState: { dirty: false, statusShort: "" } };
    const sameDirty = verifyValidationEvidence(signed, expectations(), { requireCleanTree: true });
    const laterClean = verifyValidationEvidence(signed, currentClean, { requireCleanTree: true });
    expect(sameDirty.ok).toBe(false);
    expect(sameDirty.failureCode).toBe(CLEAN_TREE_REQUIRED_CODE);
    expect(laterClean.checks.evidenceCreatedFromCleanTree).toBe(false);
  });

  it.each([
    ["staged", "M  package.json"], ["unstaged", " M package.json"], ["untracked", "?? new-source.ts"],
    ["deletion", " D source.ts"], ["conflict", "UU source.ts"]
  ])("rejects %s current-tree state", async (_name, statusShort) => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const clean = { ...baseEvidence(), cleanTree: true, dirtyTreeState: { dirty: false, statusShort: "" } };
    const signed = { ...clean, finalEvidenceDigest: finalEvidenceDigest(clean) };
    const expected = { ...expectations(), cleanTree: false, dirtyTreeState: { dirty: true, statusShort } };
    expect(verifyValidationEvidence(signed, expected, { requireCleanTree: true }).checks.currentTreeClean).toBe(false);
  });

  it("accepts clean matching evidence for certification", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const clean = { ...baseEvidence(), cleanTree: true, dirtyTreeState: { dirty: false, statusShort: "" } };
    const expected = { ...expectations(), cleanTree: true, dirtyTreeState: { dirty: false, statusShort: "" } };
    const signed = { ...clean, finalEvidenceDigest: finalEvidenceDigest(clean) };
    expect(verifyValidationEvidence(signed, expected, { requireCleanTree: true }).ok).toBe(true);
  });

  it("rejects contradictory and zero-count certification evidence", async () => {
    const { finalEvidenceDigest, validationEvidenceOutcome, verifyValidationEvidence } = await ledger();
    const expected = { ...expectations(), cleanTree: true, dirtyTreeState: { dirty: false, statusShort: "" } };
    const contradictoryBase = { ...baseEvidence(), cleanTree: true, dirtyTreeState: { dirty: false, statusShort: "" }, testResult: "FAIL", validationResult: { ok: true, checks: {}, failureReasons: [] } };
    const contradictory = { ...contradictoryBase, finalEvidenceDigest: finalEvidenceDigest(contradictoryBase) };
    expect(verifyValidationEvidence(contradictory, expected, { requireCleanTree: true }).checks.validationConsistency).toBe(false);
    const zeroBase: any = { ...baseEvidence(), cleanTree: true, dirtyTreeState: { dirty: false, statusShort: "" }, testFileCount: 0 };
    zeroBase.validationResult = validationEvidenceOutcome(zeroBase);
    const zero = { ...zeroBase, finalEvidenceDigest: finalEvidenceDigest(zeroBase) };
    expect(verifyValidationEvidence(zero, expected, { requireCleanTree: true }).checks.testsPassed).toBe(false);
  });

  it("ignores generated Runtime evidence for source-tree classification", async () => {
    const { relevantSourceInput } = await ledger();
    expect(relevantSourceInput(".sera/validation-ledger/latest.json")).toBe(false);
    expect(relevantSourceInput("dist/index.js")).toBe(false);
    expect(relevantSourceInput("src/new-source.ts")).toBe(true);
  });

  it("blocks missing ledger schema", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = { ...baseEvidence(), schemaVersion: "wrong" };
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };

    expect(verifyValidationEvidence(signed, expectations()).checks.schema).toBe(false);
  });

  it("blocks stale commit evidence", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };

    expect(verifyValidationEvidence(signed, { ...expectations(), currentGitCommitFull: "new" }).checks.commit).toBe(false);
  });

  it("blocks changed source file evidence", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };

    expect(verifyValidationEvidence(signed, { ...expectations(), sourceTreeDigest: "changed" }).checks.sourceTreeDigest).toBe(false);
  });

  it("blocks changed lockfile evidence", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };

    expect(verifyValidationEvidence(signed, { ...expectations(), packageLockDigest: "changed" }).checks.packageLockDigest).toBe(false);
  });

  it("blocks altered result content", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence), testCount: 1 };

    expect(verifyValidationEvidence(signed, expectations()).checks.digest).toBe(false);
  });

  it("blocks failed test result", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = { ...baseEvidence(), testResult: "FAIL" };
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };

    expect(verifyValidationEvidence(signed, expectations()).checks.testsPassed).toBe(false);
  });

  it("blocks evidence digest mismatch", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence).replace(/^./, "0") };

    expect(verifyValidationEvidence(signed, expectations()).checks.digest).toBe(false);
  });

  it("blocks dirty-tree mismatch", async () => {
    const { finalEvidenceDigest, verifyValidationEvidence } = await ledger();
    const evidence = baseEvidence();
    const signed = { ...evidence, finalEvidenceDigest: finalEvidenceDigest(evidence) };

    expect(verifyValidationEvidence(signed, { ...expectations(), dirtyTreeState: { dirty: false, statusShort: "" } }).checks.dirtyTreeState).toBe(false);
  });
});
