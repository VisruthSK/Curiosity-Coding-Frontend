import react from "@astrojs/react";
import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";

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
  adapter: cloudflare(),
});