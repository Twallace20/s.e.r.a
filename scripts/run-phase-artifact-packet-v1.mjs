#!/usr/bin/env node
import { PhaseArtifactPacket } from "./lib/phase-artifact-packet-v1.mjs";

const packet = new PhaseArtifactPacket({ rootDir: process.cwd() });
const init = packet.initialize();
const manifest = packet.createManifest();
const summary = packet.writeSummaryArtifacts({ sampleManifestCreated: true });

const output = {
  ok: summary.ok,
  status: summary.status,
  init,
  manifestPath: summary.manifestPath,
  packetId: summary.packetId,
  branchName: summary.branchName,
  fileCount: summary.fileCount,
  validationCommandCount: summary.validationCommandCount,
  checkCount: summary.checkCount,
  passedCount: summary.passedCount,
  failedCount: summary.failedCount,
  blockers: summary.blockers,
  jsonPath: summary.jsonPath,
  markdownPath: summary.markdownPath,
  historyPath: summary.historyPath,
  localOnly: summary.localOnly,
  paidProviderRequired: summary.paidProviderRequired,
  cloudRequired: summary.cloudRequired,
  freeCoreDependency: summary.freeCoreDependency,
  mutatesSource: summary.mutatesSource,
  requiresSecrets: summary.requiresSecrets,
  ownerApprovalRequiredForApply: summary.ownerApprovalRequiredForApply,
  ownerApprovalRequiredForMerge: summary.ownerApprovalRequiredForMerge,
  declaredFiles: manifest.files,
  validationCommands: manifest.validationCommands
};

if (!output.ok) {
  console.error("S.E.R.A. phase25C phase artifact packet v1: FAIL");
  console.error(JSON.stringify(output, null, 2));
  process.exit(1);
}

console.log("S.E.R.A. phase25C phase artifact packet v1: PASS");
console.log(JSON.stringify(output, null, 2));
