#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  assertNoPreseed,
  assertPhase195Contract,
  buildCommandPayload,
  buildPlanProof,
  findNewestExactFilenameElementScript,
  loadPhase195Command,
  readSavedChatGptTarget,
  snapshotDownloadDir,
  verifyExactZip,
  writePhase195Proof,
  type Phase195Proof,
} from "../src/chatgpt/phase195FullAutopilotColdRun";

interface CliOptions {
  commandPath: string;
  savedUrlFile: string;
  chromeWsFile: string;
  downloadDir: string;
  proofPath: string;
  execute: boolean;
  planOnly: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    commandPath: "commands/phase195-full-autopilot-cold-run-v1.command.json",
    savedUrlFile: ".sera-local/saved-chatgpt-target.json",
    chromeWsFile: "chrome-ws.json",
    downloadDir: "13_chatgpt_downloads",
    proofPath: ".sera-proof/phase195_full_autopilot_cold_run_v1_runtime_proof.json",
    execute: false,
    planOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--command") { opts.commandPath = next; i += 1; continue; }
    if (arg === "--saved-url-file") { opts.savedUrlFile = next; i += 1; continue; }
    if (arg === "--chrome-ws-file") { opts.chromeWsFile = next; i += 1; continue; }
    if (arg === "--download-dir") { opts.downloadDir = next; i += 1; continue; }
    if (arg === "--proof") { opts.proofPath = next; i += 1; continue; }
    if (arg === "--execute") { opts.execute = true; continue; }
    if (arg === "--plan-only") { opts.planOnly = true; continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (opts.execute && opts.planOnly) {
    throw new Error("Use either --execute or --plan-only, not both.");
  }

  return opts;
}

async function executeColdRun(opts: CliOptions): Promise<Phase195Proof> {
  const command = loadPhase195Command(opts.commandPath);
  assertPhase195Contract(command);
  const target = readSavedChatGptTarget(opts.savedUrlFile);
  const downloadDir = path.resolve(opts.downloadDir);
  const snapshot = snapshotDownloadDir(downloadDir, command.expectedZipFilename);
  assertNoPreseed(snapshot);

  if (!fs.existsSync(opts.chromeWsFile)) {
    throw new Error(`Chrome websocket file not found: ${opts.chromeWsFile}. Launch Chrome debug before executing.`);
  }

  const wsUrl = fs.readFileSync(opts.chromeWsFile, "utf8").trim();
  if (!wsUrl) throw new Error(`Chrome websocket file was empty: ${opts.chromeWsFile}`);

  const { chromium } = await import("playwright");
  const browser = await chromium.connectOverCDP(wsUrl);
  const context = browser.contexts()[0] ?? await browser.newContext({ acceptDownloads: true });
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 90000 });
  if (!page.url().includes("/c/")) {
    throw new Error(`Navigation did not remain on a saved conversation URL. Current URL: ${page.url()}`);
  }

  const payload = buildCommandPayload(command);
  const input = page.locator('div[contenteditable="true"]').last();
  await input.waitFor({ timeout: 90000 });
  await input.fill(payload);
  await page.keyboard.press("Enter");

  await page.waitForFunction(
    ({ expected, script }) => {
      // eslint-disable-next-line no-eval
      return Boolean(eval(script));
    },
    { expected: command.expectedZipFilename, script: findNewestExactFilenameElementScript(command.expectedZipFilename) },
    { timeout: 300000 },
  );

  const downloadPromise = page.waitForEvent("download", { timeout: 300000 });
  await page.evaluate((expected) => {
    const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], [data-testid], div, span'));
    const matches = candidates.filter((el) => {
      const text = (el.textContent || "").trim();
      const aria = el.getAttribute("aria-label") || "";
      const title = el.getAttribute("title") || "";
      const href = el.getAttribute("href") || "";
      return text.includes(expected) || aria.includes(expected) || title.includes(expected) || href.includes(expected);
    });
    const chosen = matches[matches.length - 1] as HTMLElement | undefined;
    if (!chosen) throw new Error(`Exact expected ZIP control not found in DOM: ${expected}`);
    chosen.scrollIntoView({ block: "center", inline: "center" });
    chosen.click();
  }, command.expectedZipFilename);

  const download = await downloadPromise;
  const suggested = download.suggestedFilename();
  if (suggested !== command.expectedZipFilename) {
    throw new Error(`Downloaded filename mismatch. Expected ${command.expectedZipFilename}, received ${suggested}`);
  }

  const zipPath = path.join(downloadDir, command.expectedZipFilename);
  await download.saveAs(zipPath);
  const verified = verifyExactZip(downloadDir, command.expectedZipFilename);

  return {
    ok: true,
    phaseSlug: command.phaseSlug,
    commandId: command.commandId,
    runNonce: command.runNonce,
    expectedZipFilename: command.expectedZipFilename,
    savedChatGptTargetOnly: true,
    allowRandomRecentChatFallback: false,
    allowNewChatFallback: false,
    savedTargetUrl: target.url,
    downloadDir,
    zipPath: verified.zipPath,
    sha256: verified.sha256,
    gates: [
      { name: "contract_exact", ok: true, detail: "Command JSON matched Phase 195 contract." },
      { name: "saved_chatgpt_target_only", ok: true, detail: target.url },
      { name: "no_preseed", ok: true, detail: "Expected ZIP was absent before run snapshot." },
      { name: "no_manual_download", ok: true, detail: "Download captured through browser download event." },
      { name: "exact_filename", ok: true, detail: command.expectedZipFilename },
      { name: "sha256", ok: true, detail: verified.sha256 },
    ],
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const command = loadPhase195Command(opts.commandPath);
  assertPhase195Contract(command);
  const target = readSavedChatGptTarget(opts.savedUrlFile);
  const snapshot = snapshotDownloadDir(path.resolve(opts.downloadDir), command.expectedZipFilename);
  assertNoPreseed(snapshot);

  if (opts.planOnly || !opts.execute) {
    const proof = buildPlanProof({ command, target, downloadDir: path.resolve(opts.downloadDir), snapshot });
    writePhase195Proof(opts.proofPath, proof);
    console.log(JSON.stringify(proof, null, 2));
    return;
  }

  const proof = await executeColdRun(opts);
  writePhase195Proof(opts.proofPath, proof);
  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
