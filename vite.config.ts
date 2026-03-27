import { defineConfig, type Plugin } from "vite-plus";
import pkg from "./package.json" with { type: "json" };

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * TypeScript port of google/data-layer-helper
 * (c) David Vallejo / Analytics Debugger S.L.U. - https://github.com/thyngster
 * Apache-2.0 License
 */`;

function bannerPlugin(): Plugin {
  return {
    name: "banner",
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") {
          chunk.code = banner + "\n" + chunk.code;
        }
      }
    },
  };
}

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs", "iife"],
      name: "DataLayerHelper",
      fileName: (format) => {
        if (format === "es") return "index.js";
        if (format === "cjs") return "index.cjs";
        return "data-layer-helper.iife.js";
      },
    },
  },
  plugins: [bannerPlugin()],
});
