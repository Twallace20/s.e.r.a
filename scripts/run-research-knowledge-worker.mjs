#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SeraKernel } = require("../packages/kernel/dist/index.js");

const rootDir = process.cwd();
const kernelDist = path.join(rootDir, "packages", "kernel", "dist", "index.js");

function fail(message, detail) {
  console.error(`S.E.R.A. phase21 research knowledge worker: FAIL ${message}`);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  process.exit(1);
}

if (!fs.existsSync(kernelDist)) {
  fail("kernel dist file missing. Run npm run build before Phase 21 demo.");
}

const kernel = new SeraKernel({ rootDir });
const seedSources = [
  ["README.md", "S.E.R.A. README"],
  ["docs/roadmap/NEXT_EVOLUTION_ROADMAP.md", "Next Evolution Roadmap"],
  ["docs/phases/PHASE_21_RESEARCH_KNOWLEDGE_WORKER_V1.md", "Phase 21 Documentation"],
  ["packages/research/src/research-knowledge-worker.ts", "Research Knowledge Worker Source"]
];

for (const [relativePath, title] of seedSources) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) fail(`missing seed source ${relativePath}`);
  const result = kernel.ingestKnowledgeFile({ relativePath, title });
  if (!result.ok) fail(`could not ingest ${relativePath}`, result);
}

const answer = kernel.answerResearchQuestion("research knowledge worker local evidence citations", 6);
if (!answer.ok || answer.citations.length < 1) fail("answer did not use local citations", answer);
if (!answer.limitation.includes("indexed local")) fail("answer did not include local evidence limitation", answer);
if (!answer.recordPath || !answer.reportPath) fail("answer did not write research artifacts", answer);

const comparison = kernel.compareResearchKnowledge("Phase 21 research knowledge worker", 8);
if (!comparison.ok || comparison.documents.length < 2) fail("comparison did not compare multiple local documents", comparison);

const summary = kernel.summarizeResearchKnowledge("local research evidence", 6);
if (!summary.ok || summary.citations.length < 1) fail("summary did not use local citations", summary);

const history = kernel.listResearchKnowledgeHistory("answers");
if (!history.ok || !history.answers || history.answers.length < 1) fail("research answer history missing", history);

const storeSummary = kernel.getResearchKnowledgeSummary();
if (!storeSummary.ok || storeSummary.summary.answerCount < 1 || storeSummary.summary.comparisonCount < 1 || storeSummary.summary.summaryCount < 1) {
  fail("research summary counts missing Phase 21 activity", storeSummary);
}

const missing = kernel.answerResearchQuestion("zzzz_no_local_phase21_evidence_should_match", 3);
if (missing.ok || missing.status !== "insufficient_evidence") fail("missing evidence query must not produce a fabricated answer", missing);

console.log("S.E.R.A. phase21 research knowledge worker: PASS");
console.log(JSON.stringify({
  ok: true,
  status: "completed",
  answerCitationCount: answer.citations.length,
  comparisonDocumentCount: comparison.documents.length,
  summaryCitationCount: summary.citations.length,
  answerRecordPath: answer.recordPath,
  answerReportPath: answer.reportPath,
  comparisonRecordPath: comparison.recordPath,
  summaryRecordPath: summary.recordPath,
  researchSummaryPath: storeSummary.summaryPath,
  missingEvidenceStatus: missing.status
}, null, 2));
