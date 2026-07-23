import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { normalizedTreeDigest, sha256File } from "./restricted-user-evidence";
import { buildSanitizedEnvironment } from "./restricted-user-environment";

export function collectReleaseObservation(input: { preparation: any; proofSid: string; sessionId: string; spawn?: typeof spawnSync }): any {
  const releaseRoot = fs.realpathSync(input.preparation.release.expectedExtractionRoot), runtimePath = fs.realpathSync(path.join(releaseRoot, "runtime", "node.exe"));
  if (!runtimePath.startsWith(`${releaseRoot}${path.sep}`) || releaseRoot.toLowerCase().startsWith(`${String(input.preparation.repository.canonicalPath).toLowerCase()}${path.sep}`)) throw new Error("RELEASE_BOUNDARY_INVALID");
  const manifestPath = input.preparation.release.releaseManifestPath, manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")), expectedRuntime = manifest.runtime;
  if (sha256File(runtimePath) !== expectedRuntime.sha256 || fs.statSync(runtimePath).size !== expectedRuntime.size) throw new Error("BUNDLED_RUNTIME_DIGEST_MISMATCH");
  const probeScript = `process.stdout.write(JSON.stringify({execPath:process.execPath,version:process.version,arch:process.arch,pid:process.pid,ppid:process.ppid,argv:process.argv,startedAt:new Date().toISOString()}))`;
  const run = (input.spawn ?? spawnSync)(runtimePath, ["-e", probeScript], { shell: false, encoding: "utf8", timeout: 10_000, windowsHide: true, cwd: releaseRoot, env: buildSanitizedEnvironment(process.env, path.dirname(runtimePath)) });
  if (run.status !== 0) throw new Error("BUNDLED_RUNTIME_EXECUTION_FAILED"); const observed = JSON.parse(run.stdout as string); if (fs.realpathSync(observed.execPath).toLowerCase() !== runtimePath.toLowerCase()) throw new Error("SYSTEM_NODE_REJECTED");
  return { releaseRoot, releaseRootIsUnc: releaseRoot.startsWith("\\\\"), zipSha256: sha256File(input.preparation.release.zipPath), releaseManifestDigest: sha256File(manifestPath), treeSha256: normalizedTreeDigest(releaseRoot), runtimeExists: true, runtimePath, runtimeSha256: sha256File(runtimePath), runtimeSize: fs.statSync(runtimePath).size, observedExecutablePath: observed.execPath, observedExecutableSha256: sha256File(observed.execPath), observedExecutableSize: fs.statSync(observed.execPath).size, execPath: observed.execPath, processVersion: observed.version, processArch: observed.arch, pid: observed.pid, parentPid: observed.ppid, arguments: observed.argv, startedAt: observed.startedAt, proofSid: input.proofSid, sessionId: input.sessionId, explicitReleaseRelativeLaunch: true, shellUsed: false, launcherKind: "packaged", releaseIdentity: input.preparation.release.releaseManifestDigest };
}
