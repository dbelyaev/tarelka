// Node's own experimental global `localStorage` (unavailable without a
// --localstorage-file flag) is already present in `global` when vitest's
// jsdom environment copies over window properties, so its copy step skips
// re-exporting jsdom's version (see vitest's populateGlobal/getWindowKeys).
// Force the real jsdom implementation so source code using the bare
// `localStorage` global (as it does in the browser) works under test.
// jsdom's `window.localStorage` is itself a getter-only accessor (no setter),
// so a plain assignment throws under strict-mode ESM (vitest 5 + jsdom 30);
// redefine the global property instead of assigning to it.
// Guarded because setup files also run for test files that opt into the `node`
// environment, where no jsdom window exists.
if (globalThis.jsdom) {
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
            return globalThis.jsdom.window.localStorage;
        }
    });
}
