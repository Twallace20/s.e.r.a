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
      "@sera/repository-truth": r("./packages/repository-truth/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    sequence: { concurrent: false }
  }
});
