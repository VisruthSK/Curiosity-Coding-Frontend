import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  server: {
    port: 1313,
  },
  vite: {
    build: {
      cssMinify: true,
      minify: "esbuild",
    },
  },
  integrations: [react()],
});
