// Node's own experimental global `localStorage` (unavailable without a
// --localstorage-file flag) is already present in `global` when vitest's
// jsdom environment copies over window properties, so its copy step skips
// re-exporting jsdom's version (see vitest's populateGlobal/getWindowKeys).
// Force the real jsdom implementation so source code using the bare
// `localStorage` global (as it does in the browser) works under test.
globalThis.localStorage = globalThis.jsdom.window.localStorage;
