export interface Restaurant {
  id: string; // "node/123" eller "way/456" från OSM
  name: string;
  lat: number;
  lon: number;
  cuisine?: string;
  openingHours?: string;
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

const KEY = 'lunchslumpen';
export const KNOWN_KEY = 'lunchslumpen.known';

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

/** Tömmer all sparad data: state och kända restaurangnamn. */
export function clearAll(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(KNOWN_KEY);
}
