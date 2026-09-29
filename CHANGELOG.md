# Changelog

Merkbare endringer i Sitter står her, nyeste først. Formatet følger [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Lagt til

- `AGENTS.md` og `CLAUDE.md`, så repoet forklarer mappene, hver rotfil og de lokale reglene.
- `docs/decisions/`, som starter med beslutningen om en statisk app servert fra roten uten byggetrinn.
- PR-mal og CODEOWNERS.
- `.prettierrc`, `.editorconfig` og `package-lock.json`.
- Forklaringer i koden på engelsk: modulhode i alle 13 kildefiler i `core/` og `app/`, kontrakter ved de viktige funksjonene og hvorfor-kommentarer ved vern og invarianter. Ingen logikk er endret.

### Endret

- Kildefilene er flyttet fra roten til `core/` og `app/` (`app/sitter/`, `app/family-game/`, `app/family-practice/`); de tre HTML-sidene ligger fortsatt i roten, og roten har nå 15 sporede filer. Se `docs/decisions/0002-kildekode-i-mapper.md`.
- README har de fire faste overskriftene på norsk, og alle lokale adresser bruker port 4173.

### Rettet

- Familiespillet og practice-piloten mistet grunnstilen på Vercel, fordi `family-game-styles.css` importerte den fra `docs/prototypes/`, som ga 404. Grunnstilen ligger nå i `family-game-base.css` i roten, og den nye testen `tests/static-assets.test.js` sjekker at alle lokale skript og stiler sidene laster finnes.
