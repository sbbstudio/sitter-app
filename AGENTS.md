# AGENTS.md

Lokale regler for alle som endrer dette repoet, mennesker og agenter. Felles byggeregler ligger utenfor dette repoet; denne fila legger bare til.

## Mappene

- `.github/` — CI-arbeidsflyten (`workflows/ci.yml`), PR-malen og CODEOWNERS.
- `app/` — kildefilene sidene laster, én undermappe per app:
  - `app/sitter/` — Sitter (elev).
  - `app/family-game/` — familiespillet; `family-game-core.js` og stilene brukes også av practice-piloten.
  - `app/family-practice/` — practice-piloten.
- `content/` — maskinlesbar innholdskilde (essentials, packs, schemas); se `content/README.md`.
- `core/` — delt kjerne som alle tre sidene laster.
- `docs/` — produktnotater og evidens, og `docs/decisions/` med én fil per beslutning.
- `scripts/` — innholdsvalideringen bak `npm run content:validate`.
- `tests/` — kjøretidstester for `node --test`.

Ingen nye løse filer i roten. En ny fil legges i en av mappene over; passer ingen, spør før du legger til en.

## Rotfilene

Roten har 15 sporede filer: de tre sidene, oppsettet og dokumentene. Sidene ligger i roten fordi Vercel serverer dem som offentlige URL-er (`vercel.json`); kildefilene de laster ligger i `core/` og `app/`.

Sider:

- `sitter.html` — Sitter elev-MVP (4. klasse, mobilflyt). Vercel sender `/` hit.
- `family-game.html` — Sitter Familiespill (2 spillere, muntlig).
- `family-practice.html` — practice-piloten «Er du smartere enn barnet ditt?».

Oppsett:

- `package.json` — skriptene `check`, `test` og `content:validate`; ingen avhengigheter.
- `package-lock.json` — låsefil for `package.json`; liten fordi det ikke er avhengigheter.
- `vercel.json` — hvilke filer Vercel serverer statisk, og at `/` går til `sitter.html`.
- `.gitignore` — ignorerte filer (miljøfiler, `.vercel`, skrapte filer, skrape-cache og `node_modules/`).
- `.env.example` — mal for miljøvariabler (`TAVILY_API_KEY`).
- `.prettierrc` — formateringsoppsett som følger kodens semikolon og doble anførselstegn. Koden er ikke kjørt gjennom Prettier.
- `.editorconfig` — editor-standard: UTF-8, LF, to mellomrom, fjernet mellomrom på linjeslutt, linjeskift til slutt.

Dokumenter:

- `README.md` — hva dette er, hvordan det kjøres, mappene, regler.
- `AGENTS.md` — denne fila.
- `CLAUDE.md` — importerer denne fila.
- `CHANGELOG.md` — merkbare endringer, nyeste først.
- `LICENSE` — MIT-lisensen.

## Kildefilene

`core/` — delt kjerne:

- `retention-core.js` — scheduler, mastery-score og capture-gate, uten DOM. Alle tre sidene laster den.

`app/sitter/` — Sitter (elev):

- `sitter-app.js` — elev-app-logikk.
- `sitter-mechanics.js` — spillmekanikk.
- `sitter-curriculum.js` — kortpakke (generisk).
- `sitter-curriculum-casper.js` — kortpakke (Casper, 4. klasse).
- `sitter-styles.css` — styling for elev-flaten.

`app/family-game/` — familiespillet:

- `family-game-core.js` — eneste domene- og write-boundary for spillet; brukes også av practice-piloten.
- `family-game-app.js` — spill-app-logikk.
- `family-game-content.js` — spillinnhold.
- `family-game-base.css` — grunnstilen som `family-game-styles.css` importerer fra samme mappe.
- `family-game-styles.css` — styling for familiespillet og practice-piloten.

`app/family-practice/` — practice-piloten:

- `family-practice-bootstrap.js` — innlastings- og migreringslogikk for practice-piloten.
- `family-practice-content.js` — praksisinnhold.

## Store filer

Ingen sporede filer over 1 MB. Den største er `core/retention-core.js`, rundt 100 kB.

## Regler

- Appen er statisk: ingen byggetrinn, ingen rammeverk, ingen avhengigheter. Filene serveres slik de ligger i git.
- Før en PR: `npm run check`, `npm test` og `npm run content:validate` skal gå grønt. CI kjører de samme tre.
- `core/retention-core.js` deles av alle tre appene; en endring der treffer alle tre.
- Ikke finn på tall. Testtall, antall spørsmål og lignende i README skal stemme med det kommandoene over skriver ut.
- Spørsmålsordlyd gjennomgås i `content/` først; se `content/README.md`.
- Prettier kjøres aldri på hele filer i en PR som endrer logikk; en eventuell omformatering får egen PR.
- Repoet er offentlig. Ingen API-nøkler eller personopplysninger i repoet.
- Varige beslutninger skrives i `docs/decisions/`, én fil per beslutning.
