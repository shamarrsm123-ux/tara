// Phase 0: base Expo lint config. Phase 1 adds TARA rules (ban location modules,
// network APIs, hardcoded UI strings) per 13 Phase 1.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['android/**', 'ios/**', 'node_modules/**', '.expo/**', 'dist/**', 'coverage/**'],
  },
]);
