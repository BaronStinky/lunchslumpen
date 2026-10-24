import { useEffect, useMemo, useState } from 'react';
import { fetchRestaurants } from './overpass';
import {
  averageScore,
  distanceMeters,
  exclusionReason,
  pickRandom,
} from './picker';
import { load, save, type Restaurant, type State } from './storage';

type Phase =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'searching' }
  | { kind: 'candidate'; restaurant: Restaurant; pool: Restaurant[]; origin: Coords }
  | { kind: 'error'; message: string };

interface Coords {
  lat: number;
  lon: number;
}

export default function App() {
  const [state, setState] = useState<State>(load);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => save(state), [state]);

  // Namn på restauranger vi sett, så historiken kan visa namn även utan nätverk.
  const [known, setKnown] = useState<Record<string, Restaurant>>(() => {
    try {
      return JSON.parse(localStorage.getItem('lunchslumpen.known') ?? '{}');
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem('lunchslumpen.known', JSON.stringify(known));
  }, [known]);

  async function roll() {
    setPhase({ kind: 'locating' });
    let origin: Coords;
    try {
      origin = await getPosition();
    } catch {
      setPhase({ kind: 'error', message: 'Kunde inte hämta din position. Tillåt platsåtkomst och försök igen.' });
      return;
    }

    setPhase({ kind: 'searching' });
    let pool: Restaurant[];
    try {
      pool = await fetchRestaurants(origin.lat, origin.lon, state.settings.radiusMeters);
    } catch {
      setPhase({ kind: 'error', message: 'Overpass svarade inte. Försök igen om en stund.' });
      return;
    }

    setKnown((k) => ({ ...k, ...Object.fromEntries(pool.map((r) => [r.id, r])) }));
    rollFrom(pool, origin);
  }

  function rollFrom(pool: Restaurant[], origin: Coords) {
    const pick = pickRandom(pool, state);
    if (!pick) {
      const n = pool.length;
      setPhase({
        kind: 'error',
        message:
          n === 0
            ? `Inga restauranger inom ${state.settings.radiusMeters} m i OpenStreetMap.`
            : `Alla ${n} restauranger inom radien vilar eller är bannade just nu. Öka radien eller vänta.`,
      });
      return;
    }
    setPhase({ kind: 'candidate', restaurant: pick, pool, origin });
  }

  function accept(r: Restaurant) {
    setState((s) => ({
      ...s,
      pending: r,
      visits: [...s.visits, { restaurantId: r.id, date: new Date().toISOString() }],
    }));
    setPhase({ kind: 'idle' });
  }

  function rate(score: number) {
    const r = state.pending;
    if (!r) return;
    setState((s) => ({
      ...s,
      pending: null,
      ratings: [...s.ratings, { restaurantId: r.id, score, date: new Date().toISOString() }],
    }));
  }

  function skipRating() {
    setState((s) => ({ ...s, pending: null }));
  }

  function updateSetting<K extends keyof State['settings']>(key: K, value: State['settings'][K]) {
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }

  const history = useMemo(() => {
    const ids = new Set([
      ...state.visits.map((v) => v.restaurantId),
      ...state.ratings.map((r) => r.restaurantId),
    ]);
    return [...ids]
      .map((id) => ({
        id,
        name: known[id]?.name ?? id,
        avg: averageScore(state.ratings, id),
        count: state.ratings.filter((r) => r.restaurantId === id).length,
        status: exclusionReason(id, state),
        lastVisit: state.visits
          .filter((v) => v.restaurantId === id)
          .map((v) => v.date)
          .sort()
          .at(-1),
      }))
      .sort((a, b) => (b.lastVisit ?? '').localeCompare(a.lastVisit ?? ''));
  }, [state, known]);

  return (
    <main>
      <h1>Lunchslumpen</h1>

      {state.pending ? (
        <section className="card">
          <p className="label">Hur var det på</p>
          <h2>{state.pending.name}</h2>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="star" onClick={() => rate(n)} aria-label={`${n} av 5`}>
                {n}
              </button>
            ))}
          </div>
          <button className="link" onClick={skipRating}>
            Vi gick aldrig dit
          </button>
        </section>
      ) : phase.kind === 'candidate' ? (
        <Candidate
          restaurant={phase.restaurant}
          origin={phase.origin}
          onAccept={() => accept(phase.restaurant)}
          onReroll={() => rollFrom(phase.pool, phase.origin)}
          poolSize={phase.pool.length}
        />
      ) : (
        <section className="card center">
          {phase.kind === 'error' && <p className="error">{phase.message}</p>}
          <button
            className="primary"
            onClick={roll}
            disabled={phase.kind === 'locating' || phase.kind === 'searching'}
          >
            {phase.kind === 'locating'
              ? 'Hämtar position…'
              : phase.kind === 'searching'
                ? 'Letar restauranger…'
                : 'Var ska vi käka?'}
          </button>
          <p className="muted">
            Inom {state.settings.radiusMeters} m från där du står.
          </p>
        </section>
      )}

      <section className="settings">
        <label>
          Radie
          <select
            value={state.settings.radiusMeters}
            onChange={(e) => updateSetting('radiusMeters', Number(e.target.value))}
          >
            {[300, 500, 750, 1000, 1500, 2000].map((m) => (
              <option key={m} value={m}>
                {m} m
              </option>
            ))}
          </select>
        </label>
        <label>
          Vila
          <select
            value={state.settings.restDays}
            onChange={(e) => updateSetting('restDays', Number(e.target.value))}
          >
            {[7, 14, 30, 60].map((d) => (
              <option key={d} value={d}>
                {d} dagar
              </option>
            ))}
          </select>
        </label>
      </section>

      {history.length > 0 && (
        <section>
          <button className="link" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Dölj historik' : `Historik (${history.length})`}
          </button>
          {showHistory && (
            <ul className="history">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="name">{h.name}</span>
                  <span className="meta">
                    {h.avg !== null ? `${h.avg.toFixed(1)} (${h.count})` : '–'}
                    {h.status === 'resting' && ' · vilar'}
                    {h.status === 'banned' && ' · bannad'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

function Candidate({
  restaurant: r,
  origin,
  onAccept,
  onReroll,
  poolSize,
}: {
  restaurant: Restaurant;
  origin: Coords;
  onAccept: () => void;
  onReroll: () => void;
  poolSize: number;
}) {
  const dist = Math.round(distanceMeters(origin.lat, origin.lon, r.lat, r.lon));
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}&travelmode=walking`;
  return (
    <section className="card">
      <p className="label">Dagens lunch</p>
      <h2>{r.name}</h2>
      <p className="muted">
        {dist} m bort
        {r.cuisine && ` · ${r.cuisine.replace(/_/g, ' ').replace(/;/g, ', ')}`}
      </p>
      {r.openingHours && <p className="muted small">{r.openingHours}</p>}
      <div className="actions">
        <button className="primary" onClick={onAccept}>
          Vi går hit
        </button>
        <button onClick={onReroll}>Slumpa om</button>
      </div>
      <p className="links">
        <a href={maps} target="_blank" rel="noreferrer">
          Vägbeskrivning
        </a>
        {r.website && (
          <>
            {' · '}
            <a href={r.website} target="_blank" rel="noreferrer">
              Hemsida
            </a>
          </>
        )}
      </p>
      <p className="muted small">{poolSize} restauranger i området</p>
    </section>
  );
}

function getPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
