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
        ambient: 1,
        directional1: { intensity: 2.5, position: { x: 2, y: 2, z: 2 } },
        directional2: { intensity: 2, position: { x: -2, y: 0, z: -2 } },
        point: { intensity: 1.5, position: { x: 0, y: 3, z: 0 } },
        top: { intensity: 1.5, position: { x: 0, y: 5, z: 0 } }
    },
    renderer: {
        maxPixelRatio: 2 // Cap devicePixelRatio to avoid excessive fill rate on 3x+ HiDPI displays
    },
    snow: {
        winterMonths: [12, 1], // Months when snow is enabled by default (1-indexed: 12=Dec, 1=Jan)
        flakesPerArea: 8000 // Viewport area (px²) per snowflake
    },
    rain: {
        dropsPerArea: 12000, // Viewport area (px²) per raindrop — lower density than snow since each drop is a longer streak
        length: { min: 10, max: 20 }, // Streak length in canvas px, pre-CSS-upscale
        speed: { min: 6, max: 16 }, // Fall speed along the skew direction
        angle: { min: 30, max: 45 }, // Degrees from vertical; one base value rolled per RainEffect instance
        angleJitter: 6, // Degrees of per-drop wobble applied around the shared base angle
        lineWidth: 2,
        opacity: { min: 0.4, max: 0.8 } // Quantized to 0.1 for batched stroke() calls
    },
    wind: {
        streaksPerArea: 15000, // Viewport area (px²) per streak — sparser than rain since streaks are long & thin
        length: { min: 20, max: 50 },
        speed: { min: 4, max: 12 },
        angle: { min: 0, max: 10 }, // Degrees off horizontal; one base value rolled per WindEffect instance
        angleJitter: 8,
        lineWidth: 1,
        opacity: { min: 0.15, max: 0.4 } // Deliberately faint — wind is implied motion, not a solid mass
    },
    sleet: {
        dropsPerArea: 10000, // Between snow's 8000 and rain's 12000
        length: { min: 6, max: 12 }, // Shorter than rain's streaks
        speed: { min: 3, max: 8 }, // Between snow's drift and rain's fall speed
        angle: { min: 8, max: 18 }, // Steeper (more vertical) than rain's 30-45
        angleJitter: 4,
        drift: { min: -0.3, max: 0.3 }, // Independent horizontal wobble applied each frame, snow-style
        lineWidth: 1.5,
        opacity: { min: 0.3, max: 0.6 }
    },
    liveWeather: {
        latitude: 58.97, // Stavanger, Norway
        longitude: 5.73,
        cacheTtlMs: 15 * 60 * 1000, // Avoid hammering the free API on every reload
        fetchTimeoutMs: 3000,
        windSpeedThresholdKmh: 30 // ~Beaufort 5 "fresh breeze" — judgment call
    },
    performance: {
        mobileParticleScale: 0.6 // Density multiplier for snow/rain/wind/sleet particle counts on coarse-pointer (mobile-class) devices
    },
    resize: {
        debounceMs: 100
    },
    background: {
        colors: [
            [1, 0.6, 0],  // acid orange
            [1, 0, 1],  // magenta
            [1, 0, 0],  // red
            [0.5, 0, 0.5],  // purple
            [0, 1, 0],  // green
            [0, 1, 1],  // cyan
            [0, 0, 1]   // blue
        ]
    }
};
