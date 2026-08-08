import fs from "node:fs";
import path from "node:path";

export const TEXT_NORMALIZER_VERSION = "text-normalizer-v1";

export function normalizeText(input: string): string {
  const normalizedNewlines = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = normalizedNewlines
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

export function runTextNormalizer(args: string[]): void {
  if (args.length !== 2) {
    throw new Error(
      "text-normalizer-v1 requires exactly two arguments: input and output."
    );
  }

  const [inputPath, outputPath] = args;

  if (!inputPath || !outputPath) {
    throw new Error("Input and output paths are required.");
  }

  const input = fs.readFileSync(inputPath, "utf8");
  const normalized = normalizeText(input);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, normalized, "utf8");
}

if (require.main === module) {
  try {
    runTextNormalizer(process.argv.slice(2));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}