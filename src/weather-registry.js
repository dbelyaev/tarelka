/**
 * Every weather effect the app offers. `name` must match the effect names
 * produced by live-weather.js, and `key` is the lowercase keyboard shortcut.
 * Kept separate from main.js (which boots the app on import) so tests can
 * validate the registry directly.
 */
import { SnowEffect } from './snow.js';
import { RainEffect } from './rain.js';
import { WindEffect } from './wind.js';
import { SleetEffect } from './sleet.js';

export const WEATHER_DEFINITIONS = [
    { name: 'snow', label: 'Snow', key: 's', create: () => new SnowEffect() },
    { name: 'rain', label: 'Rain', key: 'r', create: () => new RainEffect() },
    { name: 'wind', label: 'Wind', key: 'w', create: () => new WindEffect() },
    { name: 'sleet', label: 'Sleet', key: 'l', create: () => new SleetEffect() }
];
