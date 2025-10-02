import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            ecmaVersion: 2025,
            sourceType: "module",
        },
        rules: {
            "no-unused-vars": "error",
            "no-undef": 2,
            indent: [1, 4],
            strict: [2, "function"],
            camelcase: 2,
            "no-var": 0,
            quotes: [2, "single"],
            curly: 2,
            eqeqeq: 2,
            "no-irregular-whitespace": 2,
        },
    },
]);
