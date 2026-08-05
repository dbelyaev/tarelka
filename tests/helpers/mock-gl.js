/**
 * A mock WebGL2 context, good enough to construct a real THREE.WebGLRenderer.
 *
 * jsdom has no WebGL implementation, so `canvas.getContext('webgl2')` returns
 * null and three.js refuses to initialise. Passing this object as the renderer's
 * `context` option lets the real three.js code run, which is what makes the
 * renderer sizing tests meaningful: they assert how three.js actually derives
 * the drawing buffer and the GL viewport, not a hand-written imitation of it.
 *
 * It records viewport calls and otherwise answers every query with a plausible
 * value. It draws nothing — only the calls made during construction and resizing
 * are meaningful here.
 */
export function makeMockGL() {
    const constantNames = new Map(); // id -> constant name
    const constantIds = {};          // constant name -> id
    let nextId = 1;

    /** Values for gl.getParameter(), keyed by the queried constant's name. */
    function parameterValue(name) {
        if (name === 'VERSION') return 'WebGL 2.0';
        if (name === 'SHADING_LANGUAGE_VERSION') return 'WebGL GLSL ES 3.00';
        if (name === 'VENDOR' || name === 'RENDERER') return 'mock';
        if (name === 'MAX_VIEWPORT_DIMS') return [16384, 16384];
        if (name === 'VIEWPORT' || name === 'SCISSOR_BOX') return [0, 0, 0, 0];
        if (name?.startsWith('MAX_')) return 16384;
        return 16;
    }

    const gl = {
        /** Arguments of the most recent gl.viewport() call: [x, y, width, height]. */
        lastViewport: null,
        viewport: (...args) => { gl.lastViewport = args; },
        getParameter: (id) => parameterValue(constantNames.get(id)),
        getExtension: () => null,
        getSupportedExtensions: () => [],
        getShaderPrecisionFormat: () => ({ rangeMin: 127, rangeMax: 127, precision: 23 }),
        getContextAttributes: () => ({ alpha: true, depth: true, stencil: false, antialias: false }),
        getProgramParameter: () => 1,
        getShaderParameter: () => 1,
        getProgramInfoLog: () => '',
        getShaderInfoLog: () => ''
    };

    return new Proxy(gl, {
        // GL constants are read as properties. Hand out a unique id per name and
        // remember the mapping, so getParameter() can answer in the right type.
        get(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop === 'string' && /^[A-Z0-9_]+$/.test(prop)) {
                if (!(prop in constantIds)) {
                    constantIds[prop] = nextId++;
                    constantNames.set(constantIds[prop], prop);
                }
                return constantIds[prop];
            }
            // Any other method (createTexture, bindBuffer, …) is a no-op returning
            // a fresh object, standing in for an opaque GL resource handle.
            return () => ({});
        },
        has: () => true
    });
}
