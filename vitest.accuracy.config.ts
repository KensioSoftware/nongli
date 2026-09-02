import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * The accuracy report, which is a measurement rather than a test.
 *
 * Standalone rather than merged onto `vitest.config.ts`, because `mergeConfig`
 * concatenates `include` and would run the whole suite alongside the report.
 *
 * The report lives outside the main suite's `include` so that `pnpm test` never
 * writes a file as a side effect of running the tests, and so the minute it
 * takes is only spent when someone asks for it. `pnpm accuracy` points vitest
 * here.
 */
export default defineConfig({
  resolve: {
    alias: {
      "#test": fileURLToPath(new URL("./test", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/accuracy.test.ts"],
    typecheck: { tsconfig: "./tsconfig.json" },
  },
});
