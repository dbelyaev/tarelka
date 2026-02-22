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
        return !!(window.WebGLRenderingContext && gl);
    } catch(e) {
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
