import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  output: "static",
  server: {
    port: 1313,
  },
  vite: {
    plugins: [tailwindcss()], 
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    build: {
      cssMinify: true,
      minify: "esbuild",
    },
  },
  integrations: [preact()],
});
