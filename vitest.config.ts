import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next's bundler aliases this to a no-op internally; Vite/vitest needs
      // the same alias so files marked `import "server-only"` can be unit
      // tested. See src/test/server-only-shim.ts.
      "server-only": fileURLToPath(new URL("./src/test/server-only-shim.ts", import.meta.url)),
    },
  },
});
