export interface Restaurant {
  id: string; // "node/123" eller "way/456" från OSM
  name: string;
  lat: number;
  lon: number;
  cuisine?: string;
  openingHours?: string;
  website?: string;
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
  pending: Restaurant | null; // vald men ej betygsatt
  settings: Settings;
}

const KEY = 'lunchslumpen';

export const defaultSettings: Settings = {
  radiusMeters: 1000,
  restDays: 30,
  banDays: 180,
  banThreshold: 2,
};

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
  return { ratings: [], visits: [], pending: null, settings: defaultSettings };
}

export function save(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}
