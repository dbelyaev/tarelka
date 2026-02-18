/**
 * Snow effect with parallax layers
 */
import { CONFIG } from './config.js';
import { isSnowSeason } from './utils.js';

/**
 * Snowflake class
 */
class Snowflake {
    constructor(canvasWidth, canvasHeight, layer) {
        this.reset(canvasWidth, canvasHeight, layer, true);
    }
    
    reset(canvasWidth, canvasHeight, layer, initial = false) {
        this.x = Math.random() * canvasWidth;
        this.y = initial ? Math.random() * canvasHeight : -10;
        this.layer = layer;
        
        // Layer properties for parallax effect
        // Layer 0 (background): slower, smaller, more transparent
        // Layer 2 (foreground): faster, larger, more opaque
        const layerScale = 0.5 + (layer * 0.3); // 0.5, 0.8, 1.1
        
        this.radius = (1 + Math.random() * 2.5) * layerScale;
        this.speed = (0.5 + Math.random() * 1) * layerScale;
        this.drift = (Math.random() - 0.5) * 0.5 * layerScale;
        this.opacity = (0.3 + Math.random() * 0.4) * layerScale;
        this.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
    
    update(delta) {
        // Fall down
        this.y += this.speed * delta * 60;
        
        // Drift horizontally
        this.x += this.drift * delta * 60;
        
        // Reset if out of bounds
        if (this.y > this.canvasHeight + 10) {
            this.reset(this.canvasWidth, this.canvasHeight, this.layer, false);
        }
        
        // Wrap horizontally
        if (this.x > this.canvasWidth + 10) {
            this.x = -10;
        } else if (this.x < -10) {
            this.x = this.canvasWidth + 10;
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.fillStyle;
        ctx.fill();
    }
}

/**
 * Snow effect manager
 */
export class SnowEffect {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.snowflakes = [];
        
        // Determine snow enabled state: respect user preference, fall back to seasonal default
        const stored = localStorage.getItem('snowEnabled');
        this.enabled = stored !== null ? stored === 'true' : isSnowSeason(CONFIG.snow.winterMonths);
        
        // Style canvas
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        this.canvas.setAttribute('aria-hidden', 'true');
        
        document.body.appendChild(this.canvas);
        
        this.resize();
        this.createSnowflakes();
        
        // Handle window resize
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update all snowflakes with new dimensions
        this.snowflakes.forEach(flake => {
            flake.canvasWidth = this.canvas.width;
            flake.canvasHeight = this.canvas.height;
        });
    }
    
    createSnowflakes() {
        const numFlakes = Math.floor((this.canvas.width * this.canvas.height) / 8000);
        
        // Create 3 layers with different quantities
        const layerDistribution = [0.3, 0.4, 0.3]; // background, middle, foreground
        
        for (let layer = 0; layer < 3; layer++) {
            const count = Math.floor(numFlakes * layerDistribution[layer]);
            for (let i = 0; i < count; i++) {
                this.snowflakes.push(new Snowflake(this.canvas.width, this.canvas.height, layer));
            }
        }
    }
    
    update(delta) {
        if (!this.enabled) return;
        
        this.snowflakes.forEach(flake => flake.update(delta));
    }
    
    draw() {
        if (!this.enabled) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw snowflakes (already in layer order from createSnowflakes)
        this.snowflakes.forEach(flake => flake.draw(this.ctx));
    }
    
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('snowEnabled', this.enabled);
        if (!this.enabled) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    cleanup() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
