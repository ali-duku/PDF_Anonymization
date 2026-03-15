import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Relative base keeps the output portable for GitHub Pages under
 * root or repository sub-path deployments.
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true
  }
});
