# Lunchslumpen

Slumpar fram var du ska äta lunch. Ingen inloggning, ingen backend – allt ligger i webbläsarens localStorage.

## Hur den fungerar

1. Tryck **Var ska vi käka?** – appen hämtar din position och frågar OpenStreetMap (via Overpass API) efter restauranger inom vald radie.
2. En restaurang slumpas fram. **Vi går hit** låser valet, **Slumpa om** tar en annan.
3. Nästa gång du öppnar appen får du betygsätta besöket 1–5 (eller markera att ni aldrig gick dit).

Regler:

- En besökt restaurang **vilar** i 30 dagar (valbart 7–60) innan den kan slumpas igen.
- Snittbetyg **≤ 2** gör restaurangen **bannad** i 180 dagar räknat från senaste betyget. Därefter får den en ny chans.
- Konstanterna ligger i `src/storage.ts` (`defaultSettings`).

## Köra lokalt

```bash
npm install
npm run dev
```

Geolocation kräver HTTPS eller `localhost`, så testa i webbläsaren på datorn eller via en tunnel (t.ex. `npx localtunnel`) på mobilen.

## Deploy

`npm run build` ger en statisk `dist/`-mapp. Appen är en PWA och kan läggas på hemskärmen från valfri statisk host: GitHub Pages, Azure Static Web Apps, Cloudflare Pages, Netlify.

## Nästa steg om den uppskattas

- Backend (.NET minimal API + SQLite) så betyg och karantän delas mellan kollegor.
- Byt Overpass mot Google Places om OSM-täckningen känns tunn eller ni vill ha öppettider konsekvent.
- Filter: kök, pris, "bara öppna nu".
