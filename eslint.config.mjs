import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // .local/ holds unversioned local files (access notes, one-off scripts); it is not part of the app.
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts", "Guía visual de rediseño editorial/**", ".local/**"]),
]);
