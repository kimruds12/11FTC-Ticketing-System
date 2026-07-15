import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// Flat config, shared across the workspace. Package lint scripts run `eslint "src/**/*.ts"`
// from their own directory; ESLint walks up and finds this file. The web app uses
// `next lint` instead and ignores this.
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/coverage/**",
      "packages/db/migrations/**",
      "apps/web/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
