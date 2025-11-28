/**
 * Scene setup and background management
 */
import * as THREE from 'three';
import { CONFIG } from './config.js';

/**
 * Create and configure the main scene
 * @returns {THREE.Scene}
 */
export function createScene() {
    return new THREE.Scene();
}

/**
 * Create and configure the background scene with gradient shader
 * @returns {Object} Object containing backgroundScene, backgroundCamera, and backgroundMesh
 */
export function createBackgroundScene() {
    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    
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
    
    return { backgroundScene, backgroundCamera, backgroundMesh };
}

/**
 * Set up lighting for the scene
 * @param {THREE.Scene} scene - The scene to add lights to
 */
export function setupLighting(scene) {
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
}

/**
 * Create and configure the camera
 * @returns {THREE.PerspectiveCamera}
 */
export function createCamera() {
    const camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,
        window.innerWidth / window.innerHeight,
        CONFIG.camera.near,
        CONFIG.camera.far
    );
    camera.position.set(CONFIG.camera.position.x, CONFIG.camera.position.y, CONFIG.camera.position.z);
    camera.lookAt(0, 0, 0);
    return camera;
}
