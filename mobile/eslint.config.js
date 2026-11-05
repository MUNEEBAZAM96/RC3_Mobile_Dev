const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: ['node_modules', '.expo', 'dist', 'release', '**/._*'],
  },
  expoConfig,
]);
