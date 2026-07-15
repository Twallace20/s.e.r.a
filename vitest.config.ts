import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@sera/shared": r("./packages/shared/src/index.ts"),
      "@sera/safety": r("./packages/safety/src/index.ts"),
      "@sera/artifacts": r("./packages/artifacts/src/index.ts"),
      "@sera/workspace": r("./packages/workspace/src/index.ts"),
      "@sera/tools": r("./packages/tools/src/index.ts"),
      "@sera/kernel": r("./packages/kernel/src/index.ts"),
      "@sera/certs": r("./packages/certs/src/index.ts"),
      "@sera/repository-snapshot": r("./packages/repository-snapshot/src/index.ts"),
      "@sera/repository-truth": r("./packages/repository-truth/src/index.ts"),
      "@sera/control-plane": r("./packages/control-plane/src/index.ts"),
      "@sera/runtime-host": r("./packages/runtime-host/src/index.ts"),
      "@sera/runtime-state": r("./packages/runtime-state/src/index.ts"),
      "@sera/runtime-recovery": r("./packages/runtime-recovery/src/index.ts"),
      "@sera/execution-engine": r("./packages/execution-engine/src/index.ts"),
      "@sera/evaluation-engine": r("./packages/evaluation-engine/src/index.ts"),
      "@sera/model-runtime": r("./packages/model-runtime/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    fileParallelism: false,
    sequence: { concurrent: false }
  }
});
