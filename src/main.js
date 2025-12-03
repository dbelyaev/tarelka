/**
 * Main application entry point
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { checkWebGLSupport, debounce, disposeMaterial } from './utils.js';
import { createScene, createBackgroundScene, setupLighting, createCamera } from './scene.js';
import { createRenderer, setupContextHandlers, onWindowResize } from './renderer.js';
import { loadModel } from './loader.js';
import { initializeControls, updateRotation } from './controls.js';
import { SnowEffect } from './snow.js';

// Wait for DOM to be fully loaded
function initializeApp() {
    console.log('Initializing application...');
    
    // Check WebGL support before initializing
    if (!checkWebGLSupport()) {
        document.body.innerHTML = `
            <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);max-width:500px;text-align:center;padding:30px;color:white;background:rgba(0,0,0,0.9);border-radius:12px;font-family:Arial,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                <div style="font-size:48px;margin-bottom:20px;">⚠️</div>
                <div style="font-size:22px;margin-bottom:15px;font-weight:bold;">WebGL Not Supported</div>
                <div style="font-size:14px;line-height:1.6;color:#ccc;margin-bottom:20px;">
                    Your browser doesn't support WebGL, which is required to view this 3D content.
                </div>
                <div style="font-size:13px;color:#999;line-height:1.5;">
                    Please update to a modern browser:<br>
                    <strong style="color:#fff;">Chrome, Firefox, Safari, or Edge</strong>
                </div>
            </div>
        `;
        throw new Error('WebGL not supported');
    }

    // Initialize scene components
    const scene = createScene();
    const { backgroundScene, backgroundCamera, backgroundMesh } = createBackgroundScene();
    const camera = createCamera();
    const renderer = createRenderer();

    setupLighting(scene);
    document.body.appendChild(renderer.domElement);

    // Initialize snow effect
    let snowEffect;
    try {
        snowEffect = new SnowEffect();
        console.log('Snow effect initialized');
    } catch (error) {
        console.error('Failed to initialize snow effect:', error);
        snowEffect = { 
            update: () => {}, 
            draw: () => {}, 
            toggle: () => {}, 
            cleanup: () => {},
            enabled: false 
        };
    }

    // Initialize controls
    const { mouseState, cleanup: cleanupControls } = initializeControls();

    // Model reference
    let model = null;

    // Setup context handlers (pass scene and camera for proper restoration)
    setupContextHandlers(renderer, scene, camera);

    // Load the model
    loadModel(scene, (loadedModel) => {
        model = loadedModel;
    });

    // Animation state
    const clock = new THREE.Clock();
    let jitterTime = 0;
    let animationId;

    // FPS counter
    const fpsCounter = document.getElementById('fps-counter');
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    if (CONFIG.showFPS && fpsCounter) {
        fpsCounter.style.display = 'block';
    }

    /**
     * Main animation loop
     */
    function animate() {
        animationId = requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        if (CONFIG.ps1Style) {
            jitterTime += delta;
        }
        
        // Update FPS counter
        if (CONFIG.showFPS && fpsCounter) {
            frameCount++;
            const now = performance.now();
            if (now >= lastFpsUpdate + 1000) {
                const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
                fpsCounter.textContent = `FPS: ${fps}`;
                frameCount = 0;
                lastFpsUpdate = now;
            }
        }
        
        // Update snow effect
        snowEffect.update(delta);
        
        // Clear and render
        renderer.clear();
        renderer.render(backgroundScene, backgroundCamera);
        renderer.clearDepth();
        
        // Update model rotation and position
        if (model) {
            updateRotation(model, mouseState, delta);
            
            if (CONFIG.ps1Style) {
                // Apply PS1-style vertex jitter/wobble
                model.position.x = Math.sin(jitterTime * 10) * CONFIG.ps1Jitter;
                model.position.y = Math.cos(jitterTime * 15) * CONFIG.ps1Jitter;
                model.position.z = Math.sin(jitterTime * 12) * CONFIG.ps1Jitter;
            }
        }
        
        // Render main scene
        try {
            renderer.render(scene, camera);
        } catch (renderError) {
            console.error('Render error:', renderError);
        }
        
        // Draw snow effect on top
        snowEffect.draw();
    }

    /**
     * Cleanup function to remove all event listeners and dispose of Three.js resources
     */
    function cleanup() {
        // Dispose of model geometries and materials
        if (model) {
            model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => disposeMaterial(mat));
                        } else {
                            disposeMaterial(child.material);
                        }
                    }
                }
            });
            
            scene.remove(model);
            model = null;
        }
        
        // Dispose background materials and geometries
        if (backgroundMesh) {
            if (backgroundMesh.geometry) {
                backgroundMesh.geometry.dispose();
            }
            if (backgroundMesh.material) {
                disposeMaterial(backgroundMesh.material);
            }
        }
        
        // Dispose renderer
        if (renderer) {
            renderer.dispose();
        }
        
        // Remove controls event listeners
        cleanupControls();
        
        // Cleanup snow effect
        snowEffect.cleanup();
        
        // Remove resize listener
        window.removeEventListener('resize', debouncedResize);
    }

    // Expose cleanup function globally
    window.cleanupThreeJS = cleanup;

    // Attach resize event listener
    const debouncedResize = debounce(() => onWindowResize(camera, renderer), CONFIG.resize.debounceMs);
    window.addEventListener('resize', debouncedResize);

    // Keyboard toggle for PS1 style and snow effect
    document.addEventListener('keydown', (e) => {
        console.log('Key pressed:', e.key); // Debug log
        
        if (e.key === 'p' || e.key === 'P') {
            CONFIG.ps1Style = !CONFIG.ps1Style;
            localStorage.setItem('ps1Style', CONFIG.ps1Style);
            
            const notification = document.createElement('div');
            notification.textContent = `PS1 Style: ${CONFIG.ps1Style ? 'ON' : 'OFF'} (reloading...)`;
            notification.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:12px 24px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;z-index:10001;';
            document.body.appendChild(notification);
            
            setTimeout(() => location.reload(), 800);
        }
        
        if (e.key === 's' || e.key === 'S') {
            snowEffect.toggle();
            
            const notification = document.createElement('div');
            notification.textContent = `Snow Effect: ${snowEffect.enabled ? 'ON' : 'OFF'}`;
            notification.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:12px 24px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;z-index:10001;';
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 2000);
        }
    });

    // Pause/resume animation when tab visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        } else {
            animate();
        }
    });

// Start animation loop
animate();

// Expose for debugging
window.snowEffect = snowEffect;
console.log('Application initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    initializeApp();
}
