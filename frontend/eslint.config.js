import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // __APP_VERSION__ = เลขเวอร์ชันจาก package.json ที่ vite.config.js ฝังให้ (define)
      globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // ไฟล์ context ส่งออก Provider คู่กับ hook ของมัน (useAuth/useTheme/useToast) — แบบแผนของโปรเจกต์นี้
      'react-refresh/only-export-components': ['error', { allowConstantExport: true, allowExportNames: ['useAuth', 'useTheme', 'useToast'] }],
    },
  },
])
