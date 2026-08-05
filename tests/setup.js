// Node's own experimental global `localStorage` (unavailable without a
// --localstorage-file flag) is already present in `global` when vitest's
// jsdom environment copies over window properties, so its copy step skips
// re-exporting jsdom's version (see vitest's populateGlobal/getWindowKeys).
// Force the real jsdom implementation so source code using the bare
// `localStorage` global (as it does in the browser) works under test.
// Guarded because setup files also run for test files that opt into the `node`
// environment, where no jsdom window exists.
if (globalThis.jsdom) {
    globalThis.localStorage = globalThis.jsdom.window.localStorage;
}
