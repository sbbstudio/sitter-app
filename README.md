# Sitter — Spaced Repetition for Kunnskap som Skal Sitte

> **Status: Alpha.** Sitter er i aktiv utvikling og testes med ekte brukere (barn + foreldre). Dette repoet viser Sitter-appen — den mer avanserte Beta-motoren (Rune Attention) finnes, er i privat drift, og holdes privat per design. Vi viser produktet, ikke hele plattformen.

[![CI](https://github.com/sbbstudio/sitter-app/actions/workflows/ci.yml/badge.svg)](https://github.com/sbbstudio/sitter-app/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-109%20passing-brightgreen)]()

En statisk, lokal-først læringsapp for varig recall, bygget for barn og familier:

- **Sitter (elev)**: en mobilflyt for 4. klasse, der et barn øver daglig uten å måtte skrive.
- **Sitter Familiespill**: to-spiller, muntlig på samme enhet (barn + voksen), med læringsevidens per læringsmål.
- **Practice-pilot**: «Er du smartere enn barnet ditt?» — 30 voksen–barn-par for 4. trinn.

Ingen server, ingen database, ingen tracking. Appen er statisk og lagrer alt lokalt i nettleseren via en liten vault-wrapper rundt `localStorage`.

---

## 🎮 Prøv det live

**https://sitter-app-review.vercel.app**

- **Sitter (elev)** — https://sitter-app-review.vercel.app/sitter.html
- **Sitter Familiespill** — https://sitter-app-review.vercel.app/family-game.html
- **«Er du smartere enn barnet ditt?»** — https://sitter-app-review.vercel.app/family-practice.html

Ingen installasjon, ingen pålogging — åpne på mobil eller nettbrett og prøv.

---

## Hva prosjektet viser

- **Adaptiv scheduler-design**: en FSRS-inspirert R/S/D-modell (retrievability, stability, difficulty) med 90 % target retention, som lagrer review-logs, responstid og prompt-type slik at scheduler kan byttes til `ts-fsrs` uten å kaste historikken.
- **Testbar arkitektur**: kjernen (`retention-core.js`) er frikoblet fra DOM — scheduleren og innholdslogikken er testbare uten nettleser (109 tester).
- **Lokal-først med migrering**: egne localStorage-nøkler per app, data-migrering ved første åpning, backup av siste gyldige state.
- **Produkttenkning for barn**: muntlig spill, ingen skriving, append-only læringsevidens per læringsmål, foreldre som driver.

---

## Beta (privat)

Sitter deler arkitektur med en mer avansert recall-motor som er i privat drift: full FSRS-inspirert adaptiv modell, mastery-spor på tvers av læringsmål, innsikts-analyse og et kvalitetsgater-system for kortinnhold. Den er bevisst ikke åpen — den er plattformen, ikke produktet. Sitter er det vi viser frem.

---

## Arkitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Sitter (elev-MVP)                      │
│  sitter.html → sitter-app.js → sitter-mechanics.js      │
│  kortpakker: sitter-curriculum*.js                       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│               retention-core.js (DOM-fri)                │
│  scheduler · mastery-score · capture-gate · policy       │
│  ← testbar uten nettleser (node --test)                  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              localStorage-vault (lokal-først)            │
│  per-app nøkler · migrering · backup · eksport/import    │
└─────────────────────────────────────────────────────────┘
```

Kjernen er frikoblet fra UI: samme scheduler driver alle tre appene, og all state er lokal. Ingen nettverkskall, ingen server, ingen sporbarhet utenfor enheten.

---

## Roadmap

- **Nå (Alpha)**: 4. klasse, validerte kortpakker, familiegame og practice-pilot i aktiv testing.
- **Kort sikt**: flere trinn (5.–7. klasse) med validerte kortpakker; bedre dataanalyse for foreldre.
- **Lenger sikt**: kontobasert synkronisering på tvers av enheter (frivillig, opt-in), og en åpen API for læringsmål-innhold.
- **Beta (privat)**: den modne recall-motoren med full R/S/D-modell, mastery-spor og innsikter — holdes privat per design.

---

## Getting Started (English)

A static, local-first spaced repetition app — no build step, no server, no tracking.

```bash
# 1. Clone
git clone https://github.com/sbbstudio/sitter-app.git
cd sitter-app

# 2. Serve statically
python3 -m http.server 4173
# open http://localhost:4173/              (main menu)
# open http://localhost:4174/sitter.html    (Sitter kid MVP)
# open http://localhost:4177/family-game.html  (Family game)
```

### Checks and tests

```bash
npm run check              # syntax-check all JS files
npm test                   # runtime tests for scheduler/storage (109 tests)
npm run content:validate   # validate the Sitter card pack
```

**No build step, no framework, no dependencies.** Plain JavaScript + HTML, testable core, local-first storage.

---

## Kom i gang (for utviklere)

Appen er statisk JavaScript + HTML, ingen byggetrinn.

```bash
# 1. Klone
git clone https://github.com/sbbstudio/sitter-app.git
cd sitter-app

# 2. Kjør statisk server
python3 -m http.server 4173
# åpne http://localhost:4173/
```

### Sjekk og tester

```bash
npm run check                  # syntaks-sjekk alle JS-filer
npm test                       # kjøretidstester (109 tester)
npm run content:validate       # valider sitter-kortpakken
```

---

## Prosjektstruktur

```
sitter.html                 Sitter elev-MVP (4. klasse, mobilflyt)
sitter-app.js               elev-app-logikk
sitter-curriculum.js        kortpakke (generisk)
sitter-curriculum-casper.js kortpakke (Casper, 4. klasse)
sitter-mechanics.js         spillmekanikk
sitter-styles.css           styling for elev-flaten
family-game.html            Sitter Familiespill (2 spillere, muntlig)
family-game-core.js         eneste domene-/write-boundary for spillet
family-game-app.js          spill-app-logikk
family-game-content.js      spillinnhold
family-practice.html        «Er du smartere enn barnet ditt?»-piloten
family-practice-bootstrap.js innlastings- og migreringslogikk
family-practice-content.js  praksisinnhold
retention-core.js           scheduler, mastery-score, capture-gate (DOM-fri)
content/                    maskinlesbar innholdskilde (essentials, packs, schemas)
docs/                       produktnotater og evidens
tests/                      kjøretidstester
scripts/validate-sitter-content.mjs  innholdsvalidering
```

---

## Kjerneapplikasjonene

### Sitter (elev-MVP)

Den aktive elev-appen ligger i `sitter.html`, avgrenset til 4. klasse, med den godkjente mobilflyten: Hjem → Dagens økt → Riktig / nesten / feil → Ferdig for i dag → Langtidsminne → Oppgavehistorikk → Oppfølging.

```bash
python3 -m http.server 4174
# åpne http://localhost:4174/sitter.html
```

Sitter bruker samme scheduler som hovedappen, men har egen styling, egen kortpakke og egen localStorage-nøkkel (`sitter-mvp-v1`). Ved første åpning migreres relevante data fra den tidligere `casper-quest-retention-v1`-nøkkelen uten å slette originalen.

### Sitter Familiespill

Den separate, mobile 2-spillerinngangen ligger i `family-game.html`. Ett barn og én voksen spiller muntlig på samme enhet; barnet trenger aldri skrive. Oppsettet velger spiller, konsensus eller voksen game master, trinn og fag.

Family Game bruker `family-game-core.js` som eneste domene-/write-boundary og egen lokal snapshot-nøkkel (`sitter-family-game-v1`). Læringseviden er nøkklet på lærende × læringsmål og deles på tvers av spill — kamppoeng og kampkø er separate baner. Sitter Solo er urørt.

Practice-piloten «Er du smartere enn barnet ditt?» ligger separat i `family-practice.html` med egen snapshot-nøkkel.

```bash
python3 -m http.server 4177
# åpne http://localhost:4177/family-game.html
# eller http://localhost:4177/family-practice.html
```

---

## Scheduler-modellen

MVP-intervaller, transparent og med vilje:

- Feil: 5 min
- Første «Kan»: 5 min
- Andre «Kan»: 1 time
- Deretter: 1 dag, 3 dager, 1 uke, 2 uker, 1 måned, 3 måneder, 6 måneder
- «Slet» = riktig, men shaky — holder kortet på kort intervall
- «Lett» hopper ett ekstra steg

Etter læringsstegene bruker scheduleren en FSRS-inspirert modell: `difficulty`, `stabilityDays` og `retrievability` ved review påvirker neste intervall. Data-modellen lagrer review logs, responstid, prompt-type, kilde, `needsRewrite`, difficulty og stability. Intervaller, proof-gates, coverage- og pace-krav er samlet i `RETENTION_POLICY`.

---

## Lisens og merknader

MIT-lisens — se [LICENSE](LICENSE). Innholdet i kortpakkene er basert på norsk pensum (Udir/Grep) og markert for gjennomgang der det testes med barn. Ingen API-nøkler eller personopplysninger ligger i repoet.
