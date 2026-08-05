/**
 * Minimal stand-in for the `three` module.
 *
 * three.js is loaded from a CDN via the import map in index.html, so it is not
 * an npm dependency and Vite cannot resolve the bare `three` specifier under
 * test. vitest.config.js aliases it here. Only the members that source modules
 * reference are provided — tests that need renderer behaviour pass their own
 * fake renderer rather than constructing a real WebGL context.
 */
export const SRGBColorSpace = 'srgb';

/**
 * Guard that fails loudly if a test reaches for a real WebGL context, which
 * jsdom cannot provide. Tests exercise renderer sizing through their own fake
 * renderer instead.
 */
export function WebGLRenderer() {
    throw new Error('THREE.WebGLRenderer is not available under test — pass a fake renderer instead.');
}
