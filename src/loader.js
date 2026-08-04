/**
 * Model loading functionality
 */
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { CONFIG } from './config.js';

// Reuse a single loader instance across retries
const loader = new FBXLoader();

/**
 * Loads the FBX model with retry logic
 * @param {THREE.Scene} scene - The scene to add the model to
 * @param {Function} onSuccess - Callback when model loads successfully
 * @param {number} attemptNumber - Current attempt number
 */
export function loadModel(scene, onSuccess, attemptNumber = 1) {
    const loadingEl = document.getElementById('loading');
    
    if (loadingEl && attemptNumber > 1) {
        // Clear and rebuild loading UI for retry attempts
        loadingEl.textContent = '';
        const loadingText = document.createElement('div');
        loadingText.textContent = `Loading... (Attempt ${attemptNumber}/${CONFIG.modelRetryAttempts})`;
        const progressBar = document.createElement('progress');
        progressBar.id = 'progress-bar';
        progressBar.setAttribute('aria-label', 'Loading progress');
        progressBar.max = 100;
        progressBar.value = 0;
        loadingEl.appendChild(loadingText);
        loadingEl.appendChild(progressBar);
    }
    
    loader.load(
        'assets/models/tarelka.fbx',
        function (object) {
            const model = object;
            
            // Apply PS1-style material modifications
            model.traverse((child) => {
                if (child.isMesh) {
                    try {
                        if (CONFIG.ps1Style) {
                            // Enable flat shading for low-poly PS1 look
                            child.material.flatShading = true;
                            
                            // Disable texture filtering for pixelated textures
                            if (child.material.map) {
                                child.material.map.minFilter = THREE.NearestFilter;
                                child.material.map.magFilter = THREE.NearestFilter;
                                child.material.map.generateMipmaps = false;
                            }
                            
                            // Reduce color precision (color banding effect)
                            child.material.dithering = false;
                        } else {
                            // Restore smooth rendering for non-PS1 mode
                            child.material.flatShading = false;
                            
                            // Restore smooth texture filtering
                            if (child.material.map) {
                                child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                                child.material.map.magFilter = THREE.LinearFilter;
                                child.material.map.generateMipmaps = true;
                            }
                            
                            child.material.dithering = false;
                        }
                        
                        child.material.needsUpdate = true;
                    } catch (materialError) {
                        console.error('Error applying material settings:', materialError);
                    }
                }
            });
            
            // Center the model
            try {
                const box = new THREE.Box3().setFromObject(model);
                if (!box.isEmpty()) {
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                }
            } catch (centerError) {
                console.error('Error centering model:', centerError);
            }
            
            scene.add(model);
            
            // Hide loading UI
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
            
            // Call success callback
            if (onSuccess) {
                onSuccess(model);
            }
        },
        function (xhr) {
            // Update progress bar
            const progressBarEl = document.getElementById('progress-bar');
            if (xhr.lengthComputable && progressBarEl) {
                progressBarEl.value = (xhr.loaded / xhr.total) * 100;
            }
        },
        function (error) {
            console.error(`Model loading error (attempt ${attemptNumber}):`, error);
            
            // Retry logic
            if (attemptNumber < CONFIG.modelRetryAttempts) {
                if (loadingEl) {
                    loadingEl.textContent = `Loading failed. Retrying in ${CONFIG.modelRetryDelay / 1000}s...`;
                }
                setTimeout(() => {
                    loadModel(scene, onSuccess, attemptNumber + 1);
                }, CONFIG.modelRetryDelay);
            } else {
                // All retry attempts exhausted
                showLoadingError(loadingEl, error);
            }
        }
    );
}

/**
 * Show loading error with actionable steps
 * @param {HTMLElement} loadingEl - The loading element
 * @param {Error} error - The error object
 */
function showLoadingError(loadingEl, error) {
    if (!loadingEl) return;
    
    loadingEl.innerHTML = '';
    loadingEl.className = 'error-container';
    
    // Create error icon
    const errorIcon = document.createElement('div');
    errorIcon.className = 'error-icon';
    errorIcon.textContent = '⚠️';
    
    // Create error title
    const errorTitle = document.createElement('div');
    errorTitle.className = 'error-title';
    errorTitle.textContent = 'Failed to Load 3D Model';
    
    // Create error details
    const errorDetails = document.createElement('div');
    errorDetails.className = 'error-details';
    errorDetails.textContent = error.message || 'The 3D model could not be loaded after multiple attempts.';
    
    // Create actionable steps
    const errorSteps = document.createElement('div');
    errorSteps.className = 'error-steps';
    const stepsHeading = document.createElement('strong');
    stepsHeading.className = 'error-steps__heading';
    stepsHeading.textContent = 'Troubleshooting steps:';
    const stepsList = document.createElement('ul');
    stepsList.className = 'error-steps__list';
    for (const step of [
        'Check your internet connection',
        'Try refreshing the page',
        'Clear your browser cache',
        'Try a different browser'
    ]) {
        const li = document.createElement('li');
        li.textContent = step;
        stepsList.appendChild(li);
    }
    errorSteps.appendChild(stepsHeading);
    errorSteps.appendChild(stepsList);
    
    // Create retry button
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.textContent = '🔄 Retry Loading';
    retryButton.addEventListener('click', () => location.reload());
    
    loadingEl.appendChild(errorIcon);
    loadingEl.appendChild(errorTitle);
    loadingEl.appendChild(errorDetails);
    loadingEl.appendChild(errorSteps);
    loadingEl.appendChild(retryButton);
}
