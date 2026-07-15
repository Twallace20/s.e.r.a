import path from "node:path";
import type { ExecutionRequest } from "./execution-request";

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
  return registry;
}
