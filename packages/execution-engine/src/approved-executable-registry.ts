import path from "node:path";
import type { ExecutionRequest } from "./execution-request";
import { TEXT_NORMALIZER_VERSION } from "./text-normalizer-tool";
import { DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES, DETERMINISTIC_TEXT_TRANSFORM_VERSION, STABLE_UNIQUE_LINE_SORT_OPERATION } from "./deterministic-text-transform-tool";
import { DETERMINISTIC_TEXT_TRANSFORM_V2_VERSION } from "./deterministic-text-transform-tool-v2";

export interface ApprovedExecutable {
  id: string;
  resolvePath(): string;
  fingerprint: string;
  risk: "proof-fixture" | "local-tool";
  offlineCompatible: boolean;
  networkCapable: boolean;
  validateArgs(args: string[]): void;
  materializeArgs(request: ExecutionRequest, workspaceRoot: string): string[];
}

export class ApprovedExecutableRegistry {
  private readonly entries = new Map<string, ApprovedExecutable>();

  register(entry: ApprovedExecutable): void {
    if (this.entries.has(entry.id)) throw new Error(`Duplicate executable adapter: ${entry.id}`);
    this.entries.set(entry.id, entry);
  }

  get(id: string): ApprovedExecutable {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Executable is not approved: ${id}`);
    return entry;
  }

  list(): ApprovedExecutable[] {
    return [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}

export function createDefaultExecutableRegistry(): ApprovedExecutableRegistry {
  const registry = new ApprovedExecutableRegistry();
  registry.register({
    id: "node-fixture",
    resolvePath: () => process.execPath,
    fingerprint: `node:${process.version}`,
    risk: "proof-fixture",
    offlineCompatible: true,
    networkCapable: false,
    validateArgs(args) {
      if (args.length !== 1 || !args[0].startsWith("fixture:")) throw new Error("node-fixture accepts one fixture argument only.");
      const allowed = new Set(["fixture:echo", "fixture:stderr", "fixture:output", "fixture:undeclared", "fixture:large-stdout", "fixture:large-stderr", "fixture:timeout", "fixture:cancel", "fixture:fail"]);
      if (!allowed.has(args[0])) throw new Error(`Fixture argument is not approved: ${args[0]}`);
    },
    materializeArgs(request, workspaceRoot) {
      const script = path.join(workspaceRoot, ".sera-fixture", "fixture.js");
      return [script, request.args[0]];
    }
  });
  registry.register({
    id: "network-fixture",
    resolvePath: () => process.execPath,
    fingerprint: `node:${process.version}:network-fixture`,
    risk: "proof-fixture",
    offlineCompatible: false,
    networkCapable: true,
    validateArgs(args) {
      if (args.length !== 1 || args[0] !== "fixture:network") throw new Error("network-fixture accepts only fixture:network.");
    },
    materializeArgs(request, workspaceRoot) {
      return [path.join(workspaceRoot, ".sera-fixture", "fixture.js"), request.args[0]];
    }
  });
  registry.register({
    id: "missing-fixture",
    resolvePath: () => path.join(process.cwd(), ".sera-missing-executable"),
    fingerprint: "missing-fixture:v1",
    risk: "proof-fixture",
    offlineCompatible: true,
    networkCapable: false,
    validateArgs(args) {
      if (args.length !== 1 || args[0] !== "fixture:echo") throw new Error("missing-fixture accepts only fixture:echo.");
    },
    materializeArgs(request, workspaceRoot) {
      return [path.join(workspaceRoot, ".sera-fixture", "fixture.js"), request.args[0]];
    }
  });
  registry.register({
    id: "text-normalizer-v1",
    resolvePath: () => process.execPath,
    fingerprint: `node:${process.version}:${TEXT_NORMALIZER_VERSION}`,
    risk: "local-tool",
    offlineCompatible: true,
    networkCapable: false,
    validateArgs(args) {
      if (
        args.length !== 2 ||
        args[0] !== "input/source.md" ||
        args[1] !== "out/normalized.md"
      ) {
        throw new Error(
          "text-normalizer-v1 accepts only input/source.md -> out/normalized.md."
        );
      }
    },
    materializeArgs(request, workspaceRoot) {
      return [
        path.join(__dirname, "text-normalizer-tool.js"),
        path.join(workspaceRoot, request.args[0]),
        path.join(workspaceRoot, request.args[1])
      ];
    }
  });

  registry.register({
    id: "deterministic-text-transform-v1",
    resolvePath: () => process.execPath,
    fingerprint: `node:${process.version}:${DETERMINISTIC_TEXT_TRANSFORM_VERSION}`,
    risk: "local-tool",
    offlineCompatible: true,
    networkCapable: false,
    validateArgs(args) {
      const expected = [STABLE_UNIQUE_LINE_SORT_OPERATION, "input/source.txt", "out/result.txt", String(DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES)];
      if (args.length !== expected.length || args.some((arg, index) => arg !== expected[index])) {
        throw new Error("deterministic-text-transform-v1 accepts only the bounded stable-unique-line-sort recipe.");
      }
    },
    materializeArgs(request, workspaceRoot) {
      return [
        (() => {
          const sibling = path.join(__dirname, "deterministic-text-transform-tool.js");
          const built = path.resolve(__dirname, "..", "dist", "deterministic-text-transform-tool.js");
          const script = require("node:fs").existsSync(sibling)
            ? sibling
            : require("node:fs").existsSync(built)
              ? built
              : undefined;

          if (!script) {
            throw new Error("deterministic-text-transform-v1 bundled implementation is unavailable.");
          }

          return script;
        })(),
        request.args[0],
        path.join(workspaceRoot, request.args[1]),
        path.join(workspaceRoot, request.args[2]),
        request.args[3]
      ];
    }
  });

  registry.register({
    id: "deterministic-text-transform-v2",
    resolvePath: () => process.execPath,
    fingerprint: `node:${process.version}:${DETERMINISTIC_TEXT_TRANSFORM_V2_VERSION}`,
    risk: "local-tool",
    offlineCompatible: true,
    networkCapable: false,
    validateArgs(args) {
      const expected = [
        STABLE_UNIQUE_LINE_SORT_OPERATION,
        "input/source.txt",
        "out/result.txt",
        String(DETERMINISTIC_TEXT_TRANSFORM_MAX_INPUT_BYTES)
      ];

      if (
        args.length !== expected.length ||
        args.some(
          (arg, index) =>
            arg !== expected[index]
        )
      ) {
        throw new Error(
          "deterministic-text-transform-v2 accepts only the bounded stable-unique-line-sort recipe."
        );
      }
    },
    materializeArgs(request, workspaceRoot) {
      return [
        (() => {
          const sibling =
            path.join(
              __dirname,
              "deterministic-text-transform-tool-v2.js"
            );

          const built =
            path.resolve(
              __dirname,
              "..",
              "dist",
              "deterministic-text-transform-tool-v2.js"
            );

          const script =
            require("node:fs")
              .existsSync(sibling)
              ? sibling
              : require("node:fs")
                  .existsSync(built)
                ? built
                : undefined;

          if (!script) {
            throw new Error(
              "deterministic-text-transform-v2 bundled implementation is unavailable."
            );
          }

          return script;
        })(),
        request.args[0],
        path.join(
          workspaceRoot,
          request.args[1]
        ),
        path.join(
          workspaceRoot,
          request.args[2]
        ),
        request.args[3]
      ];
    }
  });
  return registry;
}
