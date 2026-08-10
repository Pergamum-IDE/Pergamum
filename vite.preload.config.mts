import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist/preload",
    lib: {
      entry: path.resolve(rootDir, "src/preload/preload.ts"),
      formats: ["cjs"],
      fileName: () => "preload.js"
    },
    rollupOptions: {
      external: ["electron"]
    }
  }
});
