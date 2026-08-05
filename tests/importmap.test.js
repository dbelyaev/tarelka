// @vitest-environment node
// Reads files off disk and needs no DOM; under jsdom `import.meta.url` is an
// http:// URL and cannot be resolved to a path.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const indexHtml = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const packageJson = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));

/** Every three.js version referenced by a jsdelivr URL in index.html. */
function cdnVersions() {
    return [...indexHtml.matchAll(/cdn\.jsdelivr\.net\/npm\/three@([\d.]+)\//g)].map(match => match[1]);
}

describe('import map', () => {
    it('pins the same three.js version the test suite installs', () => {
        // The browser loads three.js from the CDN; tests import it from npm. If the
        // two drift, the suite silently stops testing the code that actually ships.
        const installed = packageJson.devDependencies.three;
        expect(installed).toMatch(/^\d+\.\d+\.\d+$/); // exact pin, no range
        expect(new Set(cdnVersions())).toEqual(new Set([installed]));
    });

    it('references at least the three.js build and the FBX loader', () => {
        expect(cdnVersions().length).toBeGreaterThanOrEqual(2);
    });

    it('carries an integrity hash for every CDN module it maps', () => {
        const importMap = JSON.parse(
            /<script type="importmap">(.*?)<\/script>/s.exec(indexHtml)[1]
        );
        const buildUrl = importMap.imports.three;

        expect(importMap.integrity[buildUrl]).toMatch(/^sha384-/);
        for (const [url, hash] of Object.entries(importMap.integrity)) {
            expect(url).toMatch(/^https:\/\/cdn\.jsdelivr\.net\//);
            expect(hash).toMatch(/^sha384-/);
        }
    });
});
