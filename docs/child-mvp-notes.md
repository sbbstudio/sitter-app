# Hukomm - Student MVP Notes

Date: 2026-06-19

## Product Direction

Target buyer/user decision-maker: parents.

Target learner for the MVP: Norwegian students in 4th grade. Grades 1-10 remain the longer product direction, not the validation scope.

Architecture decision: keep Rune Retention OS intact. The active student MVP is the separate static entry `sitter.html`, which reuses `retention-core.js` but owns its curriculum, styling and localStorage key. `kid.html` is retained temporarily as a regression reference.

## Curriculum Source

Primary source: Udir LK20 via Grep REST API.

- Grep documentation: https://www.udir.no/om-udir/data/kl06-grep/
- Grep API base: https://data.udir.no/kl06/v201906/
- Dataset note: https://data.norge.no/nb/datasets/fa902439-06bb-4036-8cb2-f81c7814e45c/laereplaner-og-fag-i-kunnskapsloftet

Important curriculum nuance: the first content pack is still based on early primary Udir/Grep material. Product direction has moved broader: 4th-10th grade, with separate future card packs per age band.

Scraper:

```bash
npm run scrape:curriculum
npm run scrape:assets:dry
```

Output:

```bash
data/udir-grade3-curriculum.json
data/scraped/learning-assets.json
```

Tavily layer: `scripts/scrape-learning-assets.mjs` discovers image candidates, task-source candidates and curriculum-source candidates per card. It does not publish scraped images directly into the app. Image bytes are only downloaded with `--download-images` plus a domain allowlist, and production use requires source/license review.

## Earlier Style Inspiration

Inspected local repos:

- `/Users/runeoverland/Projects/Caspers_Chest`
- `/Users/runeoverland/Projects/caspers-chest-v2`

Useful patterns to keep selectively:

- Parent mode separate from student mode.
- Reward/progress loop controlled by parent.
- Strong character can work as a small companion/signature.

Patterns to reduce:

- Quest/chest/reward language as the main product voice.
- Large hero mascot as first-viewport focus.
- Bright green/pink/gold identity from v2.
- 390 x 844 mobile-first Figma base.

MVP adaptation:

- Use a broader student-learning surface for 4th-10th grade.
- Keep one task per screen: see task, write answer, app checks, next task.
- Parent panel shows due, reps, progress per subject, curriculum source, long-memory progress and a concrete krav/belønning contract.
- Do not expose `Klarte`, `Superlett` or spoken recall to the student flow. Correctness should come from the answer.
- Support 4th grade as the first pack. Higher grades need separate card packs before they are exposed as real choices.
- Support subject filtering for Alle, Matte, Norsk, Engelsk, Naturfag and Samfunn. The student should see progress for the active grade/subject scope.

## Current MVP Files

- `sitter.html`
- `sitter-styles.css`
- `sitter-app.js`
- `sitter-curriculum.js`
- `tests/sitter-mvp.test.js`

Legacy regression files:

- `kid.html`
- `kid-styles.css`
- `kid-app.js`
- `kid-curriculum.js` with 25 autogradable base cards, 5 grade-4 challenge cards and accepted answers/keywords.
- `assets/casper/*`
- `scripts/scrape-udir-grade3.mjs`
- `tests/kid-curriculum.test.js`
- Parent setup is saved in the Hukomm local state: session target, avtale type and reward text.

## Next Product Pass

1. Replace generic image hints with subject-specific generated or licensed images.
2. Generate separate 5th-7th and 8th-10th grade card packs before exposing those grade choices.
3. Add a real reward loop: parent-approved incentives tied to 1-month memory, not just same-day completion.
4. Add parent override only for open reflection cards, outside the student flow.
