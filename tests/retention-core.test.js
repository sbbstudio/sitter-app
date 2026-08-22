const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../retention-core.js");

const NOW = 1_800_000_000_000;

function card(overrides = {}) {
  return Core.normalizeCard(
    {
      id: "card-1",
      deck: "Backend Lingo",
      front: "Hva betyr idempotency?",
      back: "Same operation can be retried without duplicate side effects.",
      context: "Retry-safe backend systems.",
      source: "System design canon",
      ...overrides
    },
    { now: NOW, createId: () => "generated-id" }
  );
}

test("first good review keeps a fresh card on the 5 minute learning step", () => {
  const result = Core.scheduleReview(card(), "good", {
    now: NOW,
    responseMs: 12_000,
    scratchpad: "idempotent retry"
  });

  assert.equal(result.card.stage, 0);
  assert.equal(result.intervalMs, Core.INTERVALS[0].ms);
  assert.equal(result.card.dueAt, NOW + Core.INTERVALS[0].ms);
  assert.equal(result.card.reps, 1);
  assert.equal(result.card.lastGrade, "good");
  assert.equal(result.card.history[0].scratchpad, "idempotent retry");
});

test("normalizeCard regenerates unsafe imported ids", () => {
  const unsafe = Core.normalizeCard(
    {
      deck: "Backend Lingo",
      front: "Unsafe id?",
      back: "Regenerate unsafe imported ids.",
      id: "bad\" onclick=\"alert(1)"
    },
    { now: NOW, createId: () => "safe-generated-id" }
  );
  const safe = Core.normalizeCard(
    {
      deck: "Backend Lingo",
      front: "Safe id?",
      back: "Keep stable local ids.",
      id: "card_123:abc-OK"
    },
    { now: NOW, createId: () => "safe-generated-id" }
  );

  assert.equal(unsafe.id, "safe-generated-id");
  assert.equal(safe.id, "card_123:abc-OK");
});

test("second good review advances to the 1 hour interval", () => {
  const reviewed = card({
    reps: 1,
    stage: 0,
    lastGrade: "good",
    history: [{ at: NOW - Core.INTERVALS[0].ms, grade: "good", oldStage: 0, nextStage: 0 }]
  });
  const result = Core.scheduleReview(reviewed, "good", { now: NOW, responseMs: 8_000 });

  assert.equal(result.card.stage, 1);
  assert.equal(result.intervalMs, Core.INTERVALS[1].ms);
  assert.equal(result.card.dueAt, NOW + Core.INTERVALS[1].ms);
});

test("review outcome explains the next recall interval", () => {
  const result = Core.scheduleReview(card({ reps: 1, stage: 0, lastGrade: "good" }), "good", {
    now: NOW,
    responseMs: 8_000
  });
  const outcome = Core.reviewOutcome("good", result);

  assert.equal(outcome.label, "Kan");
  assert.equal(outcome.intervalLabel, "1 time");
  assert.equal(outcome.message, "Kan: neste recall om 1 time");
  assert.equal(outcome.tone, "success");
  assert.equal(Core.formatIntervalMs(Math.round(Core.INTERVALS[1].ms * 1.15)), "ca. 1 timer");
});

test("repeated misses mark a card for rewrite and cap review history", () => {
  const history = Array.from({ length: 45 }, (_, index) => ({
    at: NOW - index,
    grade: "good",
    oldStage: 0,
    nextStage: 0
  }));
  const weak = card({ lapses: 1, history, responseTimes: Array.from({ length: 25 }, (_, index) => index) });
  const result = Core.scheduleReview(weak, "again", { now: NOW, responseMs: 4_000 });

  assert.equal(result.card.stage, 0);
  assert.equal(result.card.lapses, 2);
  assert.equal(result.card.needsRewrite, true);
  assert.equal(result.card.history.length, 40);
  assert.equal(result.card.responseTimes.length, 20);
});

test("scheduler stores adaptive memory state after review", () => {
  const result = Core.scheduleReview(card({ reps: 1, stage: 0, lastGrade: "good" }), "good", {
    now: NOW,
    responseMs: 8_000
  });
  const [entry] = result.card.history;

  assert.equal(result.targetRetention, Core.TARGET_RETENTION);
  assert.ok(Math.abs(result.card.stabilityDays - Core.INTERVALS[1].ms / Core.DAY) < 0.001);
  assert.equal(result.card.difficulty, result.difficultyAfter);
  assert.equal(entry.targetRetention, Core.TARGET_RETENTION);
  assert.equal(entry.stabilityAfterMs, Core.INTERVALS[1].ms);
  assert.equal(entry.difficultyAfter, result.card.difficulty);
});

test("scheduler stores proof and expert gate summaries in history", () => {
  const result = Core.scheduleReview(card({ reps: 2, stage: 4, lastGrade: "good" }), "good", {
    now: NOW,
    responseMs: 12_000,
    scratchpad: "Failure drift. Gate with eval score. Tradeoff latency vs safety. Decision owner next action. Writeback to Notion docs.",
    proofGate: {
      active: true,
      checks: [
        { complete: true, key: "trace", label: "Recall trace", tone: "success", value: "111 chars" },
        { complete: false, key: "transfer", label: "Transfer signal", tone: "warning", value: "missing" }
      ],
      label: "Week proof",
      missing: ["transfer"],
      passed: false,
      tone: "warning"
    },
    expertDrillGate: {
      active: true,
      checks: [
        { complete: true, key: "failure", label: "Failure mode", tone: "success", value: "drift" },
        { complete: true, key: "writeback", label: "Writeback", tone: "success", value: "docs" }
      ],
      label: "Expert drill gate",
      missing: [],
      passed: true,
      tone: "success"
    }
  });
  const [entry] = result.card.history;

  assert.equal(entry.proofGate.label, "Week proof");
  assert.equal(entry.proofGate.passed, false);
  assert.deepEqual(entry.proofGate.missing, ["transfer"]);
  assert.equal(entry.expertDrillGate.label, "Expert drill gate");
  assert.equal(entry.expertDrillGate.passed, true);
  assert.deepEqual(entry.expertDrillGate.checks.map((check) => check.key), ["failure", "writeback"]);
});

test("adaptive scheduler keeps hard mature cards closer and lets easy mature cards stretch", () => {
  const mature = card({
    reps: 8,
    stage: 4,
    lastGrade: "good",
    lastReviewedAt: NOW - Core.INTERVALS[4].ms,
    stabilityDays: Core.INTERVALS[4].ms / Core.DAY,
    history: [{ at: NOW - Core.INTERVALS[4].ms, grade: "good", oldStage: 3, nextStage: 4, intervalMs: Core.INTERVALS[4].ms }]
  });

  const hard = Core.scheduleReview(card({ ...mature, id: "hard", difficulty: 8.5 }), "hard", { now: NOW, responseMs: 30_000 });
  const easy = Core.scheduleReview(
    card({
      ...mature,
      id: "easy",
      difficulty: 2.2,
      lastReviewedAt: NOW - Core.DAY
    }),
    "easy",
    { now: NOW, responseMs: 5_000 }
  );

  assert.equal(hard.card.stage, 4);
  assert.ok(hard.intervalMs < Core.INTERVALS[4].ms);
  assert.equal(easy.card.stage, 6);
  assert.ok(easy.intervalMs > Core.INTERVALS[5].ms);
  assert.ok(easy.intervalMs > hard.intervalMs);
});

test("retrievability uses stored stability as the 90 percent target point", () => {
  const stable = card({
    reps: 5,
    lastReviewedAt: NOW - 10 * Core.DAY,
    stabilityDays: 10
  });
  const later = card({
    reps: 5,
    lastReviewedAt: NOW - 20 * Core.DAY,
    stabilityDays: 10
  });

  assert.ok(Core.estimateRetrievability(stable, NOW) > 0.89);
  assert.ok(Core.estimateRetrievability(stable, NOW) < 0.91);
  assert.ok(Core.estimateRetrievability(later, NOW) < Core.estimateRetrievability(stable, NOW));
});

test("session summary aggregates accuracy, coverage, response time and stability gain", () => {
  const empty = Core.sessionSummary([]);
  const summary = Core.sessionSummary([
    {
      grade: "good",
      coverageScore: 0.6,
      responseMs: 8_000,
      stabilityBeforeMs: Core.INTERVALS[1].ms,
      stabilityAfterMs: Core.INTERVALS[2].ms
    },
    {
      grade: "again",
      coverageScore: 0.1,
      responseMs: 24_000,
      stabilityBeforeMs: Core.INTERVALS[2].ms,
      stabilityAfterMs: Core.INTERVALS[0].ms
    },
    {
      grade: "easy",
      coverageScore: 0.8,
      responseMs: 5_000,
      stabilityBeforeMs: Core.INTERVALS[2].ms,
      stabilityAfterMs: Core.INTERVALS[4].ms
    }
  ]);

  assert.equal(empty.reps, 0);
  assert.equal(empty.tone, "neutral");
  assert.equal(summary.reps, 3);
  assert.equal(summary.passed, 2);
  assert.equal(summary.accuracy, 2 / 3);
  assert.equal(Math.round(summary.avgCoverage * 100), 50);
  assert.equal(summary.avgResponseMs, 12_333);
  assert.ok(summary.avgStabilityGain > 2);
  assert.equal(summary.gradeCounts.again, 1);
});

test("session impact reports promotions, month gates and Top 5 focus", () => {
  const empty = Core.sessionImpact([]);
  const impact = Core.sessionImpact([
    {
      deck: "AI Expert",
      grade: "good",
      oldStage: 5,
      nextStage: 6,
      stabilityBeforeMs: Core.INTERVALS[5].ms,
      stabilityAfterMs: Core.INTERVALS[6].ms
    },
    {
      deck: "AI Expert",
      grade: "easy",
      oldStage: 2,
      nextStage: 4,
      stabilityBeforeMs: Core.INTERVALS[2].ms,
      stabilityAfterMs: Core.INTERVALS[4].ms
    },
    {
      deck: "Git / Merge",
      grade: "hard",
      oldStage: 3,
      nextStage: 3,
      stabilityBeforeMs: Core.INTERVALS[3].ms,
      stabilityAfterMs: Core.INTERVALS[3].ms
    }
  ]);

  assert.equal(empty.tone, "neutral");
  assert.equal(impact.reps, 3);
  assert.equal(impact.promotions, 2);
  assert.equal(impact.monthUnlocks, 1);
  assert.equal(impact.topDeck, "AI Expert");
  assert.equal(impact.topTrack.label, "AI Systems");
  assert.equal(impact.tone, "success");
});

test("weekly proof artifact turns gate history into a production proof", () => {
  const artifact = Core.buildWeeklyProofArtifact(
    [
      card({
        id: "ai-proof",
        deck: "AI Expert",
        front: "Hvordan designer du en LLM eval gate?",
        promptType: "Scenario",
        stage: 6,
        history: [
          {
            at: NOW - Core.DAY,
            expertDrillGate: { passed: true, label: "Expert drill gate" },
            grade: "easy",
            oldStage: 5,
            nextStage: 6,
            proofGate: { passed: true, label: "Month proof" }
          }
        ]
      }),
      card({
        id: "ai-transfer",
        deck: "AI Expert",
        front: "Hvordan kobler du eval og tool calling?",
        promptType: "Transfer",
        history: [
          {
            at: NOW - Core.DAY * 2,
            grade: "good",
            oldStage: 3,
            nextStage: 4
          }
        ]
      })
    ],
    { now: NOW }
  );

  assert.equal(artifact.tone, "success");
  assert.equal(artifact.status, "Proof ready");
  assert.equal(artifact.track.label, "AI Systems");
  assert.equal(artifact.counts.expertPasses, 1);
  assert.equal(artifact.counts.proofPasses, 1);
  assert.equal(artifact.counts.monthUnlocks, 1);
  assert.ok(artifact.statement.includes("LLM eval"));
  assert.equal(artifact.evidence[0].type, "Expert gate");
});

test("weekly proof artifact names the next proof when history is thin", () => {
  const artifact = Core.buildWeeklyProofArtifact([card({ id: "fresh", deck: "Backend Lingo", dueAt: NOW - 1 })], {
    now: NOW
  });

  assert.equal(artifact.tone, "danger");
  assert.equal(artifact.status, "Proof missing");
  assert.equal(artifact.counts.passedReviews, 0);
  assert.ok(artifact.nextProof.includes("Expert Drill"));
  assert.equal(artifact.evidence.length, 0);
});

test("weekly proof markdown is copy-ready for Notion", () => {
  const artifact = Core.buildWeeklyProofArtifact(
    [
      card({
        id: "merge-proof",
        deck: "Git / Merge",
        front: "Hvordan løfter du reviewed work til en clean branch?",
        promptType: "Scenario",
        history: [
          {
            at: NOW - Core.DAY,
            grade: "good",
            oldStage: 5,
            nextStage: 6,
            proofGate: { passed: true, label: "Month proof" }
          }
        ]
      })
    ],
    { now: NOW }
  );
  const markdown = Core.formatWeeklyProofMarkdown(artifact);

  assert.ok(markdown.startsWith("# Weekly proof"));
  assert.ok(markdown.includes("Status:"));
  assert.ok(markdown.includes("Track: Git / Merge"));
  assert.ok(markdown.includes("- Proof gates: 1"));
  assert.ok(markdown.includes("- Month proof · Git / Merge: Hvordan løfter du reviewed work"));
  assert.ok(markdown.includes("Next proof:"));
});

test("blindspot radar ranks missed and low-coverage recall for repair", () => {
  const cards = [
    card({
      id: "weak-card",
      deck: "Backend Lingo",
      front: "Hva betyr idempotency for retries?",
      needsRewrite: true
    }),
    card({
      id: "slow-card",
      deck: "System Design",
      front: "Hvordan fungerer queue backpressure?"
    })
  ];
  const radar = Core.buildBlindspotRadar([
    {
      cardId: "slow-card",
      coverageMissing: ["queue"],
      coverageScore: 0.38,
      deck: "System Design",
      grade: "hard",
      oldStage: 3,
      nextStage: 3,
      responseMs: 31_000
    },
    {
      cardId: "weak-card",
      coverageMissing: ["idempotency", "retry"],
      coverageScore: 0.1,
      deck: "Backend Lingo",
      grade: "again",
      oldStage: 4,
      nextStage: 0,
      responseMs: 52_000
    }
  ], cards, { limit: 2 });

  assert.equal(radar.length, 2);
  assert.equal(radar[0].cardId, "weak-card");
  assert.equal(radar[0].action, "rewrite");
  assert.equal(radar[0].tone, "danger");
  assert.deepEqual(radar[0].missing, ["idempotency", "retry"]);
  assert.ok(radar[0].reasons.includes("missed recall"));
  assert.equal(radar[1].action, "review");
  assert.ok(radar[1].reasons.includes("thin coverage"));
});

test("mastery sprint turns queue, blindspots, transfer and capture into one work block", () => {
  const cards = [
    card({
      id: "due-ai",
      deck: "AI Expert",
      front: "Hva er tool calling?",
      promptType: "Definition",
      tags: ["tools"],
      dueAt: NOW - 1
    }),
    card({
      id: "weak-backend",
      deck: "Backend Lingo",
      front: "Hva betyr idempotency for retries?",
      promptType: "Definition",
      tags: ["retry", "api"],
      needsRewrite: true,
      dueAt: NOW + Core.DAY
    }),
    card({
      id: "queue",
      deck: "System Design",
      front: "Hvordan fungerer retry i en queue?",
      promptType: "Scenario",
      tags: ["retry", "queue"],
      dueAt: NOW + Core.DAY
    })
  ];

  const sprint = Core.buildMasterySprint(cards, [
    {
      cardId: "weak-backend",
      coverageMissing: ["idempotency", "retry"],
      coverageScore: 0.1,
      deck: "Backend Lingo",
      grade: "again",
      oldStage: 3,
      nextStage: 0,
      responseMs: 51_000
    }
  ], { now: NOW, targetReps: 4 });

  assert.equal(sprint.focus, "Repair blindspots");
  assert.equal(sprint.totalMinutes, 20);
  assert.deepEqual(sprint.blocks.map((block) => block.label), ["Pull", "Repair", "Transfer", "Capture"]);
  assert.equal(sprint.blocks[0].cardId, "due-ai");
  assert.equal(sprint.blocks[1].action, "rewrite");
  assert.equal(sprint.blocks[2].action, "review");
  assert.equal(sprint.blocks[3].action, "capture");
});

test("daily ledger records review events by local day", () => {
  const day = new Date(2027, 0, 10, 12).getTime();
  let ledger = Core.recordDailyReview({}, {
    at: day,
    coverageScore: 0.8,
    deck: "Backend Lingo",
    grade: "good",
    promptType: "Scenario",
    responseMs: 8_000,
    stabilityAfterMs: Core.INTERVALS[2].ms,
    stabilityBeforeMs: Core.INTERVALS[1].ms
  }, day);
  ledger = Core.recordDailyReview(ledger, {
    at: day + 60_000,
    coverageScore: 0.2,
    deck: "Backend Lingo",
    grade: "again",
    promptType: "Scenario",
    responseMs: 22_000,
    stabilityAfterMs: Core.INTERVALS[0].ms,
    stabilityBeforeMs: Core.INTERVALS[1].ms
  }, day + 60_000);

  const summary = Core.dailyLedgerSummary(ledger, day, 7);
  const entry = summary.today;

  assert.equal(entry.date, "2027-01-10");
  assert.equal(entry.reps, 2);
  assert.equal(entry.passed, 1);
  assert.equal(entry.decks["Backend Lingo"], 2);
  assert.equal(entry.promptTypes.Scenario, 2);
  assert.equal(entry.gradeCounts.good, 1);
  assert.equal(entry.gradeCounts.again, 1);
  assert.equal(entry.avgResponseMs, 15_000);
  assert.equal(Math.round(entry.avgCoverage * 100), 50);
  assert.ok(entry.avgStabilityGain > 12);
  assert.equal(summary.accuracy, 0.5);
});

test("daily ledger summary computes active days and streak across the week", () => {
  const today = new Date(2027, 0, 10, 12).getTime();
  const yesterday = today - Core.DAY;
  const threeDaysAgo = today - 3 * Core.DAY;
  let ledger = {};

  [threeDaysAgo, yesterday, today].forEach((at, index) => {
    ledger = Core.recordDailyReview(ledger, {
      at,
      coverageScore: 0.6 + index * 0.1,
      deck: index === 0 ? "Git / Merge" : "AI Expert",
      grade: "easy",
      promptType: "Transfer",
      responseMs: 5_000 + index * 1_000,
      stabilityAfterMs: Core.INTERVALS[3].ms,
      stabilityBeforeMs: Core.INTERVALS[2].ms
    }, at);
  });

  const summary = Core.dailyLedgerSummary(ledger, today, 7);

  assert.equal(summary.reps, 3);
  assert.equal(summary.passed, 3);
  assert.equal(summary.activeDays, 3);
  assert.equal(summary.streak, 2);
  assert.equal(summary.today.topDeck, "AI Expert");
  assert.equal(Math.round(summary.avgCoverage * 100), 70);
  assert.equal(summary.entries.length, 7);
});

test("momentum coach scores weekly consistency and next habit action", () => {
  const today = new Date(2027, 0, 12, 9).getTime();
  let ledger = {};

  for (let day = 0; day < 6; day += 1) {
    for (let rep = 0; rep < 4; rep += 1) {
      const at = today - day * Core.DAY + rep * 60_000;
      ledger = Core.recordDailyReview(ledger, {
        at,
        coverageScore: 0.7,
        deck: rep < 3 ? "Backend Lingo" : "AI Expert",
        grade: rep === 0 ? "easy" : "good",
        promptType: "Scenario",
        responseMs: 7_000,
        stabilityAfterMs: Core.INTERVALS[3].ms,
        stabilityBeforeMs: Core.INTERVALS[2].ms
      }, at);
    }
  }

  const empty = Core.buildMomentumCoach({}, today, { days: 7, targetReps: 4 });
  const coach = Core.buildMomentumCoach(ledger, today, { days: 7, targetReps: 4 });

  assert.equal(empty.tone, "neutral");
  assert.equal(empty.todayRemaining, 4);
  assert.equal(coach.entries.length, 7);
  assert.equal(coach.metDays, 6);
  assert.equal(coach.streak, 6);
  assert.equal(coach.todayRemaining, 0);
  assert.equal(coach.tone, "success");
  assert.equal(coach.nextAction, "Advance month proof");
  assert.equal(coach.topDeck, "Backend Lingo");
  assert.ok(coach.score > 0.72);
});

test("dueCards sorts by overdue time, then lower reps", () => {
  const cards = [
    card({ id: "later", dueAt: NOW - 10_000, reps: 5 }),
    card({ id: "old-low-reps", dueAt: NOW - 20_000, reps: 1 }),
    card({ id: "old-high-reps", dueAt: NOW - 20_000, reps: 8 }),
    card({ id: "future", dueAt: NOW + 10_000 })
  ];

  assert.deepEqual(Core.dueCards(cards, NOW).map((item) => item.id), ["old-low-reps", "old-high-reps", "later"]);
  assert.equal(Core.nextCard(cards, NOW).id, "old-low-reps");
});

test("deckMetrics combines accuracy, lapse rate, response speed, rewrite debt and long memory", () => {
  const cards = [
    card({
      id: "strong",
      stage: 6,
      reps: 4,
      lapses: 0,
      responseTimes: [6000, 8000],
      history: [
        { at: NOW - 1000, grade: "good", oldStage: 5, nextStage: 6 },
        { at: NOW - 2000, grade: "easy", oldStage: 4, nextStage: 6 }
      ]
    }),
    card({
      id: "weak",
      stage: 1,
      reps: 4,
      lapses: 2,
      needsRewrite: true,
      responseTimes: [40_000],
      history: [
        { at: NOW - 3000, grade: "again", oldStage: 2, nextStage: 0 },
        { at: NOW - 4000, grade: "hard", oldStage: 0, nextStage: 0 }
      ]
    })
  ];
  const metrics = Core.deckMetrics(cards, NOW);

  assert.equal(metrics.attempts, 4);
  assert.equal(metrics.accuracy, 0.75);
  assert.equal(metrics.longMemory, 1);
  assert.equal(metrics.rewrite, 1);
  assert.equal(metrics.lapseRate, 0.25);
  assert.ok(metrics.mastery > 0.35);
  assert.ok(metrics.mastery < 0.75);
});

test("masteryPath exposes the next level and the highest priority blocker", () => {
  const path = Core.masteryPath(
    "Backend Lingo",
    [
      card({ id: "a", stage: 2, reps: 3, lapses: 1, responseTimes: [20_000] }),
      card({ id: "b", stage: 1, reps: 2, lapses: 1, needsRewrite: true, responseTimes: [24_000] })
    ],
    NOW
  );

  assert.equal(path.level.label, "Foundation");
  assert.equal(path.nextLevel.label, "Operator");
  assert.equal(path.primaryBlocker.key, "cards");
  assert.ok(path.blockers.some((blocker) => blocker.key === "accuracy"));
});

test("masteryPath reaches expert only when month gates and quality signals are clean", () => {
  const expertCards = Array.from({ length: 6 }, (_, index) =>
    card({
      id: `expert-${index}`,
      stage: 8,
      reps: 10,
      lapses: 0,
      responseTimes: [6000, 8000],
      history: [
        { at: NOW - 1000 - index, grade: "good", oldStage: 7, nextStage: 8 },
        { at: NOW - 2000 - index, grade: "easy", oldStage: 7, nextStage: 8 }
      ]
    })
  );
  const path = Core.masteryPath("AI Expert", expertCards, NOW);

  assert.equal(path.level.label, "Expert");
  assert.equal(path.nextLevel, null);
  assert.equal(path.primaryBlocker, null);
  assert.equal(path.progress, 1);
});

test("top5Readiness maps Notion-derived tracks to deck coverage and blockers", () => {
  const readiness = Core.top5Readiness(
    [
      card({ id: "ai-scenario", deck: "AI Expert", promptType: "Scenario", stage: 2, reps: 3 }),
      card({ id: "ai-transfer", deck: "AI Expert", promptType: "Transfer", stage: 2, reps: 3 }),
      card({ id: "ops-scenario", deck: "Git / Merge", promptType: "Scenario", stage: 1, reps: 2 })
    ],
    NOW
  );
  const ai = readiness.find((track) => track.id === "ai-systems");

  assert.equal(readiness.length, Core.TOP5_TRACKS.length);
  assert.equal(ai.deck, "AI Expert");
  assert.ok(ai.source.includes("Senior AI Engineer"));
  assert.deepEqual(ai.missingPromptTypes, ["Failure mode"]);
  assert.equal(ai.nextAction, "card base");
});

test("top5Readiness rewards prompt coverage and mature recall proof", () => {
  const weak = Core.top5Readiness([card({ id: "one", deck: "System Design", promptType: "Scenario", stage: 1, reps: 1 })], NOW)
    .find((track) => track.id === "system-architecture");
  const strongCards = Array.from({ length: 6 }, (_, index) =>
    card({
      id: `sys-${index}`,
      deck: "System Design",
      promptType: ["Scenario", "Tradeoff", "Transfer"][index % 3],
      stage: 7,
      reps: 8,
      lapses: 0,
      responseTimes: [7000, 9000],
      history: [
        { at: NOW - 1000 - index, grade: "good", oldStage: 6, nextStage: 7 },
        { at: NOW - 2000 - index, grade: "easy", oldStage: 6, nextStage: 7 }
      ]
    })
  );
  const strong = Core.top5Readiness(strongCards, NOW).find((track) => track.id === "system-architecture");

  assert.ok(strong.score > weak.score);
  assert.equal(strong.missingPromptTypes.length, 0);
  assert.equal(strong.status, "Top 5 loop");
});

test("canon backlog proposes missing prompt types from the weakest Top 5 tracks", () => {
  const backlog = Core.buildCanonBacklog(
    [
      card({ id: "ai-scenario", deck: "AI Expert", promptType: "Scenario", stage: 1, reps: 1 }),
      card({ id: "ai-transfer", deck: "AI Expert", promptType: "Transfer", stage: 1, reps: 1 })
    ],
    { now: NOW, limit: 6 }
  );
  const aiFailure = backlog.find((item) => item.trackId === "ai-systems" && item.promptType === "Failure mode");

  assert.ok(backlog.length <= 6);
  assert.ok(aiFailure);
  assert.equal(aiFailure.deck, "AI Expert");
  assert.ok(aiFailure.reason.includes("Missing"));
  assert.ok(aiFailure.source.includes("Senior AI Engineer"));
});

test("canon backlog skips blueprints that already exist as cards", () => {
  const existing = Core.CANON_BLUEPRINTS.find((item) => item.trackId === "clean-ops" && item.promptType === "Scenario");
  const backlog = Core.buildCanonBacklog(
    [
      card({
        id: "existing-clean-ops",
        deck: "Git / Merge",
        front: existing.front,
        promptType: "Scenario",
        stage: 0,
        reps: 0
      })
    ],
    { now: NOW, limit: 12 }
  );

  assert.equal(backlog.some((item) => item.front === existing.front), false);
});

test("card health flags stable, watch and fix cards", () => {
  const fresh = Core.cardHealth(card());
  const stable = Core.cardHealth(card({ stage: 7, reps: 8, lapses: 0, responseTimes: [4000, 5000] }));
  const watch = Core.cardHealth(card({ stage: 2, reps: 4, lapses: 1, responseTimes: [22_000] }));
  const fix = Core.cardHealth(card({ stage: 3, reps: 5, lapses: 3, needsRewrite: true, responseTimes: [35_000] }));

  assert.equal(fresh.label, "New");
  assert.equal(fresh.tone, "neutral");
  assert.equal(stable.label, "Stable");
  assert.equal(stable.tone, "success");
  assert.equal(watch.label, "Watch");
  assert.equal(watch.tone, "warning");
  assert.equal(fix.label, "Fix");
  assert.equal(fix.tone, "danger");
  assert.ok(stable.score > watch.score);
  assert.ok(watch.score > fix.score);
});

test("memory state exposes FSRS-style retrievability, stability and difficulty", () => {
  const fresh = Core.memoryState(card(), NOW);
  const justReviewed = Core.memoryState(card({
    reps: 2,
    stage: 1,
    lastReviewedAt: NOW - 30 * 60 * 1000,
    history: [{ at: NOW - 30 * 60 * 1000, grade: "good", oldStage: 0, nextStage: 1, intervalMs: Core.INTERVALS[1].ms }]
  }), NOW);
  const overdue = Core.memoryState(card({
    reps: 2,
    stage: 1,
    lastReviewedAt: NOW - 2 * Core.INTERVALS[1].ms,
    history: [{ at: NOW - 2 * Core.INTERVALS[1].ms, grade: "good", oldStage: 0, nextStage: 1, intervalMs: Core.INTERVALS[1].ms }]
  }), NOW);
  const difficult = Core.memoryState(card({ reps: 5, stage: 2, lapses: 4, needsRewrite: true, ease: 1.6, lastReviewedAt: NOW - Core.DAY }), NOW);

  assert.equal(fresh.retrievability, null);
  assert.equal(fresh.retrievabilityLabel, "new");
  assert.equal(justReviewed.stabilityLabel, "1 time");
  assert.equal(justReviewed.tone, "success");
  assert.equal(overdue.tone, "danger");
  assert.ok(justReviewed.retrievability > overdue.retrievability);
  assert.equal(difficult.difficultyLabel, "Hard");
});

test("grade coach calibrates grading from recall trace, time and rewrite debt", () => {
  const missing = Core.gradeCoach({ card: card(), responseMs: 5_000, scratchpad: "", spoken: false });
  const shaky = Core.gradeCoach({ card: card({ needsRewrite: true }), responseMs: 18_000, scratchpad: "retry-ish answer", spoken: false });
  const clean = Core.gradeCoach({ card: card(), responseMs: 8_000, scratchpad: "Idempotency means safe retry without duplicate side effects.", spoken: false });

  assert.equal(missing.grade, "again");
  assert.equal(missing.tone, "danger");
  assert.equal(shaky.grade, "hard");
  assert.equal(shaky.signals.find((signal) => signal.label === "Prompt").value, "rewrite");
  assert.equal(clean.grade, "easy");
  assert.equal(clean.signals.find((signal) => signal.label === "Coverage").tone, "success");
  assert.equal(clean.signals.find((signal) => signal.label === "Time").tone, "success");
});

test("answer coverage separates vague recall from answer-aligned recall", () => {
  const target = card({
    back: "Idempotency means safe retry without duplicate side effects in webhooks and queues.",
    tags: ["idempotency", "retry", "webhook", "queue"]
  });
  const vague = Core.answerCoverage(target, "I know this backend thing is important and useful.");
  const aligned = Core.answerCoverage(target, "Idempotency gives safe retry without duplicate side effects for webhook queue jobs.");
  const coach = Core.gradeCoach({ card: target, responseMs: 6_000, scratchpad: "This backend thing is important and useful.", spoken: false });

  assert.ok(aligned.score > vague.score);
  assert.equal(aligned.tone, "success");
  assert.equal(vague.tone, "danger");
  assert.equal(coach.grade, "hard");
  assert.ok(vague.missing.includes("idempotency"));
});

test("answer delta limits matched and missing tokens for reveal feedback", () => {
  const target = card({
    back: "Idempotency means safe retry without duplicate side effects in webhooks and queues.",
    context: "Used when workers can receive the same event more than once.",
    tags: ["idempotency", "retry", "webhook", "queue"]
  });
  const delta = Core.answerDelta(target, "Safe retry for webhook jobs.", 3);
  const empty = Core.answerDelta(target, "", 2);

  assert.equal(delta.hasTrace, true);
  assert.deepEqual(delta.matched, ["safe", "retry", "webhook"]);
  assert.equal(delta.missing.length, 3);
  assert.ok(delta.missing.includes("idempotency"));
  assert.equal(empty.hasTrace, false);
  assert.deepEqual(empty.missing, ["idempotency", "mean"]);
});

test("proof gate only activates for week and month memory cards", () => {
  const learning = Core.proofGate({ card: card({ stage: 2, reps: 4 }), scratchpad: "safe retry", responseMs: 8_000 });
  const month = Core.proofGate({
    card: card({
      promptType: "Definition",
      stage: 6,
      reps: 12,
      back: "Idempotency means safe retry without duplicate side effects in production queue workflows.",
      tags: ["idempotency", "retry", "queue"]
    }),
    responseMs: 18_000,
    scratchpad: "Idempotency gives safe retry without duplicate side effects in a production queue workflow."
  });
  const thin = Core.proofGate({
    card: card({ stage: 6, reps: 12 }),
    responseMs: 48_000,
    scratchpad: "I know this one."
  });

  assert.equal(learning.active, false);
  assert.equal(month.active, true);
  assert.equal(month.label, "Month proof");
  assert.equal(month.passed, true);
  assert.equal(month.tone, "success");
  assert.equal(thin.passed, false);
  assert.equal(thin.tone, "danger");
  assert.ok(thin.missing.includes("coverage"));
});

test("quality gate requires an atomic prompt, answer, source, context and type", () => {
  const incomplete = {
    front: "Too short",
    back: "Also short",
    source: "",
    context: "",
    promptType: "Definition"
  };
  const complete = {
    front: "Hva betyr idempotency i en retry-basert backend?",
    back: "Idempotency betyr at samme operasjon kan kjøres flere ganger uten dupliserte sideeffekter.",
    source: "System design canon",
    context: "Viktig for queues, webhooks og betaling.",
    promptType: "Scenario"
  };

  assert.equal(Core.payloadIsReady(incomplete), false);
  assert.equal(Core.payloadIsReady(complete), true);
  assert.deepEqual(Core.qualityGateChecks(complete).map((check) => check.ok), [true, true, true, true, true]);
});

test("recall gate requires written or spoken recall before reveal", () => {
  assert.equal(Core.recallIsReady({ scratchpad: "", spoken: false }), false);
  assert.equal(Core.recallIsReady({ scratchpad: "abc", spoken: false }), false);
  assert.equal(Core.recallIsReady({ scratchpad: "abcd", spoken: false }), true);
  assert.equal(Core.recallIsReady({ scratchpad: "", spoken: true }), true);
});

test("daily drill prioritizes due cards, rewrite debt and weak lanes without duplicates", () => {
  const cards = [
    card({ id: "future-strong", deck: "AI Expert", stage: 6, dueAt: NOW + Core.DAY }),
    card({ id: "due-old", deck: "Git / Merge", dueAt: NOW - 20_000, reps: 3 }),
    card({ id: "rewrite", deck: "System Design", dueAt: NOW + Core.DAY, needsRewrite: true, lapses: 3 }),
    card({ id: "weak-lane", deck: "Pull Retention", stage: 0, dueAt: NOW + 2 * Core.DAY }),
    card({ id: "due-new", deck: "Backend Lingo", dueAt: NOW - 10_000, reps: 0 })
  ];

  const drill = Core.buildDailyDrill(cards, { now: NOW, target: 4 });

  assert.deepEqual(drill.map((item) => item.card.id), ["due-old", "due-new", "rewrite", "weak-lane"]);
  assert.deepEqual(drill.map((item) => item.reason), ["due", "due", "rewrite", "weak lane"]);
  assert.equal(new Set(drill.map((item) => item.card.id)).size, drill.length);
});

test("session plan interleaves due cards by deck and prompt type when possible", () => {
  const cards = [
    card({ id: "git-a", deck: "Git / Merge", promptType: "Definition", dueAt: NOW - 40_000 }),
    card({ id: "git-b", deck: "Git / Merge", promptType: "Definition", dueAt: NOW - 30_000 }),
    card({ id: "ai-a", deck: "AI Expert", promptType: "Scenario", dueAt: NOW - 20_000 }),
    card({ id: "backend-a", deck: "Backend Lingo", promptType: "Failure mode", dueAt: NOW - 10_000 })
  ];

  const plan = Core.buildSessionPlan(cards, { now: NOW, target: 4 });
  const ids = plan.items.map((item) => item.card.id);

  assert.deepEqual(plan.items.map((item) => item.reason), ["due", "due", "due", "due"]);
  assert.equal(ids[0], "git-a");
  assert.notEqual(ids[1], "git-b");
  assert.equal(plan.items[0].card.deck !== plan.items[1].card.deck, true);
  assert.equal(plan.uniqueDecks, 3);
  assert.equal(plan.uniquePromptTypes, 3);
  assert.ok(plan.mixScore >= 80);
});

test("retention budget caps new cards when due pressure is high", () => {
  const cards = [
    card({ id: "late-1", deck: "AI Expert", dueAt: NOW - Core.DAY * 2, stage: 5 }),
    card({ id: "late-2", deck: "Backend Lingo", dueAt: NOW - Core.DAY, stage: 4 }),
    card({ id: "due-1", deck: "Git / Merge", dueAt: NOW - 1, stage: 2 }),
    card({ id: "due-2", deck: "Pull Retention", dueAt: NOW + 60_000, stage: 1 }),
    card({ id: "rewrite", deck: "System Design", dueAt: NOW + 90_000, stage: 3, needsRewrite: true })
  ];
  const budget = Core.buildRetentionBudget(cards, {
    now: NOW,
    targetMinutes: 5,
    defaultReviewMs: 60_000
  });

  assert.equal(budget.targetRetention, Core.TARGET_RETENTION);
  assert.equal(budget.dueNow, 3);
  assert.equal(budget.newCardCap, 0);
  assert.equal(budget.tone, "danger");
  assert.ok(budget.overdueRisk >= 2);
  assert.equal(budget.focusPath[0].label, "Clear due");
});

test("retention budget allows a small canon cap on sustainable days", () => {
  const cards = [
    card({ id: "due-1", dueAt: NOW - 1, stage: 1 }),
    card({ id: "later-1", dueAt: NOW + Core.DAY, stage: 2 }),
    card({ id: "later-2", dueAt: NOW + Core.DAY * 2, stage: 3 })
  ];
  const budget = Core.buildRetentionBudget(cards, {
    now: NOW,
    targetMinutes: 20,
    defaultReviewMs: 30_000
  });

  assert.equal(budget.tone, "success");
  assert.ok(budget.dailyReviewCap > budget.dueToday);
  assert.ok(budget.newCardCap > 0);
  assert.equal(budget.focusPath[3].count, budget.newCardCap);
});

test("proof queue prioritizes due week and month proof cards", () => {
  const cards = [
    card({
      id: "learning",
      deck: "Backend Lingo",
      stage: 2,
      reps: 6,
      dueAt: NOW - Core.DAY
    }),
    card({
      id: "week",
      deck: "Git / Merge",
      stage: 4,
      reps: 9,
      lastReviewedAt: NOW - Core.DAY,
      dueAt: NOW + Core.DAY,
      stabilityDays: 7
    }),
    card({
      id: "month-due",
      deck: "AI Expert",
      stage: 6,
      reps: 14,
      lastReviewedAt: NOW - 31 * Core.DAY,
      dueAt: NOW - 1000,
      stabilityDays: 30
    })
  ];
  const queue = Core.buildProofQueue(cards, { now: NOW, limit: 3 });

  assert.deepEqual(queue.map((item) => item.cardId), ["month-due", "week"]);
  assert.equal(queue[0].gateLabel, "Month proof");
  assert.equal(queue[0].due, true);
  assert.equal(queue[0].tone, "danger");
  assert.equal(queue[1].gateLabel, "Week proof");
  assert.ok(queue[0].requirements.includes("transfer signal"));
});

test("next moves turn weak mastery state into ordered actions", () => {
  const cards = [
    card({
      id: "due-ai",
      deck: "AI Expert",
      front: "Hvordan evaluerer du en AI writeback gate?",
      promptType: "Scenario",
      reps: 4,
      stage: 3,
      dueAt: NOW - 40_000
    }),
    card({
      id: "rewrite-git",
      deck: "Git / Merge",
      front: "Hva betyr clean merge uten WIP leakage?",
      needsRewrite: true,
      lapses: 3,
      reps: 3,
      stage: 1,
      dueAt: NOW + Core.DAY
    }),
    card({
      id: "month-system",
      deck: "System Design",
      front: "Hvordan beviser du capacity planning over tid?",
      reps: 7,
      stage: 5,
      dueAt: NOW + Core.DAY
    }),
    card({
      id: "fresh-pull",
      deck: "Pull Retention",
      front: "Hva er answer-first recall?",
      reps: 1,
      stage: 0,
      dueAt: NOW + 2 * Core.DAY
    })
  ];

  const moves = Core.buildNextMoves(cards, { now: NOW, limit: 4 });

  assert.equal(moves.length, 4);
  assert.deepEqual(moves.map((move) => move.label), ["Review due", "Rewrite prompt", "Capture gap", "Month proof"]);
  assert.equal(moves[0].cardId, "due-ai");
  assert.equal(moves[1].action, "rewrite");
  assert.ok(moves[2].suggestionId);
  assert.equal(moves[3].cardId, "month-system");
  assert.deepEqual(moves.map((move) => move.rank), [1, 2, 3, 4]);
});

test("contrast pairs surface overlapping concepts across decks", () => {
  const cards = [
    card({ id: "retry", deck: "Backend Lingo", front: "Hva betyr idempotency for retries?", tags: ["retry", "api"], dueAt: NOW - 1 }),
    card({ id: "queue", deck: "System Design", front: "Hvordan fungerer retry i en queue?", promptType: "Scenario", tags: ["retry", "queue"], dueAt: NOW - 1 }),
    card({ id: "unrelated", deck: "AI Expert", front: "Hva er tool calling?", promptType: "Definition", tags: ["tools"], dueAt: NOW - 1 })
  ];

  const [pair] = Core.buildContrastPairs(cards, { now: NOW, target: 1 });
  const ids = pair.cards.map((item) => item.id).sort();

  assert.deepEqual(ids, ["queue", "retry"]);
  assert.equal(pair.signal, "retry");
  assert.equal(pair.decks.length, 2);
  assert.ok(pair.score > 8);
});

test("transfer missions combine related cards into production prompts", () => {
  const cards = [
    card({
      id: "retry",
      deck: "Backend Lingo",
      front: "Hva betyr idempotency for retries?",
      promptType: "Definition",
      tags: ["retry", "api"],
      dueAt: NOW - 1
    }),
    card({
      id: "queue",
      deck: "System Design",
      front: "Hvordan fungerer retry i en queue med backpressure?",
      promptType: "Scenario",
      tags: ["retry", "queue"],
      dueAt: NOW + Core.DAY
    }),
    card({
      id: "tools",
      deck: "AI Expert",
      front: "Hva er tool calling?",
      promptType: "Definition",
      tags: ["tools"],
      dueAt: NOW + Core.DAY
    })
  ];

  const [mission] = Core.buildTransferMissions(cards, { now: NOW, target: 1 });

  assert.equal(mission.primaryCardId, "retry");
  assert.deepEqual(mission.cardIds.sort(), ["queue", "retry"]);
  assert.equal(mission.reason, "retry");
  assert.equal(mission.tone, "danger");
  assert.ok(mission.title.includes("Backend Control"));
  assert.ok(mission.title.includes("System Architecture"));
  assert.ok(mission.prompt.includes("failure mode"));
  assert.deepEqual(mission.checks, ["Boundary", "Failure mode", "Gate", "Next action"]);
});

test("expert drills turn weakest Top 5 tracks into scenario gates", () => {
  const drills = Core.buildExpertDrills(
    [
      card({
        id: "ai-due",
        deck: "AI Expert",
        front: "Hvordan designer du en LLM eval gate?",
        promptType: "Scenario",
        stage: 1,
        dueAt: NOW - 1,
        tags: ["eval", "gate"]
      }),
      card({
        id: "system-stable",
        deck: "System Design",
        front: "Hvordan designer du en reconciler?",
        promptType: "Transfer",
        stage: 6,
        reps: 7,
        dueAt: NOW + Core.DAY,
        tags: ["reconciler"]
      })
    ],
    { now: NOW, target: 6 }
  );
  const captureDrill = drills.find((drill) => drill.action === "capture");
  const aiDrill = drills.find((drill) => drill.cardId === "ai-due");

  assert.equal(drills.length, 6);
  assert.equal(captureDrill.action, "capture");
  assert.ok(captureDrill.suggestionId);
  assert.equal(aiDrill.action, "review");
  assert.equal(aiDrill.cardId, "ai-due");
  assert.equal(aiDrill.tone, "danger");
  assert.ok(aiDrill.prompt.includes("Hva kan feile"));
  assert.deepEqual(aiDrill.checks, ["Failure mode", "Gate", "Tradeoff", "Decision", "Writeback"]);
});

test("expert drill gate checks scenario judgement signals", () => {
  const drill = Core.buildExpertDrills(
    [
      card({
        id: "ai-due",
        deck: "AI Expert",
        front: "Hvordan designer du en LLM eval gate?",
        promptType: "Scenario",
        stage: 1,
        dueAt: NOW - 1,
        tags: ["eval", "gate"]
      })
    ],
    { now: NOW, target: 6 }
  ).find((item) => item.cardId === "ai-due");

  const strong = Core.expertDrillGate({
    drill,
    scratchpad: "Failure is stale source drift. Gate with eval score and policy check. Tradeoff is latency vs safety. Decision: owner ships next action, then writeback to Notion status and repo docs."
  });
  const thin = Core.expertDrillGate({
    drill,
    scratchpad: "I would fix it."
  });

  assert.equal(strong.active, true);
  assert.equal(strong.passed, true);
  assert.equal(strong.tone, "success");
  assert.deepEqual(strong.checks.map((check) => check.key), ["failure", "gate", "tradeoff", "decision", "writeback"]);
  assert.equal(thin.passed, false);
  assert.ok(thin.missing.includes("gate"));
  assert.equal(thin.tone, "danger");
});

test("mastery insights summarize due, rewrite, accuracy and next unlock", () => {
  const cards = [
    card({
      id: "due",
      deck: "Git / Merge",
      stage: 2,
      dueAt: NOW - 1,
      history: [{ at: NOW - 1_000, grade: "good", oldStage: 1, nextStage: 2 }]
    }),
    card({
      id: "rewrite",
      deck: "AI Expert",
      stage: 5,
      dueAt: NOW + Core.DAY,
      needsRewrite: true,
      history: [{ at: NOW - 2_000, grade: "again", oldStage: 5, nextStage: 0 }]
    }),
    card({
      id: "long",
      deck: "RuneOS",
      stage: 6,
      dueAt: NOW + Core.DAY,
      history: [{ at: NOW - 3_000, grade: "easy", oldStage: 4, nextStage: 6 }]
    })
  ];

  const insights = Core.masteryInsights(cards, NOW);

  assert.equal(insights.due, 1);
  assert.equal(insights.rewrite, 1);
  assert.equal(insights.longMemory, 1);
  assert.equal(insights.accuracy, 2 / 3);
  assert.equal(insights.nextUnlock.deck, "AI Expert");
  assert.equal(insights.nextUnlock.label, "1 måned");
});

test("learning ladder makes week and month retention gates explicit", () => {
  const ladder = Core.learningLadder();

  assert.deepEqual(ladder.slice(0, 3).map((step) => step.label), ["5 min", "1 time", "1 dag"]);
  assert.ok(ladder.some((step) => step.label === "1 uke" && step.phase === "Long memory"));
  assert.ok(ladder.some((step) => step.label === "1 måned" && step.rule.includes("mastery")));
  assert.ok(Core.METHOD_RULES.some((rule) => rule.title === "Answer first"));
  assert.ok(Core.CANON_SIGNALS.some((signal) => signal.lane === "Clean Merge"));
  assert.ok(Core.GRADE_CONTRACT.some((grade) => grade.label === "Slet" && grade.rule.includes("Correct")));
  assert.ok(Core.CANON_CARD_TYPES.some((cardType) => cardType.type === "Transfer"));
});

test("retention policy centralizes intervals and proof gate thresholds", () => {
  const policy = Core.RETENTION_POLICY;

  assert.equal(policy.targetRetention, Core.TARGET_RETENTION);
  assert.equal(policy.intervals, Core.INTERVALS);
  assert.equal(policy.gates.week.minStage, 4);
  assert.equal(policy.gates.week.coverage, 0.38);
  assert.equal(policy.gates.month.minStage, 6);
  assert.equal(policy.gates.month.coverage, 0.5);
  assert.deepEqual(policy.gates.month.queueRequirements, ["50% coverage", "transfer signal", "<35s pace"]);
  assert.ok(policy.transferSignals.includes("merge"));
  assert.ok(policy.transferSignals.includes("workflow"));
});
