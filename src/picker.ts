import type { Rating, Restaurant, Settings, State, Visit } from './storage';

const DAY_MS = 86_400_000;

function daysSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / DAY_MS;
}

export function averageScore(ratings: Rating[], id: string): number | null {
  const mine = ratings.filter((r) => r.restaurantId === id);
  if (mine.length === 0) return null;
  return mine.reduce((sum, r) => sum + r.score, 0) / mine.length;
}

export type Exclusion = 'resting' | 'banned';

/**
 * Varför en restaurang inte kan väljas just nu, eller null om den är valbar.
 * Bannad kontrolleras före vila så att historiken visar "bannad" när båda gäller.
 */
export function exclusionReason(
  id: string,
  { ratings, visits, settings }: State,
  now = new Date(),
): Exclusion | null {
  const avg = averageScore(ratings, id);
  if (avg !== null && avg <= settings.banThreshold) {
    // Bannad i banDays räknat från senaste betyget. Därefter får den en ny chans.
    const lastRating = latest(ratings, id);
    if (lastRating && daysSince(lastRating.date, now) < settings.banDays) {
      return 'banned';
    }
  }

  const lastVisit = latest(visits, id);
  if (lastVisit && daysSince(lastVisit.date, now) < settings.restDays) {
    return 'resting';
  }

  return null;
}

export function pickRandom(
  candidates: Restaurant[],
  state: State,
  now = new Date(),
): Restaurant | null {
  const eligible = candidates.filter(
    (r) => exclusionReason(r.id, state, now) === null,
  );
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export function distanceMeters(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function latest<T extends { restaurantId: string; date: string }>(
  items: T[],
  id: string,
): T | undefined {
  return items
    .filter((i) => i.restaurantId === id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export type { Settings, Visit };
