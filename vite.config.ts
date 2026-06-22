import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: env.GITHUB_PAGES === "true" ? "/rubik-camera-solver/" : "/",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            solver: ["cubejs"],
            graphics: ["three", "@react-three/fiber"],
          },
        },
      },
    },
  };
});
