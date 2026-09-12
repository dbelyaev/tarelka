/**
 * Coordinates a set of mutually-exclusive weather effects (snow, rain, ...).
 * Each entry is { effect, label } where `effect` exposes `.enabled` and `.toggle()`.
 */
export function createWeatherGroup(weathers) {
    // Enforce the invariant at construction time too, in case stale localStorage
    // has more than one effect enabled (e.g. a future third effect ships enabled by default).
    const alreadyEnabled = weathers.filter(w => w.effect.enabled);
    alreadyEnabled.slice(1).forEach(w => w.effect.toggle());

    return {
        toggle(target) {
            weathers.forEach(w => {
                if (w !== target && w.effect.enabled) w.effect.toggle();
            });
            target.effect.toggle();
        }
    };
}
