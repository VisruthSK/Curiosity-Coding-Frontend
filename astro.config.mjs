import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  server: {
    port: 1313,
  },
  vite: {
    plugins: [tailwindcss()], 
    build: {
      cssMinify: true,
      minify: "esbuild",
    },
  },
  integrations: [preact()],
});
