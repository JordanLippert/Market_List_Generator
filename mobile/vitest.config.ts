import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    // The hearsay-pwa submodule (vendored for its source, not its own test suite) ships
    // Bun-oriented tests that don't run under vitest/happy-dom — exclude them explicitly.
    exclude: ['**/node_modules/**', '**/dist/**', 'vendor/**']
  },
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'src/app'),
      '@ui': resolve(__dirname, 'src/ui')
    }
  }
});
