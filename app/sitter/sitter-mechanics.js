(function initSitterMechanics(root, factory) {
  const mechanics = factory();
  if (typeof module === "object" && module.exports) module.exports = mechanics;
  root.SitterMechanics = mechanics;
})(typeof globalThis !== "undefined" ? globalThis : window, function createSitterMechanics() {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const STAGES = [
    { key: "now", label: "Nå", intervalMs: 0 },
    { key: "hour", label: "1 time", intervalMs: HOUR },
    { key: "day", label: "1 dag", intervalMs: DAY },
    { key: "week", label: "1 uke", intervalMs: 7 * DAY },
    { key: "month", label: "Sitter", intervalMs: 30 * DAY }
  ];

  function clampStage(stage) {
    const value = Number(stage);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(STAGES.length - 1, Math.trunc(value)));
  }

  function migrateLegacyStage(stage) {
    const value = Math.max(0, Number(stage) || 0);
    if (value >= 6) return 4;
    if (value >= 4) return 3;
    if (value >= 2) return 2;
    if (value >= 1) return 1;
    return 0;
  }

  function stageMeta(cardOrStage) {
    const stage = typeof cardOrStage === "object" ? cardOrStage?.stage : cardOrStage;
    return STAGES[clampStage(stage)];
  }

  function stageLabel(card) {
    if (!card || Number(card.reps || 0) === 0) return "Ny";
    return stageMeta(card).label;
  }

  function rewardEventFor(oldStage, nextStage, correct) {
    if (!correct) return "none";
    if (oldStage < 3 && nextStage === 3) return "promoted_to_week";
    if (oldStage < 4 && nextStage === 4) return "promoted_to_month_sitter";
    return "answer_correct_standard";
  }

  function scheduleReview(card, grade, options = {}) {
    const now = Number(options.now ?? Date.now());
    const responseMs = Math.max(0, Number(options.responseMs || 0));
    const scratchpad = String(options.scratchpad || "").trim().slice(0, 1000);
    const correct = grade === "good" || grade === "easy";
    const oldStage = clampStage(card?.stage);
    const nextStage = correct ? Math.min(oldStage + 1, STAGES.length - 1) : 0;
    const intervalMs = correct ? STAGES[nextStage].intervalMs : 0;
    const rewardEvent = rewardEventFor(oldStage, nextStage, correct);
    const previousHistory = Array.isArray(card?.history) ? card.history : [];
    const previousResponses = Array.isArray(card?.responseTimes) ? card.responseTimes : [];
    const wasSitting = oldStage === STAGES.length - 1;
    const next = {
      ...card,
      stage: nextStage,
      reps: Number(card?.reps || 0) + 1,
      lapses: Number(card?.lapses || 0) + (correct ? 0 : 1),
      consecutiveLapses: correct ? 0 : Number(card?.consecutiveLapses || 0) + 1,
      lastReviewedAt: now,
      lastGrade: grade,
      dueAt: now + intervalMs,
      responseTimes: [...previousResponses, responseMs].slice(-20)
    };
    const historyEntry = {
      at: now,
      reviewedAt: now,
      grade,
      outcome: correct ? "correct" : grade === "hard" ? "near" : "wrong",
      oldStage,
      fromStage: STAGES[oldStage].key,
      nextStage,
      toStage: STAGES[nextStage].key,
      intervalMs,
      nextDueAt: next.dueAt,
      responseMs,
      scratchpad,
      rewardEvent,
      lostSitting: wasSitting && !correct
    };
    next.history = [...previousHistory, historyEntry].slice(-60);

    return {
      card: next,
      intervalMs,
      oldStage,
      nextStage,
      promoted: nextStage > oldStage,
      requeue: !correct,
      rewardEvent
    };
  }

  function dueCards(cards, now = Date.now()) {
    return [...(cards || [])]
      .filter((card) => Number(card.dueAt || 0) <= now)
      .sort((a, b) => Number(a.dueAt || 0) - Number(b.dueAt || 0)
        || Number(a.lastReviewedAt || 0) - Number(b.lastReviewedAt || 0)
        || String(a.id).localeCompare(String(b.id)));
  }

  function shuffle(values, random = Math.random) {
    const items = [...values];
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.max(0, Math.min(0.999999999, random())) * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function buildSessionBag(cards, target, random = Math.random) {
    const limit = Math.max(0, Math.min(Number(target) || 0, cards.length));
    const prioritySet = dueCards(cards).slice(0, limit);
    return shuffle(prioritySet.map((card) => card.id), random);
  }

  function insertRetry(cardIds, currentIndex, cardId, minimumGap = 2) {
    const queue = [...cardIds];
    const gap = Math.max(0, Number(minimumGap) || 0);
    const insertAt = Math.min(queue.length, Number(currentIndex) + 1 + gap);
    queue.splice(insertAt, 0, cardId);
    return queue;
  }

  function activeCount(session) {
    if (!session) return 0;
    const remaining = new Set((session.cardIds || []).slice(Number(session.index || 0)));
    return remaining.size;
  }

  return {
    DAY,
    HOUR,
    STAGES,
    activeCount,
    buildSessionBag,
    clampStage,
    dueCards,
    insertRetry,
    migrateLegacyStage,
    rewardEventFor,
    scheduleReview,
    shuffle,
    stageLabel,
    stageMeta
  };
});
