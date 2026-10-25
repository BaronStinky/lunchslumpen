# Lunchslumpen – brief

Liten PWA som slumpar fram var man ska äta lunch. Byggd för Jesper själv till att börja med; kan få delad backend senare om kollegorna gillar den.

## Vad den gör

1. Hämtar användarens position och frågar Google Places API (New) efter restauranger inom vald radie (standard 1000 m). Listan cachas, se Stack.
2. Slumpar fram en restaurang. "Vi går hit" låser valet och registrerar ett besök; "Slumpa om" tar en annan ur samma lista utan att registrera något.
3. Efter "Vi går hit" visas betygskortet med namn, avstånd, vägbeskrivning och hemsida. Användaren betygsätter besöket 1–5, markerar "Vi gick aldrig dit", eller trycker "Ångra" som tar bort besöket (och vilan) helt.
4. "Rensa all data" längst ned (två tryck inom 3 s) tömmer alla localStorage-nycklar och nollställer state.

## Regler (ändra inte utan att fråga)

- **Vila:** besökt restaurang kan inte slumpas igen förrän `restDays` (standard 30) dagar gått sedan senaste besök. Bara "Vi går hit" startar vilan, inte "Slumpa om".
- **Bannad:** snittbetyg ≤ `banThreshold` (standard 2) → utesluten i `banDays` (standard 180) dagar räknat från senaste betyget. Därefter valbar igen. Gäller både bannad och vila visar historiken "bannad".
- Konstanterna ligger i `defaultSettings` i `src/storage.ts`. Radie och vila kan ändras i UI:t.

## Stack

- React 19 + Vite + TypeScript, `vite-plugin-pwa`.
- Ingen backend. All data i `localStorage`:
  - `lunchslumpen` – state (betyg, besök, väntande val, inställningar).
  - `lunchslumpen.known` – restaurangnamn så historiken funkar offline.
  - `lunchslumpen.cache` – senaste lyckade hämtningen: `{ version, lat, lon, radius, fetchedAt, restaurants }`.
- **Google Places:** `POST places:searchNearby` med `includedTypes: ["restaurant"]`, `excludedPrimaryTypes: ["hotel", "lodging"]` (annars kommer hotell med restaurang med), `maxResultCount: 20`, `languageCode: "sv"`, `rankPreference: "POPULARITY"` och en fältmask (id, displayName, location, primaryTypeDisplayName, websiteUri, businessStatus). Ett anrop ger högst 20 träffar och saknar paginering, så radien täcks av sju cirklar som körs parallellt: en i mitten och sex i en hexagon på avståndet `radius * 0.6`, var och en med radien `radius * 0.45`. Resultaten slås ihop och dubbletter tas bort på id. Bara `OPERATIONAL` inom `radius` från användaren tas med. Varje anrop har 10 s timeout; fallerar några men minst ett lyckas används det som kom tillbaka.
- **Mappning:** `id` = place id, `name` = `displayName.text`, `cuisine` = `primaryTypeDisplayName.text`, `website` = `websiteUri`. Vägbeskrivningen länkar till Google Maps med koordinater och `destination_place_id`.
- **API-nyckel:** `VITE_GOOGLE_PLACES_KEY`, läses vid bygget via `import.meta.env` och hamnar därmed i den publicerade JS-filen. Skyddet är nyckelns begränsningar i Google Cloud (HTTP-referrer `baronstinky.github.io`, bara Places API (New)). Lokalt ligger den i `.env.local` (gitignorerad, mall i `.env.example`). Saknas nyckeln visar appen ett tydligt fel.
- **Cache:** en cache är användbar om den har rätt `version` (`CACHE_VERSION` i `src/storage.ts`, höjs när källan, formatet eller filtret ändras), hämtades inom 300 m från nuvarande position och har samma radie. Är den dessutom yngre än 7 dagar används den direkt utan API-anrop. Annars hämtas från Google Places och ett lyckat, icke-tomt svar sparas. Fallerar hämtningen används en användbar cache oavsett ålder, med texten "Använder sparad lista från <datum>". Felmeddelandet "Kunde inte hämta restauranger" visas bara om hämtningen fallerar och ingen användbar cache finns. Gränserna är `CACHE_MAX_AGE_MS` och `CACHE_MAX_DISTANCE_M` i `src/App.tsx`. Service workern cachar inga API-svar.
- Deploy: GitHub Pages via `.github/workflows/deploy.yml` vid push till main, `base: '/lunchslumpen/'` i `vite.config.ts`. Alla asset-sökvägar är relativa. Nyckeln kommer från repo-secreten `VITE_GOOGLE_PLACES_KEY`; saknas den stoppas bygget innan något deployas. Bygget kräver Node ≥ 20.19 (CI kör Node 22).

## Filer

- `src/App.tsx` – allt UI och flödet, inklusive cachelogiken.
- `src/picker.ts` – urvalslogik: vila, bannad, slumpning, avstånd.
- `src/places.ts` – Google Places-klient: rutnät av cirklar, sammanslagning, filtrering, mappning till `Restaurant`.
- `src/storage.ts` – typer, defaults, load/save för state och cache, rensa all data.
- `src/vite-env.d.ts` – typ för `VITE_GOOGLE_PLACES_KEY`.

## Arbetsregler

- Håll det litet. Lägg inte till backend, inloggning, state-bibliotek, UI-ramverk eller nya beroenden utan att fråga.
- Ändra inte, och återaktivera inte, beteende som medvetet tagits bort eller stängts av utan att fråga först.
- Leverera hela filer, inte diffar.
- Svenska i UI och i den här filen. Kod och identifierare på engelska.
- `npm run build` ska gå rent (tsc + vite) innan commit.
- Checka aldrig in API-nyckeln.

## Möjliga nästa steg (inte beslutade)

- .NET minimal API + SQLite så betyg och vila delas mellan kollegor.
- Filter: kök, "bara öppna nu".
