import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [".sera-runs", ".sera-cert", "coverage"];
const packageDirs = ["packages", "apps"];

for (const t of targets) {
  fs.rmSync(path.join(root, t), { recursive: true, force: true });
}

for (const base of packageDirs) {
  const dir = path.join(root, base);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, name, "dist"), { recursive: true, force: true });
    fs.rmSync(path.join(dir, name, "tsconfig.tsbuildinfo"), { force: true });
  }
}

fs.rmSync(path.join(root, "tsconfig.tsbuildinfo"), { force: true });
console.log("S.E.R.A. clean complete.");
