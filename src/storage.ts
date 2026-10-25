export interface Restaurant {
  id: string; // Google place id
  name: string;
  lat: number;
  lon: number;
  cuisine?: string;
  website?: string;
}

/** Vald restaurang som väntar på betyg. Avståndet sparas eftersom positionen inte gör det. */
export interface Pending extends Restaurant {
  distance?: number; // meter från där valet gjordes
}

export interface Rating {
  restaurantId: string;
  score: number; // 1–5
  date: string; // ISO
}

export interface Visit {
  restaurantId: string;
  date: string; // ISO
}

export interface Settings {
  radiusMeters: number;
  restDays: number;
  banDays: number;
  banThreshold: number; // snittbetyg <= detta → bannad
}

export interface State {
  ratings: Rating[];
  visits: Visit[];
  pending: Pending | null; // vald men ej betygsatt
  settings: Settings;
}

/** Senaste lyckade hämtningen, så appen funkar när Google Places inte svarar. */
export interface RestaurantCache {
  version: number; // cacher med annan version (t.ex. från en tidigare källa) ignoreras
  lat: number;
  lon: number;
  radius: number;
  fetchedAt: string; // ISO
  restaurants: Restaurant[];
}

const KEY = 'lunchslumpen';
export const KNOWN_KEY = 'lunchslumpen.known';
const CACHE_KEY = 'lunchslumpen.cache';
const CACHE_VERSION = 3; // 3 = Google Places utan hotell. Höj när formatet, källan eller filtret ändras.

export const defaultSettings: Settings = {
  radiusMeters: 1000,
  restDays: 30,
  banDays: 180,
  banThreshold: 2,
};

export function emptyState(): State {
  return { ratings: [], visits: [], pending: null, settings: defaultSettings };
}

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      return {
        ratings: parsed.ratings ?? [],
        visits: parsed.visits ?? [],
        pending: parsed.pending ?? null,
        settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
      };
    }
  } catch {
    // korrupt data → börja om
  }
  return emptyState();
}

export function save(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadCache(): RestaurantCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as RestaurantCache;
    if (
      c.version !== CACHE_VERSION ||
      typeof c.lat !== 'number' ||
      typeof c.lon !== 'number' ||
      typeof c.radius !== 'number' ||
      typeof c.fetchedAt !== 'string' ||
      !Array.isArray(c.restaurants)
    ) {
      return null;
    }
    return c;
  } catch {
    return null; // korrupt cache → behandla som saknad
  }
}

export function saveCache(cache: Omit<RestaurantCache, 'version'>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ version: CACHE_VERSION, ...cache }));
  } catch {
    // fullt localStorage → klara oss utan cache
  }
}

/** Tömmer all sparad data: state, kända restaurangnamn och restaurangcachen. */
export function clearAll(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(KNOWN_KEY);
  localStorage.removeItem(CACHE_KEY);
}
