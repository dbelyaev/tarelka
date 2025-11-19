import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Configuration
const CONFIG = {
    ps1Style: true, // Enable PS1 graphics style
    ps1PixelScale: 2, // PS1 pixelation level (higher = less pixelated, 1 = no pixelation)
    ps1Jitter: 0.002, // PS1 vertex wobble intensity (higher = more jitter)
    modelRetryAttempts: 3, // Number of times to retry loading the model
    modelRetryDelay: 2000, // Delay in ms between retry attempts
    showFPS: true, // Show FPS counter
    rotation: {
        speed: 0.5,
        inertia: 0.95, // Inertia damping factor (0-1, closer to 1 = more inertia)
        returnSpeed: 0.02 // Speed of returning to default rotation
    },
    mouse: {
        sensitivity: 0.008, // Mouse rotation sensitivity
        minDragDistance: 5 // Minimum pixels to consider as drag
    },
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 1, z: 2 }
    },
    lighting: {
        ambient: 1.0,
        directional1: { intensity: 2.5, position: { x: 2, y: 2, z: 2 } },
        directional2: { intensity: 2.0, position: { x: -2, y: 0, z: -2 } },
        point: { intensity: 1.5, position: { x: 0, y: 3, z: 0 } },
        top: { intensity: 1.5, position: { x: 0, y: 5, z: 0 } }
    },
    resize: {
        debounceMs: 100
    },
    background: {
        colors: [
            [1.0, 0.6, 0.0],  // acid orange
            [1.0, 0.0, 1.0],  // magenta
            [1.0, 0.0, 0.0],  // red
            [0.5, 0.0, 0.5],  // purple
            [0.0, 1.0, 0.0],  // green
            [0.0, 1.0, 1.0],  // cyan
            [0.0, 0.0, 1.0]   // blue
        ]
    }
};

// Set up scenes, camera, and renderer
const scene = new THREE.Scene();
const backgroundScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far
);
const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

// Note: antialias and precision are WebGL context parameters set at initialization
// and cannot be changed at runtime. Toggling ps1Style will only affect other settings.
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
document.body.appendChild(renderer.domElement);

// Handle WebGL context loss and restoration
renderer.domElement.addEventListener('webglcontextlost', function(event) {
    event.preventDefault();
    console.warn('WebGL context lost. Attempting to restore...');
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.textContent = 'Graphics context lost. Restoring...';
    }
}, false);

renderer.domElement.addEventListener('webglcontextrestored', function() {
    console.log('WebGL context restored.');
    const loadingEl = document.getElementById('loading');
    if (loadingEl && model) {
        loadingEl.style.display = 'none';
    }
    // Re-render scene after context restoration
    if (model) {
        renderer.render(scene, camera);
    }
}, false);

// Set up background gradient
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const randomColor = CONFIG.background.colors[Math.floor(Math.random() * CONFIG.background.colors.length)];

const fragmentShader = `
    varying vec2 vUv;
    uniform vec3 fillColor;
    void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        vec3 darkColor = fillColor * 0.2;
        vec3 color = mix(fillColor, darkColor, dist * 1.25);
        gl_FragColor = vec4(color, 1.0);
    }
`;

const backgroundMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        fillColor: { value: new THREE.Vector3(randomColor[0], randomColor[1], randomColor[2]) }
    }
});

const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
backgroundScene.add(backgroundMesh);

// Set up lighting
const ambientLight = new THREE.AmbientLight(0xffffff, CONFIG.lighting.ambient);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, CONFIG.lighting.directional1.intensity);
directionalLight.position.set(
    CONFIG.lighting.directional1.position.x,
    CONFIG.lighting.directional1.position.y,
    CONFIG.lighting.directional1.position.z
);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, CONFIG.lighting.directional2.intensity);
directionalLight2.position.set(
    CONFIG.lighting.directional2.position.x,
    CONFIG.lighting.directional2.position.y,
    CONFIG.lighting.directional2.position.z
);
scene.add(directionalLight2);

const pointLight = new THREE.PointLight(0xffffff, CONFIG.lighting.point.intensity);
pointLight.position.set(
    CONFIG.lighting.point.position.x,
    CONFIG.lighting.point.position.y,
    CONFIG.lighting.point.position.z
);
scene.add(pointLight);

const topLight = new THREE.DirectionalLight(0xffffff, CONFIG.lighting.top.intensity);
topLight.position.set(
    CONFIG.lighting.top.position.x,
    CONFIG.lighting.top.position.y,
    CONFIG.lighting.top.position.z
);
scene.add(topLight);

// Position camera
camera.position.set(CONFIG.camera.position.x, CONFIG.camera.position.y, CONFIG.camera.position.z);
camera.lookAt(0, 0, 0);

// Load the FBX model
const loader = new FBXLoader();
let model;
let loadAttempts = 0;

const loadingEl = document.getElementById('loading');
const progressFill = document.getElementById('progress-fill');

/**
 * Loads the FBX model with retry logic
 * @param {number} attemptNumber - Current attempt number
 */
function loadModel(attemptNumber = 1) {
    loadAttempts = attemptNumber;
    
    if (loadingEl && attemptNumber > 1) {
        // Clear and rebuild loading UI for retry attempts
        loadingEl.textContent = '';
        const loadingText = document.createElement('div');
        loadingText.textContent = `Loading... (Attempt ${attemptNumber}/${CONFIG.modelRetryAttempts})`;
        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        const progressFill = document.createElement('div');
        progressFill.id = 'progress-fill';
        progressBar.appendChild(progressFill);
        loadingEl.appendChild(loadingText);
        loadingEl.appendChild(progressBar);
    }

    loader.load(
        'assets/models/tarelka.fbx',
        function (object) {
            model = object;

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
                        // Continue with default material if modification fails
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
                // Continue without centering if it fails
            }
            
            scene.add(model);

            // Hide loading UI
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
        },
        function (xhr) {
            // Update progress bar
            const progressFillEl = document.getElementById('progress-fill');
            if (xhr.lengthComputable && progressFillEl) {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                progressFillEl.style.width = percentComplete + '%';
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
                    loadModel(attemptNumber + 1);
                }, CONFIG.modelRetryDelay);
            } else {
                // All retry attempts exhausted
                if (loadingEl) {
                    loadingEl.textContent = '';
                    
                    // Create error message elements
                    const errorTitle = document.createElement('div');
                    errorTitle.style.color = '#ff6b6b';
                    errorTitle.textContent = 'Failed to load model';
                    
                    const errorDetails = document.createElement('div');
                    errorDetails.style.fontSize = '12px';
                    errorDetails.style.marginTop = '10px';
                    errorDetails.textContent = error.message || 'Please check your connection and refresh the page';
                    
                    const retryButton = document.createElement('button');
                    retryButton.id = 'retry-button';
                    retryButton.style.marginTop = '15px';
                    retryButton.style.padding = '8px 16px';
                    retryButton.style.background = 'white';
                    retryButton.style.border = 'none';
                    retryButton.style.borderRadius = '4px';
                    retryButton.style.cursor = 'pointer';
                    retryButton.style.fontFamily = 'Arial, sans-serif';
                    retryButton.textContent = 'Retry';
                    retryButton.addEventListener('click', () => location.reload());
                    
                    loadingEl.appendChild(errorTitle);
                    loadingEl.appendChild(errorDetails);
                    loadingEl.appendChild(retryButton);
                }
            }
        }
    );
}

// Start loading the model
loadModel();

const clock = new THREE.Clock();

// PS1-style vertex jitter effect
let jitterTime = 0;

// Mouse interaction state
const mouseState = {
    isDragging: false,
    previousX: 0,
    previousY: 0,
    startX: 0,
    startY: 0,
    velocityX: 0,
    velocityY: 0,
    rotationX: 0, // Current additional rotation from user interaction
    rotationY: 0,
    defaultRotationY: 0 // Track default auto-rotation
};

// Mouse event handlers
function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        mouseState.isDragging = true;
        mouseState.startX = event.clientX;
        mouseState.startY = event.clientY;
        mouseState.previousX = event.clientX;
        mouseState.previousY = event.clientY;
        mouseState.velocityX = 0;
        mouseState.velocityY = 0;
        document.body.style.cursor = 'grabbing';
    }
}

function onMouseMove(event) {
    if (mouseState.isDragging) {
        const deltaX = event.clientX - mouseState.previousX;
        const deltaY = event.clientY - mouseState.previousY;
        
        // Check if moved enough to be considered a drag
        const totalDrag = Math.abs(event.clientX - mouseState.startX) + 
                         Math.abs(event.clientY - mouseState.startY);
        
        if (totalDrag > CONFIG.mouse.minDragDistance) {
            mouseState.velocityX = deltaX * CONFIG.mouse.sensitivity;
            mouseState.velocityY = deltaY * CONFIG.mouse.sensitivity;
            
            mouseState.rotationY += mouseState.velocityX;
            mouseState.rotationX += mouseState.velocityY;
            
            // Clamp X rotation to avoid flipping
            mouseState.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseState.rotationX));
        }
        
        mouseState.previousX = event.clientX;
        mouseState.previousY = event.clientY;
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        mouseState.isDragging = false;
        document.body.style.cursor = 'default';
    }
}

// Touch support for mobile
function onTouchStart(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        mouseState.isDragging = true;
        mouseState.startX = touch.clientX;
        mouseState.startY = touch.clientY;
        mouseState.previousX = touch.clientX;
        mouseState.previousY = touch.clientY;
        mouseState.velocityX = 0;
        mouseState.velocityY = 0;
        event.preventDefault();
    }
}

function onTouchMove(event) {
    if (mouseState.isDragging && event.touches.length === 1) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - mouseState.previousX;
        const deltaY = touch.clientY - mouseState.previousY;
        
        const totalDrag = Math.abs(touch.clientX - mouseState.startX) + 
                         Math.abs(touch.clientY - mouseState.startY);
        
        if (totalDrag > CONFIG.mouse.minDragDistance) {
            mouseState.velocityX = deltaX * CONFIG.mouse.sensitivity;
            mouseState.velocityY = deltaY * CONFIG.mouse.sensitivity;
            
            mouseState.rotationY += mouseState.velocityX;
            mouseState.rotationX += mouseState.velocityY;
            
            mouseState.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseState.rotationX));
        }
        
        mouseState.previousX = touch.clientX;
        mouseState.previousY = touch.clientY;
        event.preventDefault();
    }
}

function onTouchEnd(event) {
    mouseState.isDragging = false;
}

// Attach mouse event listeners
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);

// Attach touch event listeners for mobile
window.addEventListener('touchstart', onTouchStart, { passive: false });
window.addEventListener('touchmove', onTouchMove, { passive: false });
window.addEventListener('touchend', onTouchEnd);

/**
 * Cleanup function to remove all event listeners
 * Call this if the app needs to be unloaded or reinitialized
 */
function cleanup() {
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', debounce(onWindowResize, CONFIG.resize.debounceMs));
}

// Expose cleanup function globally if needed
window.cleanupThreeJS = cleanup;

// FPS counter
const fpsCounter = document.getElementById('fps-counter');
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;

// Show FPS counter if enabled in config
if (CONFIG.showFPS && fpsCounter) {
    fpsCounter.style.display = 'block';
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    if (CONFIG.ps1Style) {
        jitterTime += delta;
    }

    // Update FPS counter
    if (CONFIG.showFPS && fpsCounter) {
        frameCount++;
        const now = performance.now();
        if (now >= lastFpsUpdate + 1000) {
            fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
            fpsCounter.textContent = `FPS: ${fps}`;
            frameCount = 0;
            lastFpsUpdate = now;
        }
    }

    // Clear everything
    renderer.clear();

    // Render background
    renderer.render(backgroundScene, backgroundCamera);

    // Enable depth testing for 3D objects
    renderer.clearDepth();
    
    // Rotate the model if it's loaded
    if (model) {
        try {
            // Apply inertia when not dragging
            if (!mouseState.isDragging) {
                // Apply damping to velocities
                mouseState.velocityX *= CONFIG.rotation.inertia;
                mouseState.velocityY *= CONFIG.rotation.inertia;
                
                // Apply remaining velocity
                mouseState.rotationY += mouseState.velocityX;
                mouseState.rotationX += mouseState.velocityY;
                
                // Gradually return to default rotation
                mouseState.rotationX *= (1 - CONFIG.rotation.returnSpeed);
                mouseState.rotationY *= (1 - CONFIG.rotation.returnSpeed);
                
                // Stop applying velocity when it's very small
                if (Math.abs(mouseState.velocityX) < 0.00001) mouseState.velocityX = 0;
                if (Math.abs(mouseState.velocityY) < 0.00001) mouseState.velocityY = 0;
            }
            
            // Continue default auto-rotation
            mouseState.defaultRotationY += delta * CONFIG.rotation.speed;
            
            // Apply combined rotation: default + user interaction
            model.rotation.y = mouseState.defaultRotationY + mouseState.rotationY;
            model.rotation.x = mouseState.rotationX;
            
            if (CONFIG.ps1Style) {
                // Apply PS1-style vertex jitter/wobble
                model.position.x = Math.sin(jitterTime * 10) * CONFIG.ps1Jitter;
                model.position.y = Math.cos(jitterTime * 15) * CONFIG.ps1Jitter;
                model.position.z = Math.sin(jitterTime * 12) * CONFIG.ps1Jitter;
            }
        } catch (animationError) {
            console.error('Animation error:', animationError);
            // Continue animation loop even if there's an error
        }
    }

    // Render the main scene
    try {
        renderer.render(scene, camera);
    } catch (renderError) {
        console.error('Render error:', renderError);
        // Rendering will continue on next frame
    }
}

/**
 * Handles window resize events by updating the camera and renderer dimensions.
 * This ensures the 3D scene maintains proper proportions when the browser window
 * is resized.
 * 
 * The function:
 * 1. Updates the camera's aspect ratio to match the new window dimensions
 * 2. Recalculates the camera's projection matrix
 * 3. Resizes the renderer to match the new window dimensions (with PS1 pixelation if enabled)
 */
function onWindowResize() {
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
        // Continue without resizing if there's an error
    }
}

/**
 * Creates a debounced version of a function that delays its execution
 * until after a specified wait time has elapsed since the last call.
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to wait before executing
 * @returns {Function} A debounced version of the input function
 * 
 * This is useful for performance optimization when handling frequent events
 * like window resizing. Instead of executing the handler on every resize event,
 * it waits until the resizing has stopped for the specified wait time.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Attach the resize event listener with debouncing
window.addEventListener('resize', debounce(onWindowResize, CONFIG.resize.debounceMs));

animate();
