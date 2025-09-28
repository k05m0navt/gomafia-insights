import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // Global ignores for generated files and build artifacts
  {
    ignores: [
      "src/generated/**/*",
      "prisma/generated/**/*",
      "**/prisma/**/*",
      "**/*.generated.*",
      "**/wasm*.js",
      "public/workers/**/*",
      "node_modules/**/*",
      ".next/**/*",
      "out/**/*",
      "build/**/*",
      "dist/**/*",
      ".DS_Store",
      "*.log"
    ]
  },

  // Targeted exceptions for external library integration
  {
    files: [
      "**/lib/supabase.ts",
      "**/lib/realtime.ts", 
      "**/hooks/useRealtime.ts",
      "**/types/realtime.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": ["off"],
      "@typescript-eslint/no-require-imports": ["off"]
    }
  },

  // Targeted exceptions for performance monitoring systems
  {
    files: [
      "**/performance/**/*.ts",
      "**/performance/**/*.tsx"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": ["off"],
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }]
    }
  },

  // Targeted exceptions for API routes and dashboard components with dynamic data
  {
    files: [
      "**/app/api/**/*.ts",
      "**/components/dashboard/**/*.tsx",
      "**/components/realtime/**/*.tsx"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": ["off"],
      "@typescript-eslint/no-unused-vars": ["off"],
      "react/no-unescaped-entities": ["off"]
    }
  }
];

export default eslintConfig;
