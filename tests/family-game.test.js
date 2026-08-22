const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../family-game-core.js");
const Content = require("../family-game-content.js");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function isolateEssential(state, essentialId, now, stage = 3) {
  for (const memory of Object.values(state.memories)) {
    memory.dueAt = now + 30 * DAY;
    memory.reps = 4;
    memory.stage = 3;
    memory.lastReviewedAt = now - DAY;
    memory.stabilityDays = 3;
  }
  const memory = Core.getMemory(state, "profile-casper", essentialId);
  memory.dueAt = now - HOUR;
  memory.stage = stage;
  memory.reps = 7;
  memory.lastReviewedAt = now - DAY;
  memory.stabilityDays = stage === 6 ? 30 : stage === 4 ? 7 : 3;
  return memory;
}

function attemptForTurn(state, turn, overrides = {}) {
  const match = Core.getMatch(state);
  return {
    actorProfileId: turn.actorProfileId,
    attemptId: overrides.attemptId || `attempt:${turn.turnId}:${overrides.attemptKind || "turn"}`,
    attemptKind: "turn",
    essentialId: turn.essentialId,
    helpStatus: "open",
    matchId: match.matchId,
    occurredAt: overrides.occurredAt || match.startedAt + 1,
    priorAttemptId: turn.priorAttemptId || null,
    priorOutcome: turn.priorOutcome || null,
    turnId: turn.turnId,
    variantId: turn.variantId,
    variantRole: turn.role,
    verdict: "correct",
    wasDue: turn.wasDue,
    ...overrides
  };
}

test("approved question ledger exposes 10 essentials and exactly 40 role variants", () => {
  assert.equal(Content.families.length, 10);
  assert.equal(Content.variants.length, 40);
  assert.equal(new Set(Content.variants.map((variant) => variant.promptFingerprint)).size, 40);
  for (const role of Content.ROLE_ORDER) {
    assert.equal(Content.variants.filter((variant) => variant.variantRole === role).length, 10);
  }
  for (const family of Content.families) {
    assert.deepEqual(family.variants.map((variant) => variant.variantRole), Content.ROLE_ORDER);
    assert.ok(family.variants.every((variant) => variant.rotationGroup === family.essentialId));
  }
});

test("one learner key survives Rune promotion and excludes every variant against Dag", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  const target = "no-mat-g3-posisjonssystem-tiere-enere";
  let state = Core.createSeedState(now);
  isolateEssential(state, target, now, 3);
  const rune = Core.startMatch(state, { challengerProfileId: "profile-rune", matchId: "match-rune", now, subject: "Matematikk" });
  state = rune.state;
  const turn = Core.getCurrentTurn(state);
  const applied = Core.applyAttempt(state, attemptForTurn(state, turn, { attemptId: "attempt-rune-open", occurredAt: now + 1 }));
  state = applied.state;
  const promoted = Core.getMemory(state, "profile-casper", target);
  assert.equal(promoted.stage, 4);
  assert.ok(promoted.dueAt > now + 30 * 60 * 1000);
  assert.equal(Object.keys(state.memories).filter((key) => key.endsWith(target)).length, 1);

  state = Core.abandonMatch(state, now + 2);
  const control = "no-mat-g3-like-grupper-multiplikasjon";
  Core.getMemory(state, "profile-casper", control).dueAt = now;
  const dag = Core.startMatch(state, { challengerProfileId: "profile-dag", matchId: "match-dag", now: now + 30 * 60 * 1000, subject: "Matematikk" });
  assert.ok(dag.match.turnPlan.every((item) => item.essentialId !== target));
  assert.ok(Content.variants.filter((variant) => variant.essentialId === target).every((variant) => !dag.match.turnPlan.some((turnItem) => turnItem.variantId === variant.variantId)));
  assert.equal(Object.keys(dag.state.memories).filter((key) => key.endsWith(target)).length, 1);
});

test("aided recall scores but does not promote and remains due for the next opponent", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  const target = "no-eng-g3-hoflighetsord-please";
  let state = Core.createSeedState(now);
  const before = isolateEssential(state, target, now, 2);
  const dueBefore = before.dueAt;
  state = Core.startMatch(state, { challengerProfileId: "profile-rune", matchId: "match-aided", now, subject: "Engelsk" }).state;
  const baseTurn = Core.getCurrentTurn(state);
  const help = Core.variantFor(target, "help");
  const applied = Core.applyAttempt(state, attemptForTurn(state, baseTurn, {
    attemptId: "attempt-aided",
    helpStatus: "aided",
    variantId: help.variantId,
    variantRole: "help"
  }));
  state = applied.state;
  const after = Core.getMemory(state, "profile-casper", target);
  assert.equal(applied.semanticOutcome, Core.SEMANTIC_OUTCOMES.AIDED_NO_PROMOTE);
  assert.equal(after.stage, 2);
  assert.equal(after.dueAt, dueBefore);
  assert.equal(applied.scoreEvent.pointsDelta, 1);
  assert.equal(state.matchQueueEvents.length, 1);

  state = Core.abandonMatch(state, now + 2);
  const dag = Core.startMatch(state, { challengerProfileId: "profile-dag", matchId: "match-aided-dag", now: now + HOUR, subject: "Engelsk" });
  assert.ok(dag.match.turnPlan.some((turn) => turn.essentialId === target));
});

test("reveal is a neutral auditable requeue with unchanged stage and dueAt", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  const target = "no-nat-g3-arstider-rekkefolge";
  let state = Core.createSeedState(now);
  const before = isolateEssential(state, target, now, 4);
  const dueBefore = before.dueAt;
  state = Core.startMatch(state, { matchId: "match-reveal", now, subject: "Naturfag" }).state;
  const turn = Core.getCurrentTurn(state);
  const applied = Core.applyAttempt(state, attemptForTurn(state, turn, { attemptId: "attempt-reveal", helpStatus: "revealed", verdict: "incorrect" }));
  const after = Core.getMemory(applied.state, "profile-casper", target);
  assert.equal(applied.semanticOutcome, Core.SEMANTIC_OUTCOMES.REVEALED_NO_PROMOTE);
  assert.equal(after.stage, 4);
  assert.equal(after.dueAt, dueBefore);
  assert.equal(applied.state.matchQueueEvents[0].eligibleAfterTurn, 2);
  assert.equal(applied.scoreEvent.pointsDelta, 0);
});

test("dispute and game-master unsure write score only and never learner evidence", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  for (const [mode, verdict] of [["consensus", "disputed"], ["game_master", "unsure"]]) {
    let state = Core.createSeedState(now);
    isolateEssential(state, "no-sam-g3-samene-urfolk", now, 4);
    state = Core.startMatch(state, { adjudicationMode: mode, matchId: `match-${mode}`, now, subject: "Samfunnsfag" }).state;
    const turn = Core.getCurrentTurn(state);
    const before = JSON.stringify(Core.getMemory(state, "profile-casper", turn.essentialId));
    const applied = Core.applyAttempt(state, attemptForTurn(state, turn, { attemptId: `attempt-${mode}`, verdict }));
    assert.equal(applied.reviewEvent, null);
    assert.equal(JSON.stringify(Core.getMemory(applied.state, "profile-casper", turn.essentialId)), before);
    assert.equal(applied.scoreEvent.reason, "house_rule");
  }
});

test("RELEARNING_HOLD preserves mature stages 4 and 6 with a bounded future due", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  for (const stage of [4, 6]) {
    const target = "no-mat-g3-posisjonssystem-tiere-enere";
    let state = Core.createSeedState(now);
    isolateEssential(state, target, now, stage);
    state = Core.startMatch(state, { matchId: `match-hold-${stage}`, now, subject: "Matematikk" }).state;
    const baseTurn = Core.getCurrentTurn(state);
    const comeback = Core.variantFor(target, "comeback");
    const applied = Core.applyAttempt(state, attemptForTurn(state, baseTurn, {
      attemptId: `attempt-hold-${stage}`,
      occurredAt: now + 100,
      priorAttemptId: `prior-failed-${stage}`,
      priorOutcome: Core.SEMANTIC_OUTCOMES.FAILED_OPEN_NO_PROMOTE,
      variantId: comeback.variantId,
      variantRole: "comeback"
    }));
    const after = Core.getMemory(applied.state, "profile-casper", target);
    const max = now + 100 + (stage === 4 ? 7 * DAY : 30 * DAY);
    assert.equal(applied.semanticOutcome, Core.SEMANTIC_OUTCOMES.RELEARNING_HOLD);
    assert.equal(after.stage, stage);
    assert.ok(after.dueAt > now + 100 && after.dueAt <= max);
    assert.equal(applied.scoreEvent.pointsDelta, 3);
  }
});

test("steal always scores two but promotes learner memory only when due", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  const target = "no-nat-g3-sanser-horsel";
  for (const wasDue of [false, true]) {
    let state = Core.createSeedState(now);
    isolateEssential(state, "no-nat-g3-arstider-rekkefolge", now, 3);
    const targetMemory = Core.getMemory(state, "profile-casper", target);
    targetMemory.stage = 3;
    targetMemory.reps = 7;
    targetMemory.lastReviewedAt = now - DAY;
    targetMemory.stabilityDays = 3;
    targetMemory.dueAt = wasDue ? now - HOUR : now + DAY;
    state = Core.startMatch(state, { matchId: `match-steal-${wasDue}`, now, subject: "Naturfag" }).state;
    const match = Core.getMatch(state);
    const adultVariant = Core.variantFor(target, "adult_challenge");
    const beforeVersion = targetMemory.version;
    const applied = Core.applyAttempt(state, {
      actorProfileId: match.learnerProfileId,
      attemptId: `attempt-steal-${wasDue}`,
      attemptKind: "steal",
      essentialId: target,
      helpStatus: "open",
      matchId: match.matchId,
      occurredAt: now + 1,
      turnId: `${match.matchId}:steal-test`,
      variantId: adultVariant.variantId,
      variantRole: "adult_challenge",
      verdict: "correct",
      wasDue
    });
    assert.equal(applied.scoreEvent.pointsDelta, 2);
    assert.equal(Boolean(applied.reviewEvent), wasDue);
    assert.equal(Core.getMemory(applied.state, "profile-casper", target).version, beforeVersion + (wasDue ? 1 : 0));
  }
});

test("same attempt replay is a no-op and changed payload is rejected", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  let state = Core.createSeedState(now);
  state = Core.startMatch(state, { matchId: "match-idempotent", now }).state;
  const turn = Core.getCurrentTurn(state);
  const attempt = attemptForTurn(state, turn, { attemptId: "attempt-stable" });
  const once = Core.applyAttempt(state, attempt);
  const twice = Core.applyAttempt(once.state, attempt);
  assert.equal(twice.duplicate, true);
  assert.equal(twice.state.reviewEvents.length, once.state.reviewEvents.length);
  assert.equal(twice.state.scoreEvents.length, once.state.scoreEvents.length);
  assert.throws(() => Core.applyAttempt(once.state, { ...attempt, verdict: "incorrect" }), /IDEMPOTENCY_CONFLICT/);
});

test("local MVP rejects a second active match for Casper", () => {
  const now = Date.UTC(2026, 6, 15, 12);
  const state = Core.startMatch(Core.createSeedState(now), { matchId: "match-one", now }).state;
  assert.throws(() => Core.startMatch(state, { challengerProfileId: "profile-dag", matchId: "match-two", now }), /ACTIVE_MATCH_EXISTS/);
});

test("whole-snapshot storage falls back without partial learner writes", () => {
  const data = new Map();
  let writes = 0;
  const storage = {
    getItem: (key) => data.get(key) || null,
    removeItem: (key) => data.delete(key),
    setItem(key, value) {
      writes += 1;
      if (writes === 2) throw new Error("disk full");
      data.set(key, value);
    }
  };
  const store = Core.createGameStorage({ now: () => 1000, storage });
  const before = Core.createSeedState(1000);
  const result = store.save(before);
  assert.equal(result.ok, false);
  assert.equal(data.has(Core.STORE_KEY), false);
  assert.equal(data.has(`${Core.STORE_KEY}-staging`), false);
});

test("Family Game is a separate entry point and never uses the Sitter Solo storage key", () => {
  const root = path.join(__dirname, "..");
  const solo = fs.readFileSync(path.join(root, "sitter.html"), "utf8");
  const family = fs.readFileSync(path.join(root, "family-game-core.js"), "utf8");
  assert.match(solo, /sitter-app\.js/);
  assert.match(family, /sitter-family-game-v1/);
  assert.equal(family.includes('"sitter-mvp-v1"'), false);
});

test("mobile entry point is oral-only and loads the approved Family Game boundaries", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "family-game.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "family-game-app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "family-game-styles.css"), "utf8");
  assert.match(html, /family-game-content\.js/);
  assert.match(html, /family-game-core\.js/);
  assert.match(html, /family-game-app\.js/);
  assert.equal(/<textarea|<input/i.test(html), false);
  assert.equal(/<select/i.test(html), false);
  assert.match(app, /Si svaret høyt/);
  assert.match(app, /Ingen antallsvelger/);
  assert.match(app, /consensus/);
  assert.match(app, /game_master/);
  assert.match(css, /docs\/prototypes\/family-game-v02\/styles\.css/);
});

test("production UI exposes help, reveal, steal, comeback and learning-first result copy", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "family-game-app.js"), "utf8");
  for (const phrase of ["Hjelp meg", "Vis meg", "Stjel sjansen", "Opptjent comeback", "Dette lærte Casper"]) {
    assert.match(app, new RegExp(phrase), phrase);
  }
  assert.match(app, /Kamppoeng/);
  assert.match(app, /Caspers minne/);
});
