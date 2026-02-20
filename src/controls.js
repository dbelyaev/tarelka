/**
 * Mouse and touch controls for model interaction
 */
import { CONFIG } from './config.js';

/**
 * Initialize mouse and touch controls
 * @returns {Object} Mouse state object and cleanup function
 */
export function initializeControls() {
    const mouseState = {
        isDragging: false,
        previousX: 0,
        previousY: 0,
        startX: 0,
        startY: 0,
        velocityX: 0,
        velocityY: 0,
        rotationX: 0,
        rotationY: 0,
        defaultRotationY: 0
    };
    
    // Mouse event handlers
    function onMouseDown(event) {
        if (event.button === 0) {
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
            
            const totalDrag = Math.abs(event.clientX - mouseState.startX) + 
                             Math.abs(event.clientY - mouseState.startY);
            
            if (totalDrag > CONFIG.mouse.minDragDistance) {
                mouseState.velocityX = deltaX * CONFIG.mouse.sensitivity;
                mouseState.velocityY = deltaY * CONFIG.mouse.sensitivity;
                
                mouseState.rotationY += mouseState.velocityX;
                mouseState.rotationX += mouseState.velocityY;
                
                mouseState.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseState.rotationX));
            }
            
            mouseState.previousX = event.clientX;
            mouseState.previousY = event.clientY;
        }
    }
    
    function onMouseUp(event) {
        if (event.button === 0) {
            mouseState.isDragging = false;
            document.body.style.cursor = '';
        }
    }
    
    // Touch event handlers
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
        if (mouseState.isDragging) {
            mouseState.isDragging = false;
            event.preventDefault();
        }
    }
    
    // Attach event listeners
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    
    // Cleanup function
    function cleanup() {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
    }
    
    return { mouseState, cleanup };
}

/**
 * Update model rotation based on mouse state
 * @param {Object} model - The 3D model
 * @param {Object} mouseState - Mouse state object
 * @param {number} delta - Time delta
 */
export function updateRotation(model, mouseState, delta) {
    if (!model) return;
    
    try {
        // Apply inertia when not dragging
        if (!mouseState.isDragging) {
            mouseState.velocityX *= CONFIG.rotation.inertia;
            mouseState.velocityY *= CONFIG.rotation.inertia;
            
            mouseState.rotationY += mouseState.velocityX;
            mouseState.rotationX += mouseState.velocityY;
            
            mouseState.rotationX *= (1 - CONFIG.rotation.returnSpeed);
            mouseState.rotationY *= (1 - CONFIG.rotation.returnSpeed);
            
            if (Math.abs(mouseState.velocityX) < 0.00001) mouseState.velocityX = 0;
            if (Math.abs(mouseState.velocityY) < 0.00001) mouseState.velocityY = 0;
        }
        
        // Continue default auto-rotation
        mouseState.defaultRotationY += delta * CONFIG.rotation.speed;
        
        // Apply combined rotation
        model.rotation.y = mouseState.defaultRotationY + mouseState.rotationY;
        model.rotation.x = mouseState.rotationX;
    } catch (error) {
        console.error('Rotation update error:', error);
    }
}
