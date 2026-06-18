import { spawnSync } from "node:child_process";

function check(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
  return { ok: r.status === 0, output: (r.stdout || r.stderr || "").trim() };
}

const checks = [
  ["node", ["--version"]],
  ["npm", ["--version"]],
  ["git", ["--version"]]
];

let ok = true;
for (const [cmd, args] of checks) {
  const r = check(cmd, args);
  ok = ok && r.ok;
  console.log(`${r.ok ? "OK" : "MISSING"} ${cmd}: ${r.output}`);
}

console.log("\nS.E.R.A. secure base does not require Ollama, Docker, cloud credentials, or API keys.");
process.exit(ok ? 0 : 1);
