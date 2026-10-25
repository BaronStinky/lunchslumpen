# Lunchslumpen – brief

Liten PWA som slumpar fram var man ska äta lunch. Byggd för Jesper själv till att börja med; kan få delad backend senare om kollegorna gillar den.

## Vad den gör

1. Hämtar användarens position och frågar OpenStreetMap (Overpass API) efter restauranger inom vald radie (standard 1000 m).
2. Slumpar fram en restaurang. "Vi går hit" låser valet och registrerar ett besök; "Slumpa om" tar en annan utan att registrera något.
3. Nästa gång appen öppnas får användaren betygsätta besöket 1–5, eller markera "Vi gick aldrig dit".

## Regler (ändra inte utan att fråga)

- **Vila:** besökt restaurang kan inte slumpas igen förrän `restDays` (standard 30) dagar gått sedan senaste besök. Bara "Vi går hit" startar vilan, inte "Slumpa om".
- **Bannad:** snittbetyg ≤ `banThreshold` (standard 2) → utesluten i `banDays` (standard 180) dagar räknat från senaste betyget. Därefter valbar igen.
- Konstanterna ligger i `defaultSettings` i `src/storage.ts`. Radie och vila kan ändras i UI:t.

## Stack

- React 19 + Vite + TypeScript, `vite-plugin-pwa`.
- Ingen backend. All data i `localStorage` (`lunchslumpen` för state, `lunchslumpen.known` för restaurangnamn så historiken funkar offline).
- Overpass-anrop med fallback till en andra spegel. Overpass-svar cachas inte av service workern.
- Deploy: GitHub Pages via `.github/workflows/deploy.yml`, `base: '/lunchslumpen/'` i `vite.config.ts`. Alla asset-sökvägar är relativa.

## Filer

- `src/App.tsx` – allt UI och flödet.
- `src/picker.ts` – urvalslogik: vila, bannad, slumpning, avstånd.
- `src/overpass.ts` – Overpass-klient och mappning till `Restaurant`.
- `src/storage.ts` – typer, defaults, load/save.

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
