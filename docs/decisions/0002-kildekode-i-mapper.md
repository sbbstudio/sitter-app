# 0002 — Kildekoden i mapper, sidene i roten

**Dato:** 2026-09-29

**Status:** Vedtatt

## Beslutning

JavaScript- og CSS-filene ligger i `core/` (delt kjerne) og `app/` (én undermappe per app: `app/sitter/`, `app/family-game/`, `app/family-practice/`). De tre HTML-sidene `sitter.html`, `family-game.html` og `family-practice.html` blir i roten. Roten har 15 sporede filer: sidene, oppsettet og dokumentene.

## Hvorfor

Roten er innholdsfortegnelsen til repoet. Med 28 filer i roten måtte en leser gå gjennom hele lista for å skille sidene fra kildefilene, og README havnet langt nede under fillista på GitHub. Med kildefilene i mapper ser en tech lead strukturen på ett blikk, og README ligger rett under fillista.

Alternativet var å la alt ligge i roten, slik 0001 beskrev. Det ble forkastet fordi bare HTML-sidene trenger å ligge der: de er de offentlige URL-ene. JS- og CSS-filene lastes med relative stier fra sidene, og de stiene kan peke inn i mapper.

## Kilde

- `vercel.json`: `builds` serverer `*.html` i roten, og `/` går til `/sitter.html`. Kildefilene serveres nå fra `core/*.js`, `app/**/*.js` og `app/**/*.css`.
- De tre HTML-sidene laster kildefilene med relative `<script src>` og `<link href>`, så en ny mappe krever bare nye stier der.

## Konsekvens

- De offentlige HTML-URL-ene (`/`, `/sitter.html`, `/family-game.html`, `/family-practice.html`) er uendret.
- URL-ene til JS- og CSS-filene er endret, for eksempel fra `/retention-core.js` til `/core/retention-core.js`. Ingen eksterne lenker til dem er kjent.
- `family-practice-bootstrap.js` henter `content/...` relativt til sidens URL, ikke fila, og trenger derfor ingen endring.
- En ny kildefil legges i `core/` hvis alle sidene bruker den, ellers i appens mappe under `app/`.
