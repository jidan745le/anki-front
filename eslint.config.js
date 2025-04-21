const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
    {
        ignores: ['node_modules/**', 'dist/**', 'build/**', '*.config.js', '*.lock'],
    },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                document: 'readonly',
                navigator: 'readonly',
                window: 'readonly',
            },
        },
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': 'error',
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'no-unused-vars': 'warn',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
]; 