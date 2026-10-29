import { defineConfig } from "vitest/config";
import path from "node:path";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/patronos_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/unit/server-only-stub.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    globalSetup: ["tests/unit/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL, AUTH_MODE: "dev", SESSION_SECRET: "test-session-secret-0123456789abcdefghij", IP_HASH_SALT: "test-salt-0123456789" },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
