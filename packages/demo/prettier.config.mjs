/**
 * @see https://prettier.io/docs/configuration
 * @type {import('prettier').Config & import('@ianvs/prettier-plugin-sort-imports').PluginConfig}
 */
const config = {
  printWidth: 120,
  endOfLine: "lf",
  singleQuote: true,
  trailingComma: "all",
  importOrder: ["<THIRD_PARTY_MODULES>", "", "^[./]"],
  plugins: [
    import("@ianvs/prettier-plugin-sort-imports"),
    import("prettier-plugin-tailwindcss"),
  ],
  importOrderTypeScriptVersion: "5.8.0",
  tailwindStylesheet: "./src/index.css",
};
export default config;
