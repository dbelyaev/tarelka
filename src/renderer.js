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
    const pixelScale = CONFIG.ps1Style ? CONFIG.ps1PixelScale : 1;
    renderer.setSize(
        window.innerWidth / pixelScale, 
        window.innerHeight / pixelScale
    );
    
    if (CONFIG.ps1Style) {
        renderer.domElement.style.width = window.innerWidth + 'px';
        renderer.domElement.style.height = window.innerHeight + 'px';
        renderer.domElement.style.imageRendering = 'pixelated'; // CSS for sharp pixels
        renderer.setPixelRatio(1); // Force 1:1 pixel ratio for PS1 look
    } else {
        renderer.setPixelRatio(window.devicePixelRatio);
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
        const pixelScale = CONFIG.ps1Style ? CONFIG.ps1PixelScale : 1;
        renderer.setSize(
            window.innerWidth / pixelScale, 
            window.innerHeight / pixelScale
        );
        
        if (CONFIG.ps1Style) {
            renderer.domElement.style.width = window.innerWidth + 'px';
            renderer.domElement.style.height = window.innerHeight + 'px';
        }
    } catch (resizeError) {
        console.error('Resize error:', resizeError);
    }
}
