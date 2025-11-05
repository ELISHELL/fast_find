import antfu from "@antfu/eslint-config";
import n from "eslint-plugin-n";

export default antfu({
  formatters: true,
  type: "lib",
  ignores: ["**/dist/**", "**/node_modules/**", "**/.git/**", "**/.vscode/**", "tsconfig*", "env.d.ts"],
  stylistic: {
    indent: 2,
    quotes: "double",
    semi: true,
  },
  typescript: true,
  vue: false,
  plugins: {
    node: n,
  },
  rules: {
    "no-console": "off",
    "no-unused-vars": "off",
    "unused-imports/no-unused-vars": "off",
    "node/prefer-global/process": "off",
    "antfu/top-level-functions": "off",
    "ts/explicit-function-return-type": "off",
  },
  imports: true,
  jsonc: true,
});
