import nextConfig from "eslint-config-next";
import prettier from "eslint-config-prettier";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "docs/**",
      ".tools/**",
      "src/data/supabase/database.types.ts",
    ],
  },
  ...nextConfig,
  prettier,
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      // Domain purity: no persistence or LLM imports inside src/domain (docs/10 §ARCHITECTURE).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "@/data/*", "openai", "@openai/*", "pg", "next", "next/*"],
              message: "Domain code must stay free of persistence, framework and LLM imports.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
