/**
 * Application configuration
 */
export const CONFIG = {
    ps1Style: localStorage.getItem('ps1Style') === 'true', // Enable PS1 graphics style (persisted in localStorage)
    ps1PixelScale: 2, // PS1 pixelation level (higher = less pixelated, 1 = no pixelation)
    ps1Jitter: 0.002, // PS1 vertex wobble intensity (higher = more jitter)
    modelRetryAttempts: 3, // Number of times to retry loading the model
    modelRetryDelay: 2000, // Delay in ms between retry attempts
    showFPS: true, // Show FPS counter
    debug: false, // Enable debug monitoring (renderer.info)
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
    snow: {
        winterMonths: [12, 1] // Months when snow is enabled by default (1-indexed: 12=Dec, 1=Jan)
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
