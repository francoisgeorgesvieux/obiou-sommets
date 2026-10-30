import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// dist/ is the esbuild bundle Directus loads, committed because the cms image is built from
// apps/cms alone and cannot see packages/geo.
export default tseslint.config({ ignores: ['dist/', 'coverage/'] }, js.configs.recommended, ...tseslint.configs.strict)
