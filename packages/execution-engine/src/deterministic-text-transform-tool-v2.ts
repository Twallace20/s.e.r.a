import fs from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES,
  DETERMINISTIC_TEXT_TRANSFORM_MAX_OUTPUT_BYTES,
  STABLE_UNIQUE_LINE_SORT_OPERATION,
  stableUniqueLineSort
} from "./deterministic-text-transform-tool";

export const DETERMINISTIC_TEXT_TRANSFORM_V2_VERSION =
  "deterministic-text-transform-v2";

export function decodeStrictUtf8(input: Uint8Array): string {
  return new TextDecoder(
    "utf-8",
    {
      fatal: true
    }
  ).decode(input);
}

export function runDeterministicTextTransformV2(
  inputPath: string,
  outputPath: string,
  maxInputBytes =
    DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES
): void {
  const inputStat =
    fs.statSync(inputPath);

  if (!inputStat.isFile()) {
    throw new Error(
      "Deterministic text transform input must be a file."
    );
  }

  if (
    inputStat.size >
    maxInputBytes
  ) {
    throw new Error(
      "Deterministic text transform input exceeds the bounded input limit."
    );
  }

  const inputBytes =
    fs.readFileSync(inputPath);

  let input: string;

  try {
    input =
      decodeStrictUtf8(
        inputBytes
      );
  } catch {
    throw new Error(
      "Deterministic text transform input is not valid UTF-8."
    );
  }

  const output =
    stableUniqueLineSort(
      input
    );

  if (
    Buffer.byteLength(
      output,
      "utf8"
    ) >
    DETERMINISTIC_TEXT_TRANSFORM_MAX_OUTPUT_BYTES
  ) {
    throw new Error(
      "Deterministic text transform output exceeds the bounded output limit."
    );
  }

  fs.mkdirSync(
    path.dirname(
      outputPath
    ),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    outputPath,
    output,
    "utf8"
  );
}

if (require.main === module) {
  const [
    operation,
    inputPath,
    outputPath,
    maxInputBytesRaw
  ] =
    process.argv.slice(2);

  if (
    operation !==
    STABLE_UNIQUE_LINE_SORT_OPERATION
  ) {
    throw new Error(
      "Unsupported deterministic text transform operation."
    );
  }

  if (
    !inputPath ||
    !outputPath
  ) {
    throw new Error(
      "Deterministic text transform requires input and output paths."
    );
  }

  const maxInputBytes =
    Number(
      maxInputBytesRaw ??
      DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES
    );

  if (
    !Number.isSafeInteger(
      maxInputBytes
    ) ||
    maxInputBytes <= 0 ||
    maxInputBytes >
      DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES
  ) {
    throw new Error(
      "Invalid deterministic text transform input limit."
    );
  }

  runDeterministicTextTransformV2(
    inputPath,
    outputPath,
    maxInputBytes
  );
}
