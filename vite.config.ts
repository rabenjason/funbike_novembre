import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Read the backend's local .env for an optional proxy target without exposing
  // DATABASE_URL to Vite or to browser code.
  const backendEnv = loadEnv(mode, path.resolve(__dirname, "backend"), "");
  const apiTarget = process.env.API_PROXY_TARGET ?? backendEnv.API_PROXY_TARGET ?? "http://127.0.0.1:4000";

  return {
    plugins: [react(), tailwindcss(), viteSingleFile()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/graphql": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/admin/uploads": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/uploads": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
