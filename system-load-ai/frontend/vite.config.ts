import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Ensure this matches docker-compose.yml if running locally outside Docker
    host: true, // Needed for Docker container port mapping
    proxy: {
      // Proxy API requests to backend during development
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
