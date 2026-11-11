import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Benchmark suite — kept out of `npm test` so the ordinary suite stays fast.
 * Run with `npm run benchmark`; artifacts land in docs/engineering/benchmarks/.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["benchmarks/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
});
