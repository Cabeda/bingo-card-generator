import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    {
        ignores: [
            '.next/**',
            'coverage/**',
            'node_modules/**',
            'out/**',
            'build/**',
            'dist/**',
            'next-env.d.ts',
            'public/sw.js',
            'public/workbox-*.js'
        ]
    },
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        rules: {
            'sort-imports': [
                'error',
                {
                    ignoreCase: true,
                    ignoreDeclarationSort: true,
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
                    allowSeparatedGroups: true
                }
            ]
        }
    }
]);