import { distanceMeters } from './picker';
import type { Restaurant } from './storage';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.primaryTypeDisplayName',
  'places.websiteUri',
  'places.businessStatus',
].join(',');
const TIMEOUT_MS = 10_000;
const METERS_PER_DEGREE_LAT = 111_320;

/** Kastas när VITE_GOOGLE_PLACES_KEY saknades vid bygget. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('VITE_GOOGLE_PLACES_KEY saknas');
    this.name = 'MissingApiKeyError';
  }
}

interface Place {
  id: string;
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string };
  websiteUri?: string;
  businessStatus?: string;
}

interface Circle {
  lat: number;
  lon: number;
  radius: number;
}

/**
 * Nearby Search ger högst 20 träffar per anrop och saknar paginering, så radien
 * täcks av sju mindre cirklar (mitten + en hexagon runtom) som körs parallellt.
 */
export async function fetchRestaurants(
  lat: number,
  lon: number,
  radius: number,
): Promise<Restaurant[]> {
  const key = import.meta.env.VITE_GOOGLE_PLACES_KEY;
  if (!key) throw new MissingApiKeyError();

  const results = await Promise.allSettled(
    coverCircle(lat, lon, radius).map((c) => searchNearby(c, key)),
  );
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (ok.length === 0) {
    throw (results[0] as PromiseRejectedResult).reason;
  }

  const byId = new Map<string, Restaurant>();
  for (const place of ok.flat()) {
    if (place.businessStatus !== 'OPERATIONAL' || byId.has(place.id)) continue;
    const r = toRestaurant(place);
    if (r && distanceMeters(lat, lon, r.lat, r.lon) <= radius) byId.set(r.id, r);
  }
  return [...byId.values()];
}

function coverCircle(lat: number, lon: number, radius: number): Circle[] {
  const small = radius * 0.45;
  const ring = radius * 0.6;
  const metersPerDegreeLon = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
  const circles: Circle[] = [{ lat, lon, radius: small }];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    circles.push({
      lat: lat + (ring * Math.sin(angle)) / METERS_PER_DEGREE_LAT,
      lon: lon + (ring * Math.cos(angle)) / metersPerDegreeLon,
      radius: small,
    });
  }
  return circles;
}

async function searchNearby(circle: Circle, key: string): Promise<Place[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        maxResultCount: 20,
        languageCode: 'sv',
        rankPreference: 'POPULARITY',
        locationRestriction: {
          circle: {
            center: { latitude: circle.lat, longitude: circle.lon },
            radius: circle.radius,
          },
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Places ${res.status}`);
    const json = (await res.json()) as { places?: Place[] };
    return json.places ?? []; // inga träffar → fältet saknas helt
  } finally {
    clearTimeout(timer);
  }
}

function toRestaurant(place: Place): Restaurant | null {
  const name = place.displayName?.text;
  const loc = place.location;
  if (!name || !loc) return null;
  return {
    id: place.id,
    name,
    lat: loc.latitude,
    lon: loc.longitude,
    cuisine: place.primaryTypeDisplayName?.text,
    website: place.websiteUri,
  };
}
