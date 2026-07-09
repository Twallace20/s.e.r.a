import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface Phase195CommandContract {
  commandId: string;
  runNonce: string;
  phaseSlug: string;
  expectedZipFilename: string;
  savedChatGptTargetOnly: boolean;
  allowRandomRecentChatFallback: boolean;
  allowNewChatFallback: boolean;
}

export interface SavedChatGptTarget {
  url: string;
  sourceFile: string;
}

export interface DownloadSnapshot {
  directory: string;
  expectedZipFilename: string;
  expectedZipPresentBeforeRun: boolean;
  fileCountBeforeRun: number;
  capturedAt: string;
}

export interface Phase195Proof {
  ok: boolean;
  phaseSlug: string;
  commandId: string;
  runNonce: string;
  expectedZipFilename: string;
  savedChatGptTargetOnly: true;
  allowRandomRecentChatFallback: false;
  allowNewChatFallback: false;
  savedTargetUrl: string;
  downloadDir: string;
  zipPath?: string;
  sha256?: string;
  gates: Array<{ name: string; ok: boolean; detail: string }>;
  createdAt: string;
}

const REQUIRED: Phase195CommandContract = {
  commandId: "phase195-full-autopilot-cold-run-v1-fresh-url-20260709065602",
  runNonce: "phase195-fresh-url-cold-run-20260709065602",
  phaseSlug: "phase195_full_autopilot_cold_run_v1",
  expectedZipFilename: "s.e.r.a_phase195_full_autopilot_cold_run_v1_overlay.zip",
  savedChatGptTargetOnly: true,
  allowRandomRecentChatFallback: false,
  allowNewChatFallback: false,
};

export function loadPhase195Command(commandPath: string): Phase195CommandContract {
  const raw = fs.readFileSync(commandPath, "utf8");
  return JSON.parse(raw) as Phase195CommandContract;
}

export function assertPhase195Contract(command: Phase195CommandContract): void {
  const mismatches: string[] = [];
  for (const key of Object.keys(REQUIRED) as Array<keyof Phase195CommandContract>) {
    if (command[key] !== REQUIRED[key]) {
      mismatches.push(`${key}: expected ${JSON.stringify(REQUIRED[key])}, received ${JSON.stringify(command[key])}`);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`Phase 195 command contract mismatch. ${mismatches.join("; ")}`);
  }
}

export function readSavedChatGptTarget(savedUrlFile: string): SavedChatGptTarget {
  if (!fs.existsSync(savedUrlFile)) {
    throw new Error(`Saved ChatGPT target file not found: ${savedUrlFile}`);
  }

  const raw = fs.readFileSync(savedUrlFile, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const url = String(parsed.url ?? parsed.savedChatGptUrl ?? parsed.targetUrl ?? "").trim();

  if (!url) {
    throw new Error(`Saved ChatGPT target file did not contain url, savedChatGptUrl, or targetUrl: ${savedUrlFile}`);
  }

  assertSavedChatGptConversationUrl(url);
  return { url, sourceFile: savedUrlFile };
}

export function assertSavedChatGptConversationUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Saved ChatGPT target is not a valid URL: ${url}`);
  }

  const allowedHosts = new Set(["chatgpt.com", "chat.openai.com"]);
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(`Saved ChatGPT target host is not allowed: ${parsed.hostname}`);
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, "");
  const isConversation = normalizedPath.startsWith("/c/") && normalizedPath.length > 4;
  if (!isConversation) {
    throw new Error(
      `Saved ChatGPT target must be an existing conversation URL like https://chatgpt.com/c/.... New-chat and generic ChatGPT URLs are blocked: ${url}`,
    );
  }
}

export function snapshotDownloadDir(downloadDir: string, expectedZipFilename: string): DownloadSnapshot {
  fs.mkdirSync(downloadDir, { recursive: true });
  const files = fs.readdirSync(downloadDir);
  return {
    directory: downloadDir,
    expectedZipFilename,
    expectedZipPresentBeforeRun: files.includes(expectedZipFilename),
    fileCountBeforeRun: files.length,
    capturedAt: new Date().toISOString(),
  };
}

export function assertNoPreseed(snapshot: DownloadSnapshot): void {
  if (snapshot.expectedZipPresentBeforeRun) {
    throw new Error(
      `Cold-run violation: expected ZIP already existed before the run started: ${path.join(snapshot.directory, snapshot.expectedZipFilename)}`,
    );
  }
}

export function sha256File(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function verifyExactZip(downloadDir: string, expectedZipFilename: string): { zipPath: string; sha256: string } {
  const zipPath = path.join(downloadDir, expectedZipFilename);
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Expected ZIP was not downloaded: ${zipPath}`);
  }
  if (fs.existsSync(`${zipPath}.crdownload`) || fs.existsSync(`${zipPath}.tmp`)) {
    throw new Error(`Expected ZIP still appears incomplete: ${zipPath}`);
  }
  return { zipPath, sha256: sha256File(zipPath) };
}

export function buildCommandPayload(command: Phase195CommandContract): string {
  assertPhase195Contract(command);
  return JSON.stringify(command, null, 2);
}

export function writePhase195Proof(proofPath: string, proof: Phase195Proof): void {
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
}

export function buildPlanProof(args: {
  command: Phase195CommandContract;
  target: SavedChatGptTarget;
  downloadDir: string;
  snapshot: DownloadSnapshot;
}): Phase195Proof {
  return {
    ok: true,
    phaseSlug: args.command.phaseSlug,
    commandId: args.command.commandId,
    runNonce: args.command.runNonce,
    expectedZipFilename: args.command.expectedZipFilename,
    savedChatGptTargetOnly: true,
    allowRandomRecentChatFallback: false,
    allowNewChatFallback: false,
    savedTargetUrl: args.target.url,
    downloadDir: args.downloadDir,
    gates: [
      { name: "contract_exact", ok: true, detail: "Phase 195 command contract matched exactly." },
      { name: "saved_target_only", ok: true, detail: `Using saved target from ${args.target.sourceFile}.` },
      { name: "no_random_recent_chat_fallback", ok: true, detail: "Random recent ChatGPT fallback is disabled by command contract." },
      { name: "no_new_chat_fallback", ok: true, detail: "New-chat fallback is disabled by command contract." },
      { name: "no_preseed", ok: !args.snapshot.expectedZipPresentBeforeRun, detail: "Expected ZIP absent before run snapshot." },
    ],
    createdAt: new Date().toISOString(),
  };
}

export function findNewestExactFilenameElementScript(expectedZipFilename: string): string {
  const escaped = JSON.stringify(expectedZipFilename);
  return `(() => {
    const expected = ${escaped};
    const candidates = [];
    const all = Array.from(document.querySelectorAll('a, button, [role="button"], [data-testid], div, span'));
    for (const el of all) {
      const text = (el.textContent || '').trim();
      const aria = el.getAttribute('aria-label') || '';
      const title = el.getAttribute('title') || '';
      const href = el.getAttribute('href') || '';
      if (text.includes(expected) || aria.includes(expected) || title.includes(expected) || href.includes(expected)) {
        const rect = el.getBoundingClientRect();
        candidates.push({ el, y: rect.y, area: Math.max(1, rect.width * rect.height) });
      }
    }
    candidates.sort((a, b) => b.y - a.y || b.area - a.area);
    const chosen = candidates[0]?.el || null;
    if (chosen) chosen.scrollIntoView({ block: 'center', inline: 'center' });
    return Boolean(chosen);
  })()`;
}
