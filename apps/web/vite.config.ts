import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from "node:fs";
const version = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
).version;
export default defineConfig({
  root: "apps/web",
  plugins: [vue()],
  define: {
    __BUILD_VERSION__: JSON.stringify(version),
    __BUILD_COMMIT__: JSON.stringify(process.env.BUILD_COMMIT || "development"),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/identity": {
        target: "http://127.0.0.1:3001",
        rewrite: (p) => p.replace(/^\/identity\/(healthz|readyz)$/, "/$1"),
      },
      "/api": {
        target: "http://127.0.0.1:3002",
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
      "/realtime": {
        target: "http://127.0.0.1:3003",
        ws: true,
        rewrite: (p) => p.replace(/^\/realtime/, ""),
      },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
