const test = require("node:test");
const assert = require("node:assert/strict");
const Mechanics = require("../sitter-mechanics.js");

function card(overrides = {}) {
  return {
    id: "card-1",
    stage: 0,
    reps: 0,
    lapses: 0,
    dueAt: 0,
    history: [],
    responseTimes: [],
    ...overrides
  };
}

test("Sitter uses the locked hour-day-week-month mastery ladder", () => {
  const now = 1_000_000;
  const hour = Mechanics.scheduleReview(card(), "good", { now });
  const day = Mechanics.scheduleReview(hour.card, "good", { now: now + Mechanics.HOUR });
  const week = Mechanics.scheduleReview(day.card, "good", { now: now + Mechanics.DAY });
  const month = Mechanics.scheduleReview(week.card, "good", { now: now + 8 * Mechanics.DAY });
  const maintenance = Mechanics.scheduleReview(month.card, "good", { now: now + 38 * Mechanics.DAY });

  assert.equal(hour.nextStage, 1);
  assert.equal(hour.intervalMs, Mechanics.HOUR);
  assert.equal(day.nextStage, 2);
  assert.equal(day.intervalMs, Mechanics.DAY);
  assert.equal(week.nextStage, 3);
  assert.equal(week.rewardEvent, "promoted_to_week");
  assert.equal(month.nextStage, 4);
  assert.equal(month.intervalMs, 30 * Mechanics.DAY);
  assert.equal(month.rewardEvent, "promoted_to_month_sitter");
  assert.equal(Mechanics.stageLabel(month.card), "Sitter");
  assert.equal(maintenance.nextStage, 4);
  assert.equal(maintenance.rewardEvent, "answer_correct_standard");
});

test("Near and wrong answers return a card to active rotation", () => {
  const result = Mechanics.scheduleReview(card({ stage: 4, reps: 9 }), "hard", { now: 4_000 });

  assert.equal(result.nextStage, 0);
  assert.equal(result.intervalMs, 0);
  assert.equal(result.card.dueAt, 4_000);
  assert.equal(result.requeue, true);
  assert.equal(result.card.consecutiveLapses, 1);
  assert.equal(result.card.history.at(-1).lostSitting, true);
  assert.equal(result.card.history.at(-1).outcome, "near");
});

test("Shuffle-bag has no duplicates and prioritizes the oldest due cards", () => {
  const cards = [
    card({ id: "newer", dueAt: 30 }),
    card({ id: "oldest", dueAt: 10 }),
    card({ id: "middle", dueAt: 20 }),
    card({ id: "later", dueAt: 40 })
  ];
  const bag = Mechanics.buildSessionBag(cards, 3, () => 0.999999);

  assert.equal(bag.length, 3);
  assert.equal(new Set(bag).size, 3);
  assert.deepEqual(new Set(bag), new Set(["oldest", "middle", "newer"]));
  assert.equal(bag.includes("later"), false);
});

test("Failed cards return after a gap instead of repeating immediately", () => {
  const queue = Mechanics.insertRetry(["a", "b", "c", "d"], 0, "a", 2);
  assert.deepEqual(queue, ["a", "b", "c", "a", "d"]);
  assert.equal(Mechanics.activeCount({ cardIds: queue, index: 1 }), 4);
});

test("Legacy retention stages migrate to the compact Sitter ladder", () => {
  assert.equal(Mechanics.migrateLegacyStage(0), 0);
  assert.equal(Mechanics.migrateLegacyStage(1), 1);
  assert.equal(Mechanics.migrateLegacyStage(3), 2);
  assert.equal(Mechanics.migrateLegacyStage(5), 3);
  assert.equal(Mechanics.migrateLegacyStage(6), 4);
});
