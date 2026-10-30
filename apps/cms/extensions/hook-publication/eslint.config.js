import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// dist/ is the esbuild bundle Directus loads, committed like every extension's (see ../README.md).
export default tseslint.config({ ignores: ['dist/', 'coverage/'] }, js.configs.recommended, ...tseslint.configs.strict)
