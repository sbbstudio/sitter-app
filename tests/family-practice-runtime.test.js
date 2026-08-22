const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const DefaultCore = require("../family-game-core.js");
const Runtime = require("../family-practice-content.js");

const root = path.resolve(__dirname, "..");
const pack = JSON.parse(fs.readFileSync(path.join(root, "content/packs/no/grade-4/casper-family-practice-v1.json"), "utf8"));
const collection = JSON.parse(fs.readFileSync(path.join(root, "content/essentials/no/grade-4/family-practice-v1.json"), "utf8"));
const Content = Runtime.createContent(pack, collection);
const Core = DefaultCore.createForContent(Content);

test("practice runtime exposes all 30 paired families without changing the default game", () => {
  assert.equal(Content.families.length, 30);
  assert.equal(Content.variants.length, 120);
  assert.equal(Content.targetGrade, 4);
  assert.equal(Content.releaseStatus, "review");
  assert.equal(Content.pedagogyReview.status, "reviewed_for_pilot");
  assert.equal(Content.memoryPolicy.stealWritesLearnerMemory, false);
  assert.equal(Content.scoringPolicy.adultCorrect, 3);
  assert.equal(Content.storeKey, "sitter-casper-family-practice-v1");
  assert.notEqual(Content.storeKey, DefaultCore.STORE_KEY);
  assert.equal(DefaultCore.Content.families.length, 10);
  for (const family of Content.families) {
    assert.deepEqual(family.variants.map((variant) => variant.variantRole), Runtime.ROLE_ORDER);
  }
  assert.ok(Content.variants.some((variant) => variant.rubric.length > 0));
});

test("practice match selects Grade 4 content and keeps a short four-pair round", () => {
  const now = Date.UTC(2026, 6, 15, 18);
  const state = Core.createSeedState(now);
  assert.equal(Object.keys(state.memories).length, 30);
  assert.equal(Core.eligibleFamilies(state, { gradeLevel: 3, now }).length, 0);
  assert.equal(Core.eligibleFamilies(state, { gradeLevel: 4, now }).length, 30);
  const started = Core.startMatch(state, { gradeLevel: 4, matchId: "practice-match", matchSize: 4, now });
  assert.equal(started.match.matchSize, 4);
  assert.equal(started.match.turnPlan.length, 8);
  assert.ok(started.match.turnPlan.every((turn) => Content.variants.some((variant) => variant.variantId === turn.variantId)));
});

test("adult practice answers score the match without writing Casper memory", () => {
  const now = Date.UTC(2026, 6, 15, 18);
  let state = Core.startMatch(Core.createSeedState(now), { gradeLevel: 4, matchId: "adult-isolation", matchSize: 1, now }).state;
  const match = Core.getMatch(state);
  state = Core.completeTurn(state, match.turnPlan[0].turnId, now + 1);
  const turn = Core.getCurrentTurn(state);
  const memoryBefore = structuredClone(Core.getMemory(state, match.learnerProfileId, turn.essentialId));
  const applied = Core.applyAttempt(state, {
    actorProfileId: turn.actorProfileId,
    attemptId: "adult-practice-answer",
    attemptKind: "turn",
    essentialId: turn.essentialId,
    helpStatus: "open",
    matchId: match.matchId,
    occurredAt: now + 2,
    priorAttemptId: null,
    priorOutcome: null,
    turnId: turn.turnId,
    variantId: turn.variantId,
    variantRole: turn.role,
    verdict: "correct",
    wasDue: turn.wasDue
  });
  assert.equal(applied.reviewEvent, null);
  assert.deepEqual(Core.getMemory(applied.state, match.learnerProfileId, turn.essentialId), memoryBefore);
  assert.equal(applied.scoreEvent.pointsDelta, 3);
});

test("practice scoring follows the declared pack policy", () => {
  const now = Date.UTC(2026, 6, 15, 18);
  let state = Core.startMatch(Core.createSeedState(now), { gradeLevel: 4, matchId: "practice-scoring", matchSize: 1, now }).state;
  const turn = Core.getCurrentTurn(state);
  const applied = Core.applyAttempt(state, {
    actorProfileId: turn.actorProfileId,
    attemptId: "child-practice-answer",
    attemptKind: "turn",
    essentialId: turn.essentialId,
    helpStatus: "open",
    matchId: "practice-scoring",
    occurredAt: now + 1,
    turnId: turn.turnId,
    variantId: turn.variantId,
    variantRole: turn.role,
    verdict: "correct",
    wasDue: true
  });
  assert.equal(applied.scoreEvent.pointsDelta, 3);
});

test("a locked steal scores but never writes directly to Casper memory", () => {
  const now = Date.UTC(2026, 6, 15, 18);
  let state = Core.startMatch(Core.createSeedState(now), { gradeLevel: 4, matchId: "practice-steal", matchSize: 1, now }).state;
  const match = Core.getMatch(state);
  state = Core.completeTurn(state, match.turnPlan[0].turnId, now + 1);
  const adultTurn = Core.getCurrentTurn(state);
  const adultApplied = Core.applyAttempt(state, {
    actorProfileId: adultTurn.actorProfileId,
    attemptId: "adult-miss-before-steal",
    attemptKind: "turn",
    essentialId: adultTurn.essentialId,
    helpStatus: "open",
    matchId: match.matchId,
    occurredAt: now + 2,
    turnId: adultTurn.turnId,
    variantId: adultTurn.variantId,
    variantRole: adultTurn.role,
    verdict: "incorrect",
    wasDue: true
  });
  const memoryBefore = structuredClone(Core.getMemory(adultApplied.state, match.learnerProfileId, adultTurn.essentialId));
  const stealApplied = Core.applyAttempt(adultApplied.state, {
    actorProfileId: match.learnerProfileId,
    attemptId: "locked-steal",
    attemptKind: "steal",
    essentialId: adultTurn.essentialId,
    helpStatus: "open",
    matchId: match.matchId,
    occurredAt: now + 3,
    priorAttemptId: adultApplied.attemptEvent.attemptId,
    turnId: adultTurn.turnId,
    variantId: adultTurn.variantId,
    variantRole: adultTurn.role,
    verdict: "correct",
    wasDue: true
  });
  assert.equal(stealApplied.scoreEvent.pointsDelta, 2);
  assert.equal(stealApplied.reviewEvent, null);
  assert.deepEqual(Core.getMemory(stealApplied.state, match.learnerProfileId, adultTurn.essentialId), memoryBefore);
  assert.equal(Core.getMatch(stealApplied.state).queue.at(-1).reason, "steal_recheck");
  const afterAdultTurn = Core.completeTurn(stealApplied.state, adultTurn.turnId, now + 4);
  assert.equal(Core.getCurrentTurn(afterAdultTurn).role, "comeback");
});

test("practice wording keeps assessment precise and culturally respectful", () => {
  const serialized = JSON.stringify(pack);
  assert.doesNotMatch(serialized, /Hunder har fire bein/);
  assert.doesNotMatch(serialized, /idrettsklubb|fotballklubb/);
  assert.match(serialized, /datert dokument i kommunens arkiv/);
  assert.match(serialized, /Hvilken betegnelse bruker vi om samene i Norge/);
});

test("practice page is a separate mobile entry with its own loader and navigation", () => {
  const html = fs.readFileSync(path.join(root, "family-practice.html"), "utf8");
  const defaultHtml = fs.readFileSync(path.join(root, "family-game.html"), "utf8");
  assert.match(html, /family-practice-content\.js/);
  assert.match(html, /family-practice-bootstrap\.js/);
  assert.match(html, /Sitter Familiespill/);
  assert.match(html, /Sitter Solo · Casper/);
  assert.doesNotMatch(html, /family-game-content\.js/);
  assert.match(defaultHtml, /family-practice\.html/);
  const app = fs.readFileSync(path.join(root, "family-game-app.js"), "utf8");
  assert.ok(app.indexOf("Lås før fasit") < app.indexOf("Kanonisk fasit"));
  assert.match(app, /Dette måler ikke hvem som er smartest|Poengene viser kampen, ikke hvem som er smartest/);
});
