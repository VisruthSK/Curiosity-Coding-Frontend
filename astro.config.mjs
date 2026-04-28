import preact from "@astrojs/preact";
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
  integrations: [preact()],
});
