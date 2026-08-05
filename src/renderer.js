/**
 * Renderer setup and configuration
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * Compute the drawing buffer size in whole device pixels, plus the CSS size the
 * canvas should be displayed at.
 *
 * PS1 mode renders at a fraction of the viewport for the pixelated look;
 * otherwise the buffer follows devicePixelRatio, capped to avoid excessive fill
 * rate on 3x+ HiDPI displays.
 *
 * @returns {{width: number, height: number, cssWidth: number, cssHeight: number}}
 */
export function computeRenderSize() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const scale = CONFIG.ps1Style
        ? 1 / CONFIG.ps1PixelScale
        : Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio);

    return {
        cssWidth,
        cssHeight,
        // Whole device pixels — see applyRenderSize for why this must be integral.
        width: Math.max(1, Math.floor(cssWidth * scale)),
        height: Math.max(1, Math.floor(cssHeight * scale))
    };
}

/**
 * Size the renderer's drawing buffer and its CSS display size.
 *
 * three.js derives canvas.width from Math.floor(width * pixelRatio) but the GL
 * viewport from Math.round(width * pixelRatio). When that product lands on a
 * .5-or-higher fraction the viewport ends up a pixel larger than the drawing
 * buffer, and browsers warn "Drawing to a destination rect smaller than the
 * viewport rect". Passing whole device pixels at a 1:1 ratio makes floor() and
 * round() operate on the same integer, so the two can never diverge; the CSS
 * size is then applied separately to stretch the buffer over the viewport.
 *
 * @param {THREE.WebGLRenderer} renderer
 */
export function applyRenderSize(renderer) {
    const { width, height, cssWidth, cssHeight } = computeRenderSize();

    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false); // Don't set inline CSS from buffer size
    renderer.domElement.style.width = `${cssWidth}px`;
    renderer.domElement.style.height = `${cssHeight}px`;
}

/**
 * Create and configure the WebGL renderer
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer() {
    const renderer = new THREE.WebGLRenderer({
        antialias: !CONFIG.ps1Style,  // PS1 had no antialiasing
        precision: CONFIG.ps1Style ? 'lowp' : 'highp'  // Lower precision for PS1 look
    });

    if (CONFIG.ps1Style) {
        renderer.domElement.classList.add('renderer--ps1');
    }
    applyRenderSize(renderer);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    
    return renderer;
}

/**
 * Set up WebGL context loss and restoration handlers
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene - The scene to re-render
 * @param {THREE.Camera} camera - The camera to use for rendering
 */
export function setupContextHandlers(renderer, scene, camera) {
    renderer.domElement.addEventListener('webglcontextlost', function(event) {
        event.preventDefault();
        console.warn('WebGL context lost. Attempting to restore...');
    }, false);
    
    renderer.domElement.addEventListener('webglcontextrestored', function() {
        console.log('WebGL context restored successfully.');
        
        // Hide any loading message if it's showing
        const loadingEl = document.getElementById('loading');
        if (loadingEl && loadingEl.style.display !== 'none') {
            loadingEl.style.display = 'none';
        }
    }, false);
}

/**
 * Handle window resize events
 * @param {THREE.Camera} camera
 * @param {THREE.WebGLRenderer} renderer
 */
export function onWindowResize(camera, renderer) {
    try {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        // Recomputes the pixel ratio too, so moving the window between displays
        // with different devicePixelRatio is picked up.
        applyRenderSize(renderer);
    } catch (resizeError) {
        console.error('Resize error:', resizeError);
    }
}

/**
 * Log renderer memory and draw call statistics for debugging
 * @param {THREE.WebGLRenderer} renderer
 */
export function logRendererInfo(renderer) {
    const { memory, render } = renderer.info;
    console.table({
        geometries: memory.geometries,
        textures: memory.textures,
        drawCalls: render.calls,
        triangles: render.triangles
    });
}
