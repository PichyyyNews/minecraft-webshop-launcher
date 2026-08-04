import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const targetApi = env.VITE_LAUNCHER_API_URL || env.API_URL || "http://localhost:5000";

  return {
    envDir: "..",
    plugins: [react()],
    clearScreen: false,
    server: {
      host: "0.0.0.0",
      port: 1420,
      strictPort: true,
      proxy: {
        "/api-backend": {
          target: targetApi,
          changeOrigin: true,
          rewrite: (pathStr) => pathStr.replace(/^\/api-backend/, ""),
        },
      },
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
