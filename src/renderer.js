/**
 * Renderer setup and configuration
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * Create and configure the WebGL renderer
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer() {
    const renderer = new THREE.WebGLRenderer({ 
        antialias: !CONFIG.ps1Style,  // PS1 had no antialiasing
        precision: CONFIG.ps1Style ? 'lowp' : 'highp'  // Lower precision for PS1 look
    });
    
    // PS1-style low resolution (scale down for pixelated look)
    if (CONFIG.ps1Style) {
        renderer.setSize(
            window.innerWidth / CONFIG.ps1PixelScale,
            window.innerHeight / CONFIG.ps1PixelScale,
            false // Don't set inline CSS — let .renderer--ps1 control display size
        );
        renderer.domElement.classList.add('renderer--ps1');
        renderer.setPixelRatio(1); // Force 1:1 pixel ratio for PS1 look
    } else {
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio));
    }
    
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
        
        // Maintain PS1-style low resolution if enabled
        if (CONFIG.ps1Style) {
            renderer.setSize(
                window.innerWidth / CONFIG.ps1PixelScale,
                window.innerHeight / CONFIG.ps1PixelScale,
                false // Don't set inline CSS — let .renderer--ps1 control display size
            );
        } else {
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
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
