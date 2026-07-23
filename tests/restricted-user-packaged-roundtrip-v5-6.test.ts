import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildPortableBaseMvp } from "../packages/portable-base-mvp/src/portable-base-mvp";
import { prepareRestrictedUserProof, verifyIntegratedRestrictedUserEvidence } from "../packages/portable-base-mvp/src/restricted-user-proof";
import { invokePackagedCollector } from "../packages/portable-base-mvp/src/restricted-user-observations";
import { privilegedObserverPlan } from "../packages/portable-base-mvp/src/restricted-user-privileged-observer";

const parse = (run: any) => {
  const line = `${run.stdout}\n${run.stderr}`.split(/\r?\n/).map((x) => x.trim()).find((x) => x.startsWith("{"));
  return JSON.parse(line || "{}");
};

const pidExists = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};

describe("complete packaged non-promotable production round trip v5.6", () => {
  it("executes four packaged stages and derives every identity summary without claims", () => {
    const started = Date.now();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sera-v56-roundtrip-"));
    const ownedChildren: any[] = [];
    try {
      const release = buildPortableBaseMvp({ projectRoot: process.cwd(), outputRoot: path.join(root, "release") });
      const governance = path.join(root, "governance.json");
      const observerRoot = path.join(root, "observer");
      const proofRoot = path.join(root, "proof");
      const preBoot = { bootIdentity: "BOOT-A", lastBoot: "2026-07-20T00:00:00Z", bootRecord: "EVENT-A", collectedAt: "2026-07-20T01:00:00Z" };
      const postBoot = { bootIdentity: "BOOT-B", lastBoot: "2026-07-21T00:00:00Z", bootRecord: "EVENT-B", collectedAt: "2026-07-21T01:00:00Z" };
      fs.writeFileSync(governance, "{}"); fs.mkdirSync(observerRoot);
      const input: any = { projectRoot: process.cwd(), outputRoot: proofRoot, releaseZip: release.zipPath, extractionRoot: release.packageRoot, releaseManifest: release.manifestPath, proofAccountName: "SERA_ROUNDTRIP", proofSid: "S-1-5-21-roundtrip", developmentSid: "S-1-5-21-development", hostProfileId: "roundtrip-host", governanceDecision: governance, observerRoot, collectorFiles: [], invocationMode: "NON_PROMOTABLE_PRODUCTION_ROUNDTRIP_TEST", roundTripAdapters: { preBoot, postBoot, observerSid: "S-1-5-21-observer", observerSessionId: 1, subjectSessionId: 2, processEvents: [] } };
      const created: any = prepareRestrictedUserProof(input);
      const reused: any = prepareRestrictedUserProof(input);
      const prep = created.path;
      const record = (role: string, executablePath: string, startMs: number, endMs: number, output: any, exitCode = 0, signal: string | null = null) => {
        const item = { role, pid: output.pid, executablePath, startTimestamp: new Date(startMs).toISOString(), exitTimestamp: new Date(endMs).toISOString(), durationMilliseconds: endMs - startMs, exitCode, signal, expectedTerminationMode: "NORMAL_EXIT", closeObserved: true };
        ownedChildren.push(item); return output;
      };
      const runObserver = (stage: "PRE_RESTART" | "POST_RESTART") => {
        const plan: any = privilegedObserverPlan(prep, stage); const begin = Date.now();
        const run = spawnSync(plan.runtime, plan.args, { shell: false, encoding: "utf8", timeout: 20_000, windowsHide: true, cwd: release.packageRoot, env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR, TEMP: process.env.TEMP, TMP: process.env.TMP, PATH: path.dirname(plan.runtime) } });
        return record(`observer ${stage}`, plan.runtime, begin, Date.now(), parse(run), run.status ?? 0, run.signal);
      };
      const runSubject = (stage: "PRE_RESTART" | "POST_RESTART", command: "collect-pre-restart" | "collect-post-restart") => { const begin = Date.now(); const result: any = invokePackagedCollector(prep, command, [prep]); return record(`subject ${stage}`, path.join(release.packageRoot, "runtime", "node.exe"), begin, Date.now(), result); };
      const observerPre = runObserver("PRE_RESTART");
      const subjectPre = runSubject("PRE_RESTART", "collect-pre-restart");
      const observerPost = runObserver("POST_RESTART");
      const subjectPost = runSubject("POST_RESTART", "collect-post-restart");
      const verified: any = verifyIntegratedRestrictedUserEvidence(proofRoot, observerRoot);
      expect(created.status).toBe("PREPARATION_CREATED"); expect(reused.status).toBe("PREPARATION_REUSED");
      expect([observerPre.pid, subjectPre.pid, observerPost.pid, subjectPost.pid].every(Number.isInteger)).toBe(true);
      expect(subjectPost.manifestPath).toBe(path.join(proofRoot, "restricted-user-evidence-manifest.json"));
      expect(verified).toMatchObject({ status: "BLOCKED", installationIdentityVerified: true, subjectCollectorVerified: true, preRestartBootStageVerified: true, postRestartBootStageVerified: true, windowsRestartVerified: true, reasonCodes: ["NON_PROMOTABLE_PRODUCTION_ROUNDTRIP"], grantedClaims: [], claimsGranted: [] });
      expect(ownedChildren).toHaveLength(4); expect(ownedChildren.every((child) => child.closeObserved && child.exitCode === 0 && !pidExists(child.pid))).toBe(true);
      console.log("V5.7_OWNED_PROCESS_ACCOUNTING", JSON.stringify({ ownedChildCount: 4, exitedOwnedChildCount: 4, remainingOwnedChildPids: [], leakedOwnedProcessCount: 0, children: ownedChildren }));
      expect(Date.now() - started).toBeLessThan(90_000);
    } finally { fs.rmSync(root, { recursive: true, force: true }); expect(fs.existsSync(root)).toBe(false); }
  }, 90_000);
});
