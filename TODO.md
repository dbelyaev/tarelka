# TODO

## Weather effects
- Fog / overcast — full-screen gradient/overlay effect. Doesn't fit the `CanvasEffect` particle
  model; needs a new lightweight overlay abstraction (or a plain CSS layer with its own
  toggle/localStorage logic, reusing `createWeatherGroup` only for the `.enabled`/`.toggle()`/
  `hasExplicitPreference` contract).
- Thunder / lightning — momentary flash + optional audio cue, not a continuous per-frame
  particle system. Needs a distinct "momentary event" abstraction, not the
  update()/draw()-every-frame model. Currently WMO thunderstorm codes (95/96/99) approximate
  to the `rain` effect in `src/live-weather.js` as a stand-in.
