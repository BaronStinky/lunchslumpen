# Lunchslumpen

Slumpar fram var du ska äta lunch. Ingen inloggning, ingen backend – allt ligger i webbläsarens localStorage.

## Hur den fungerar

1. Tryck **Var ska vi käka?** – appen hämtar din position och frågar Google Places efter restauranger inom vald radie.
2. En restaurang slumpas fram. **Vi går hit** låser valet, **Slumpa om** tar en annan.
3. Betygsätt besöket 1–5 när ni har ätit (eller markera att ni aldrig gick dit, eller ångra valet).

Regler:

- En besökt restaurang **vilar** i 30 dagar (valbart 7–60) innan den kan slumpas igen.
- Snittbetyg **≤ 2** gör restaurangen **bannad** i 180 dagar räknat från senaste betyget. Därefter får den en ny chans.
- Konstanterna ligger i `src/storage.ts` (`defaultSettings`).

## Köra lokalt

Appen behöver en Google Places API-nyckel (Places API (New)):

```bash
cp .env.example .env.local   # fyll i VITE_GOOGLE_PLACES_KEY
npm install
npm run dev
```

Nyckeln måste tillåta den adress du kör från (HTTP-referrer i Google Cloud), t.ex. `http://localhost:5173/*` för `npm run dev`.

Geolocation kräver HTTPS eller `localhost`, så testa i webbläsaren på datorn eller via en tunnel (t.ex. `npx localtunnel`) på mobilen.

## Deploy

Push till `main` bygger och deployar till GitHub Pages via `.github/workflows/deploy.yml`. Nyckeln läses från repo-secreten `VITE_GOOGLE_PLACES_KEY` (Settings → Secrets and variables → Actions). Saknas den stoppas bygget.

Nyckeln hamnar i den publicerade JS-filen, så begränsa den i Google Cloud till HTTP-referrern `https://baronstinky.github.io/*` och till Places API (New).

## Nästa steg om den uppskattas

- Backend (.NET minimal API + SQLite) så betyg och vila delas mellan kollegor.
- Filter: kök, pris, "bara öppna nu".
