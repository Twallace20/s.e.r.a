import fs from "node:fs";
import path from "node:path";

export const DETERMINISTIC_TEXT_TRANSFORM_VERSION = "deterministic-text-transform-v1";
export const STABLE_UNIQUE_LINE_SORT_OPERATION = "stable-unique-line-sort";
export const DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES = 64 * 1024;
export const DETERMINISTIC_TEXT_TRANSFORM_MAX_OUTPUT_BYTES = 64 * 1024;

export function stableUniqueLineSort(input: string): string {
  if (input.includes("\u0000")) throw new Error("NUL bytes are not allowed in deterministic text input.");
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.length > 0);
  return [...new Set(lines)].sort().join("\n");
}

export function runDeterministicTextTransform(inputPath: string, outputPath: string, maxInputBytes = DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES): void {
  const inputStat = fs.statSync(inputPath);
  if (!inputStat.isFile()) throw new Error("Deterministic text transform input must be a file.");
  if (inputStat.size > maxInputBytes) throw new Error("Deterministic text transform input exceeds the bounded input limit.");
  const input = fs.readFileSync(inputPath, "utf8");
  const output = stableUniqueLineSort(input);
  if (Buffer.byteLength(output, "utf8") > DETERMINISTIC_TEXT_TRANSFORM_MAX_OUTPUT_BYTES) throw new Error("Deterministic text transform output exceeds the bounded output limit.");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, "utf8");
}

if (require.main === module) {
  const [operation, inputPath, outputPath, maxInputBytesRaw] = process.argv.slice(2);
  if (operation !== STABLE_UNIQUE_LINE_SORT_OPERATION) throw new Error("Unsupported deterministic text transform operation.");
  if (!inputPath || !outputPath) throw new Error("Deterministic text transform requires input and output paths.");
  const maxInputBytes = Number(maxInputBytesRaw ?? DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES);
  if (!Number.isSafeInteger(maxInputBytes) || maxInputBytes <= 0 || maxInputBytes > DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES) throw new Error("Invalid deterministic text transform input limit.");
  runDeterministicTextTransform(inputPath, outputPath, maxInputBytes);
}
