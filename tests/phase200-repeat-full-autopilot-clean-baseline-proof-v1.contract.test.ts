import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.join(root, 'scripts/phase200-repeat-full-autopilot-clean-baseline-proof-v1.contract.json'), 'utf8'));
if (contract.phase !== 200) throw new Error('phase mismatch');
if (contract.phaseSlug !== 'phase200_repeat_full_autopilot_clean_baseline_proof_v1') throw new Error('phaseSlug mismatch');
if (contract.gates.manualZipDownloadAllowed !== false) throw new Error('manual ZIP download must be false');
if (contract.gates.midRunRepairsAllowed !== false) throw new Error('Phase200 mid-run repairs must be false');
for (const gate of ['confirmedPromptSubmit','exactDomDownload','verifierBeforeQa','qaBeforeMerge','remoteTruthBeforeClosedCleanly','cleanRepoBeforeReadyForNextPhase']) {
  if (contract.gates[gate] !== true) throw new Error(`missing required gate: ${gate}`);
}
console.log('PHASE200_CONTRACT_TEST_PASS');
