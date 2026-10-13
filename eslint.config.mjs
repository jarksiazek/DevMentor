import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Package boundaries: app → core → db, app → ui. Only db touches MikroORM.
const mikroOrm = { group: ["@mikro-orm/*"], message: "Only @devmentor/db may import MikroORM; use its re-exports." };
const appPackage = { group: ["@devmentor/app", "@devmentor/app/*"], message: "Nothing may import @devmentor/app." };
const restrict = (files, patterns) => ({ files, rules: { "no-restricted-imports": ["error", { patterns }] } });

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      // The Next.js app lives in a workspace package, not at the repo root.
      next: { rootDir: "packages/app/" },
    },
  },
  restrict(["packages/db/**"], [
    { group: ["@devmentor/*"], message: "@devmentor/db is the innermost package and imports no workspace package." },
  ]),
  restrict(["packages/core/**"], [
    appPackage,
    mikroOrm,
    { group: ["@devmentor/ui", "@devmentor/ui/*"], message: "core must not depend on ui." },
    { group: ["next", "next/*", "react", "react-dom", "react/*"], message: "core is framework-free." },
  ]),
  restrict(["packages/ui/**"], [
    appPackage,
    mikroOrm,
    {
      group: ["@devmentor/core", "@devmentor/core/*", "@devmentor/db", "@devmentor/db/*"],
      message: "ui must not import core/db; pass schemas and data in as props.",
    },
  ]),
  restrict(["packages/app/**"], [mikroOrm]),
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
