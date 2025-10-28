import { defineConfig } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
// Avoid using FlatCompat to prevent circular config objects during schema validation.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
    {
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            react: reactPlugin
        }
    },
    // Only enable type-aware linting for TypeScript files so ESLint doesn't
    // attempt to apply `parserOptions.project` to unrelated JS config files.
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: ['./tsconfig.json']
            }
        }
    },
    // Use eslint-config-next's flat config entry points. These do not require
    // FlatCompat and are compatible with the new flat config system.
    // No extends: keep a minimal config to isolate errors caused by
    // resolving shareable configs or plugins.
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