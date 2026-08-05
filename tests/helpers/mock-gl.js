/** Fixed getParameter() answers, keyed by the queried constant's name. */
const FIXED_PARAMETER_VALUES = {
    VERSION: 'WebGL 2.0',
    SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 3.00',
    VENDOR: 'mock',
    RENDERER: 'mock',
    MAX_VIEWPORT_DIMS: [16384, 16384],
    VIEWPORT: [0, 0, 0, 0],
    SCISSOR_BOX: [0, 0, 0, 0]
};

/** Fallback numeric answer for any MAX_* limit not listed above. */
const DEFAULT_MAX_VALUE = 16384;

/** Fallback numeric answer for every other constant. */
const DEFAULT_PARAMETER_VALUE = 16;

/**
 * Value for gl.getParameter(), given the queried constant's name.
 *
 * Mixed return type is intentional: WebGL's real getParameter() is polymorphic
 * by spec (string, number, or array depending on which constant is queried),
 * and the mock has to match that to stand in for it.
 */
function parameterValue(name) { // NOSONAR (javascript:S3800) — see comment above
    if (name in FIXED_PARAMETER_VALUES) return FIXED_PARAMETER_VALUES[name];
    if (name?.startsWith('MAX_')) return DEFAULT_MAX_VALUE;
    return DEFAULT_PARAMETER_VALUE;
}

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
