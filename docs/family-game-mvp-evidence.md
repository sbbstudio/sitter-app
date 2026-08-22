# Sitter Family Game two-player MVP — review evidence

## Build boundary

- Task: `Implement Sitter Family Game two-player MVP`
- Base: `origin/main@58d08a826ffaa6783a37f45cd19668f6802e5e74`
- Branch: `feat/family-game-mvp`
- Entry point: `family-game.html`
- Local review URL: `http://127.0.0.1:4177/family-game.html`
- Storage boundary: `sitter-family-game-v1`
- Sitter Solo storage and runtime surfaces are unchanged.

## Approved inputs

The implementation follows the five approved upstream gates recorded on the task:

1. Product & System Spec v0.1
2. Scoring & Adjudication Validation v0.3
3. Learner Memory & Match State Contract
4. Canonical 40-row Question Variant Ledger v0.2
5. Approved Family Game visual direction at design commit `9802afc5a58de4545a75722c6ed766d97654f242`

The approved visual artifact was cherry-picked as `9eca962` and `27b21d6`. Its nine 390×844 reference renders remain under `docs/prototypes/family-game-v02/evidence/`.

## Delivered MVP

- Separate mobile, one-device, two-player Family Game; no production merge or deploy.
- Casper plays Rune or Dag with one stable learner identity and one learner-memory row per Learning Essential.
- Fixed third-grade pilot, subject choice, all due essentials in the selected slice, and no arbitrary question-count picker.
- Oral child flow with no text field: question, spoken answer, reveal, consensus or adult game-master adjudication, help, neutral reveal/requeue, steal, comeback, score and learning-first result.
- Exactly 40 explicit variants across 10 Learning Essentials: child core, adult challenge, help and comeback.
- Separate append-only AttemptEvent, ReviewEvent, ScoreEvent and MatchQueueEvent lanes.
- `FamilyGameRetentionAdapter` is the only learning-state projection boundary.
- Aided, revealed, disputed and unsure outcomes cannot promote learner memory.
- `RELEARNING_HOLD` retains a mature stage and schedules a bounded future retrieval without a reset.
- A promoted non-due essential is excluded as a whole family, including all variants, for Casper's next opponent.
- Whole-snapshot local persistence with staging and backup recovery, idempotent attempts and one-active-match protection.

## Automated evidence

Commands run from the feature worktree:

```text
npm run check        PASS
npm test             PASS — 124/124
git diff --check     PASS
```

New contract tests prove:

- 10 essentials / 40 unique role variants and prompt fingerprints.
- Rune promotion persists to the same Casper learner key and excludes every variant against Dag.
- Aided correct scores +1 but does not promote and remains due.
- Reveal writes a neutral auditable requeue with unchanged stage and due date.
- Consensus dispute and game-master unsure write no ReviewEvent and do not mutate LearnerMemory.
- `RELEARNING_HOLD` preserves stages 4 and 6 and produces a bounded future due date.
- Steal scores +2 and promotes only when the Learning Essential was due.
- Attempt replay is idempotent and conflicting replay is rejected.
- A second active Casper match is rejected.
- Failed snapshot persistence does not leave a partial learner write.
- Family Game is a separate oral-only entry point and never uses the Solo storage key.

## Runtime trace

```text
Rune → Dag
  memoryKey: profile-casper::no-mat-g3-posisjonssystem-tiere-enere
  stage: 3 → 4
  Dag target excluded: true
  memory rows for target: 1

Aided
  semanticOutcome: AIDED_NO_PROMOTE
  points: 1
  stage: 2 → 2
  due unchanged: true
  queue reason: aided

Dispute
  score reason: house_rule
  reviewEvent: null
  memory version: 0

RELEARNING_HOLD
  points: 3
  stage: 6 → 6
  bounded future due: true
```

HTTP checks returned 200 for:

- `/family-game.html`
- `/family-game-app.js`
- `/sitter.html`

`git diff origin/main` is empty for `sitter.html`, `sitter-app.js`, `sitter-styles.css`, `sitter-curriculum.js`, `sitter-curriculum-casper.js` and `sitter-mechanics.js`.

## Known review requirement

The in-app browser runtime was unavailable in this execution environment (`agent.browsers.list()` returned an empty list), so a production-entry screenshot could not be captured without bypassing the required browser harness. The implementation reuses the approved artifact's DOM/CSS direction, but the reviewer must still inspect the actual branch preview at mobile width before approval.

## Review ask

Please return PASS or REVISE on:

1. Mobile one-device setup and complete oral play loop.
2. Child-friendly visual fidelity to the approved v0.2 direction.
3. ScoreEvent/ReviewEvent separation and no-promotion invariants.
4. Cross-opponent Casper memory behavior.
5. No regression to Sitter Solo.

Allowed task state is `Review`; this implementation is not self-approved and must not be merged to `main` without the downstream review gate.
