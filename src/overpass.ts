import type { Restaurant } from './storage';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// En server som hänger ska inte blockera – efter så här lång tid går vi vidare till nästa spegel.
const TIMEOUT_MS = 8_000;

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function fetchRestaurants(
  lat: number,
  lon: number,
  radius: number,
): Promise<Restaurant[]> {
  // nwr = node/way/relation. "out center" ger en mittpunkt för ytor (byggnader).
  const query = `
    [out:json][timeout:10];
    nwr(around:${radius},${lat},${lon})["amenity"="restaurant"]["name"];
    out center tags;
  `;

  let lastError: unknown;
  for (const url of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = (await res.json()) as { elements: OverpassElement[] };
      return json.elements
        .map(toRestaurant)
        .filter((r): r is Restaurant => r !== null);
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error('Overpass otillgänglig');
}

function toRestaurant(el: OverpassElement): Restaurant | null {
  const name = el.tags?.name;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!name || lat === undefined || lon === undefined) return null;
  return {
    id: `${el.type}/${el.id}`,
    name,
    lat,
    lon,
    cuisine: el.tags?.cuisine,
    openingHours: el.tags?.opening_hours,
    website: el.tags?.website ?? el.tags?.['contact:website'],
  };
}
