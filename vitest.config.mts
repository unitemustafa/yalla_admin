import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["features/**/*.test.ts", "lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "features/dashboard/routes.ts",
        "features/dashboard/shared/api-data.ts",
        "features/dashboard/shared/money.ts",
        "features/dashboard/offers/schedule.ts",
        "lib/api-config.ts",
        "lib/protected-routes.ts"
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
