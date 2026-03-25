import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';


export default defineConfig(
	{
		ignores: [
			'build',
			'dist',
			'node_modules'
		]
	},
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		plugins: {
			'@stylistic': stylistic,
			'@typescript-eslint': tseslint.plugin
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mjs'
					]
				},
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@stylistic/comma-dangle': ['warn', 'never'],
			'@stylistic/indent': ['error', 'tab', {
				SwitchCase: 1
			}],
			'@stylistic/member-delimiter-style': ['warn', {
				multiline: {
					delimiter: 'semi',
					requireLast: true
				},
				singleline: {
					delimiter: 'semi',
					requireLast: false
				}
			}],
			'@stylistic/no-trailing-spaces': 'warn',
			'@stylistic/quote-props': ['warn', 'as-needed'],
			'@stylistic/quotes': ['warn', 'single'],
			'@stylistic/semi': ['warn', 'always'],
			'@typescript-eslint/no-unused-vars': 'warn',
			'max-len': [
				'warn',
				{
					code: 140
				}
			],
			'no-console': ['warn', {
				allow: ['info', 'warn', 'error']
			}],
			'no-use-before-define': ['error', 'nofunc'],
			'prefer-const': 'warn'
		}
	}
);
