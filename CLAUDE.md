# Lunchslumpen – brief

Liten PWA som slumpar fram var man ska äta lunch. Byggd för Jesper själv till att börja med; kan få delad backend senare om kollegorna gillar den.

## Vad den gör

1. Hämtar användarens position och frågar OpenStreetMap (Overpass API) efter restauranger inom vald radie (standard 1000 m). Listan cachas, se Stack.
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
  - `lunchslumpen.cache` – senaste lyckade Overpass-svaret: `{ lat, lon, radius, fetchedAt, restaurants }`.
- **Cache:** en cache är användbar om den hämtades inom 300 m från nuvarande position med samma radie. Är den dessutom yngre än 7 dagar används den direkt utan Overpass-anrop. Annars hämtas från Overpass och ett lyckat, icke-tomt svar sparas. Fallerar Overpass används en användbar cache oavsett ålder, med texten "Använder sparad lista från <datum>". Felmeddelande visas bara om Overpass fallerar och ingen användbar cache finns. Gränserna är `CACHE_MAX_AGE_MS` och `CACHE_MAX_DISTANCE_M` i `src/App.tsx`.
- **Overpass:** tre servrar i tur och ordning, var och en med egen timeout via `AbortController`: `overpass-api.de` (15 s), `overpass.private.coffee` (8 s), `overpass.kumi.systems` (8 s). Frågan har `[timeout:25]`. Overpass-svar cachas inte av service workern.
- Deploy: GitHub Pages via `.github/workflows/deploy.yml` vid push till main, `base: '/lunchslumpen/'` i `vite.config.ts`. Alla asset-sökvägar är relativa. Bygget kräver Node ≥ 20.19 (CI kör Node 22).

## Filer

- `src/App.tsx` – allt UI och flödet, inklusive cachelogiken.
- `src/picker.ts` – urvalslogik: vila, bannad, slumpning, avstånd.
- `src/overpass.ts` – Overpass-klient med speglar och timeouter, mappning till `Restaurant`.
- `src/storage.ts` – typer, defaults, load/save för state och cache, rensa all data.

## Arbetsregler

- Håll det litet. Lägg inte till backend, inloggning, state-bibliotek, UI-ramverk eller nya beroenden utan att fråga.
- Ändra inte, och återaktivera inte, beteende som medvetet tagits bort eller stängts av utan att fråga först.
- Leverera hela filer, inte diffar.
- Svenska i UI och i den här filen. Kod och identifierare på engelska.
- `npm run build` ska gå rent (tsc + vite) innan commit.

## Möjliga nästa steg (inte beslutade)

- .NET minimal API + SQLite så betyg och vila delas mellan kollegor.
- Byt till Google Places om OSM-täckningen är tunn eller för konsekventa öppettider.
- Filter: kök, "bara öppna nu".
