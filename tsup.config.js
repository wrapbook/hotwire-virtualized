import { defineConfig } from "tsup";

export default defineConfig({
  minify: true,
  target: "es2015",
  sourcemap: true,
  dts: true,
  format: ["esm", "cjs", "iife"],
  injectStyle: true,
  entry: ["src/index.ts", "src/tests/fixtures/test.js"],
});
