import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            // three.js ships from a CDN via the import map in index.html, so the
            // bare specifier has no npm package to resolve to under test.
            three: fileURLToPath(new URL('./tests/stubs/three.js', import.meta.url))
        }
    },
    test: {
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                url: 'http://localhost/'
            }
        },
        setupFiles: ['./tests/setup.js']
    }
});
