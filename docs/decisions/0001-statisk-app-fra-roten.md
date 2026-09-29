# 0001 — Statisk app, servert fra roten uten byggetrinn

**Dato:** 2026-09-29

**Status:** Vedtatt; plasseringen i roten er erstattet av 0002

## Beslutning

Sitter er en statisk app: HTML, JavaScript og CSS i roten av repoet, uten byggetrinn, uten rammeverk og uten avhengigheter. Vercel serverer filene slik de ligger i git, og `/` går til `sitter.html`.

## Hvorfor

Filene som er gjennomgått i en PR, er de samme filene som serveres, og kjernen `retention-core.js` kan testes i Node uten nettleser. Kildene under viser oppsettet slik det står, ikke alternativene som ble vurdert da det ble valgt; denne fila beskriver oppsettet per datoen over.

## Kilde

- `vercel.json` bygger `*.html`, `*.js` og `*.css` i roten med `@vercel/static`, og ruter `/` til `/sitter.html`.
- `package.json` har bare skriptene `check`, `test` og `content:validate`, ingen avhengigheter og ikke noe byggeskript.
- `docs/child-mvp-notes.md`: elev-MVP-en er den separate statiske inngangen `sitter.html`, som gjenbruker `retention-core.js`.
- README, under «Slik kjører du det»: «Appen er statisk JavaScript + HTML: ingen byggetrinn, ingen rammeverk, ingen avhengigheter.»

## Konsekvens

- App-filene blir liggende i roten, fordi de offentlige URL-ene og de relative stiene mellom sidene peker dit. Derfor har roten flere enn 15 filer; `AGENTS.md` forklarer hver av dem.
- `vercel.json` serverer også `docs/**/*.md` og `content/**/*.json`, så beslutningene i denne mappa er offentlige på den publiserte siden.
- 0002 flyttet kildefilene (JS og CSS) til `core/` og `app/`; de tre HTML-sidene ligger fortsatt i roten.
