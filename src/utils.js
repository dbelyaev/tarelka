/**
 * Utility functions
 */

/**
 * Check if the browser supports WebGL
 * @returns {boolean} True if WebGL is supported, false otherwise
 */
export function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(globalThis.WebGLRenderingContext && gl);
    } catch (e) {
        console.debug('WebGL support check failed:', e);
        return false;
    }
}

/**
 * Creates a debounced version of a function that delays its execution
 * until after a specified wait time has elapsed since the last call.
 * The returned function has a .cancel() method to clear any pending timeout.
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to wait before executing
 * @returns {Function} A debounced version of the input function with a cancel() method
 */
export function debounce(func, wait) {
    let timeout;
    const debounced = function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
    debounced.cancel = () => clearTimeout(timeout);
    return debounced;
}

/**
 * Check if the device's primary pointer is coarse (touch), used as a proxy for
 * mobile-class hardware to scale down particle-effect density.
 * @returns {boolean} True if matchMedia is available and reports a coarse pointer
 */
export function prefersCoarsePointer() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Check if the user has asked the OS/browser to minimize non-essential motion
 * and flashing (e.g. to tone down lightning flashes).
 * @returns {boolean} True if matchMedia is available and reports reduced motion
 */
export function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Non-cryptographic uniform random number in [min, max). Only used for cosmetic
 * randomness in particle effects (position/speed/angle) — never anything
 * security-sensitive, so Math.random() is the right tool here.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInRange(min, max) {
    return min + Math.random() * (max - min); // NOSONAR - decorative randomness, not security-sensitive
}

/**
 * Returns 1 or -1 with equal probability. Same non-cryptographic-use note as randomInRange.
 * @returns {number}
 */
export function randomSign() {
    return Math.random() < 0.5 ? 1 : -1; // NOSONAR - decorative randomness, not security-sensitive
}

/**
 * Weighted random index selection over cumulative distribution ratios (e.g.
 * a parallax LAYER_DISTRIBUTION like [0.3, 0.4, 0.3]). Same non-cryptographic-
 * use note as randomInRange — only used to pick a particle's visual layer.
 * @param {number[]} distribution - ratios that should sum to ~1
 * @returns {number} index into distribution
 */
export function pickWeightedIndex(distribution) {
    const r = Math.random(); // NOSONAR - decorative randomness, not security-sensitive
    let cumulative = 0;
    for (let i = 0; i < distribution.length; i++) {
        cumulative += distribution[i];
        if (r < cumulative) return i;
    }
    return distribution.length - 1;
}

/**
 * Check if the current month falls within the configured winter months
 * @param {number[]} winterMonths - Array of month numbers (1-12)
 * @returns {boolean} True if current month is in the winter months array
 */
export function isSnowSeason(winterMonths) {
    const currentMonth = new Date().getMonth() + 1;
    return Array.isArray(winterMonths) && winterMonths.includes(currentMonth);
}

/**
 * Helper function to properly dispose of a Three.js material and its textures
 * @param {THREE.Material} material - The material to dispose
 */
export function disposeMaterial(material) {
    if (!material) return;
    
    // Dispose all textures in the material
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();
    if (material.alphaMap) material.alphaMap.dispose();
    if (material.aoMap) material.aoMap.dispose();
    if (material.displacementMap) material.displacementMap.dispose();
    if (material.emissiveMap) material.emissiveMap.dispose();
    if (material.gradientMap) material.gradientMap.dispose();
    if (material.metalnessMap) material.metalnessMap.dispose();
    if (material.roughnessMap) material.roughnessMap.dispose();
    
    // Dispose the material itself
    material.dispose();
}
