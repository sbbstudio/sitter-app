(function initFamilyGameCore(root, factory) {
  if (typeof module === "object" && module.exports) {
    const retentionCore = require("./retention-core.js");
    const core = factory(retentionCore, require("./family-game-content.js"));
    core.createForContent = (content) => factory(retentionCore, content);
    module.exports = core;
  } else {
    root.createFamilyGameCore = (content) => factory(root.RetentionCore, content);
    if (root.FAMILY_GAME_CONTENT) root.FamilyGameCore = root.createFamilyGameCore(root.FAMILY_GAME_CONTENT);
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function createFamilyGameCore(RetentionCore, Content) {
  if (!RetentionCore) throw new Error("RetentionCore is required");
  if (!Content) throw new Error("FAMILY_GAME_CONTENT is required");

  const SCHEMA_VERSION = 1;
  const STORE_KEY = "sitter-family-game-v1";
  const SCHEDULER_ID = "family-game-retention-adapter-v1";
  const POLICY_ID = "retention-core-policy-v1";
  const SEMANTIC_OUTCOMES = Object.freeze({
    AIDED_NO_PROMOTE: "AIDED_NO_PROMOTE",
    FAILED_OPEN_NO_PROMOTE: "FAILED_OPEN_NO_PROMOTE",
    OPEN_CORRECT_COMEBACK_PROMOTE_ONE: "OPEN_CORRECT_COMEBACK_PROMOTE_ONE",
    PROMOTE_ONE: "PROMOTE_ONE",
    RELEARNING_HOLD: "RELEARNING_HOLD",
    REVEALED_NO_PROMOTE: "REVEALED_NO_PROMOTE",
    STEAL_PROMOTE_ONE: "STEAL_PROMOTE_ONE"
  });
  const PROMOTION_OUTCOMES = new Set([
    SEMANTIC_OUTCOMES.PROMOTE_ONE,
    SEMANTIC_OUTCOMES.OPEN_CORRECT_COMEBACK_PROMOTE_ONE,
    SEMANTIC_OUTCOMES.STEAL_PROMOTE_ONE
  ]);
  const NO_PROMOTION_OUTCOMES = new Set([
    SEMANTIC_OUTCOMES.AIDED_NO_PROMOTE,
    SEMANTIC_OUTCOMES.FAILED_OPEN_NO_PROMOTE,
    SEMANTIC_OUTCOMES.REVEALED_NO_PROMOTE
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId(prefix) {
    const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}:${uuid}`;
  }

  function learnerMemoryId(learnerProfileId, essentialId) {
    return `lm:${learnerProfileId}:${essentialId}`;
  }

  function memoryKey(learnerProfileId, essentialId) {
    return `${learnerProfileId}::${essentialId}`;
  }

  function initialMemory(learnerProfileId, essentialId, now) {
    return {
      createdAt: now,
      difficulty: null,
      dueAt: now,
      ease: null,
      essentialId,
      lastAppliedReviewEventId: null,
      lastReviewedAt: null,
      lastSemanticOutcome: null,
      learnerMemoryId: learnerMemoryId(learnerProfileId, essentialId),
      learnerProfileId,
      policyId: POLICY_ID,
      reps: 0,
      schedulerId: SCHEDULER_ID,
      stabilityDays: null,
      stage: 0,
      updatedAt: now,
      version: 0
    };
  }

  function createSeedState(now = Date.now()) {
    const learnerProfileId = "profile-casper";
    const memories = {};
    for (const family of Content.families) {
      memories[memoryKey(learnerProfileId, family.essentialId)] = initialMemory(learnerProfileId, family.essentialId, now);
    }
    return {
      activeMatchId: null,
      attemptEvents: [],
      createdAt: now,
      family: {
        createdAt: now,
        displayName: "Sitter-familien",
        familyId: "family-sitter-1",
        guardianProfileId: "profile-rune",
        localScopeId: "sitter-family-local-v1",
        updatedAt: now
      },
      matchQueueEvents: [],
      matches: [],
      memories,
      profiles: [
        { createdAt: now, displayName: "Casper", familyId: "family-sitter-1", guardianManaged: true, kind: "learner", profileId: learnerProfileId, updatedAt: now },
        { createdAt: now, displayName: "Rune", familyId: "family-sitter-1", guardianManaged: false, kind: "adult", profileId: "profile-rune", updatedAt: now },
        { createdAt: now, displayName: "Dag", familyId: "family-sitter-1", guardianManaged: false, kind: "adult", profileId: "profile-dag", updatedAt: now }
      ],
      reviewEvents: [],
      schemaVersion: SCHEMA_VERSION,
      scoreEvents: [],
      updatedAt: now,
      variantUsage: []
    };
  }

  function normalizeState(raw, now = Date.now()) {
    if (!raw || typeof raw !== "object") throw new Error("Invalid Family Game snapshot");
    const state = clone(raw);
    if (!Array.isArray(state.profiles) || !Array.isArray(state.matches)) throw new Error("Family Game snapshot is incomplete");
    state.schemaVersion = SCHEMA_VERSION;
    state.attemptEvents = Array.isArray(state.attemptEvents) ? state.attemptEvents : [];
    state.reviewEvents = Array.isArray(state.reviewEvents) ? state.reviewEvents : [];
    state.scoreEvents = Array.isArray(state.scoreEvents) ? state.scoreEvents : [];
    state.matchQueueEvents = Array.isArray(state.matchQueueEvents) ? state.matchQueueEvents : [];
    state.variantUsage = Array.isArray(state.variantUsage) ? state.variantUsage : [];
    state.memories = state.memories && typeof state.memories === "object" ? state.memories : {};
    const seen = new Set();
    for (const memory of Object.values(state.memories)) {
      const key = memoryKey(memory.learnerProfileId, memory.essentialId);
      if (seen.has(key)) throw new Error(`Duplicate LearnerMemory: ${key}`);
      if (memory.opponentId || memory.matchId || memory.deviceId || memory.variantId || memory.score) {
        throw new Error(`Opponent/match/variant data is forbidden in LearnerMemory: ${key}`);
      }
      seen.add(key);
    }
    state.updatedAt = Number.isFinite(state.updatedAt) ? state.updatedAt : now;
    return state;
  }

  function createGameStorage(options = {}) {
    const storage = options.storage;
    const storeKey = options.storeKey || STORE_KEY;
    const stagingKey = `${storeKey}-staging`;
    const backupKey = `${storeKey}-backup`;
    const now = options.now || Date.now;
    if (!storage) throw new Error("Storage adapter is required");

    function parse(key) {
      const text = storage.getItem(key);
      return text ? normalizeState(JSON.parse(text), now()) : null;
    }

    function load() {
      for (const [key, source] of [[storeKey, "primary"], [stagingKey, "staging"], [backupKey, "backup"]]) {
        try {
          const state = parse(key);
          if (state) return { source, state };
        } catch {
          // Continue to the next whole-snapshot fallback.
        }
      }
      return { source: "seed", state: createSeedState(now()) };
    }

    function save(candidate) {
      try {
        const state = normalizeState({ ...candidate, updatedAt: now() }, now());
        const text = JSON.stringify(state);
        const previous = storage.getItem(storeKey);
        storage.setItem(stagingKey, text);
        if (previous) storage.setItem(backupKey, previous);
        storage.setItem(storeKey, text);
        storage.removeItem(stagingKey);
        return { ok: true, state };
      } catch (error) {
        try { storage.removeItem(stagingKey); } catch { /* preserve original error */ }
        return { error, ok: false };
      }
    }

    function reset() {
      storage.removeItem(stagingKey);
      storage.removeItem(backupKey);
      storage.removeItem(storeKey);
      return createSeedState(now());
    }

    return { backupKey, load, reset, save, stagingKey, storeKey };
  }

  function getProfile(state, profileId) {
    return state.profiles.find((profile) => profile.profileId === profileId) || null;
  }

  function getMemory(state, learnerProfileId, essentialId) {
    return state.memories[memoryKey(learnerProfileId, essentialId)] || null;
  }

  function getMatch(state, matchId = state.activeMatchId) {
    return state.matches.find((match) => match.matchId === matchId) || null;
  }

  function variantFor(essentialId, role) {
    return Content.variants.find((variant) => variant.essentialId === essentialId && variant.variantRole === role) || null;
  }

  function eligibleFamilies(state, options = {}) {
    const learnerProfileId = options.learnerProfileId || "profile-casper";
    const now = options.now ?? Date.now();
    const subject = options.subject || "Alle fag";
    const gradeLevel = options.gradeLevel || 3;
    return Content.families
      .filter((family) => family.gradeLevel === gradeLevel)
      .filter((family) => subject === "Alle fag" || family.subject === subject)
      .map((family) => ({ family, memory: getMemory(state, learnerProfileId, family.essentialId) }))
      .filter(({ memory }) => memory && memory.dueAt <= now)
      .sort((a, b) => a.memory.dueAt - b.memory.dueAt || a.memory.reps - b.memory.reps || a.family.essentialId.localeCompare(b.family.essentialId));
  }

  function startMatch(inputState, options = {}) {
    const state = normalizeState(inputState, options.now ?? Date.now());
    const now = options.now ?? Date.now();
    const learnerProfileId = options.learnerProfileId || "profile-casper";
    const challengerProfileId = options.challengerProfileId || "profile-rune";
    const active = state.matches.find((match) => match.learnerProfileId === learnerProfileId && match.status === "in_progress");
    if (active) throw new Error("ACTIVE_MATCH_EXISTS");
    if (!getProfile(state, learnerProfileId) || !getProfile(state, challengerProfileId)) throw new Error("UNKNOWN_PROFILE");

    const matchSize = Math.max(1, Number(options.matchSize) || 4);
    const chosen = eligibleFamilies(state, { ...options, learnerProfileId, now }).slice(0, matchSize);
    if (!chosen.length) throw new Error("NO_DUE_ESSENTIALS");
    const matchId = options.matchId || createId("match");
    const turnPlan = [];
    for (const { family, memory } of chosen) {
      for (const role of ["child_core", "adult_challenge"]) {
        const actorProfileId = role === "child_core" ? learnerProfileId : challengerProfileId;
        const selectedVariant = variantFor(family.essentialId, role);
        turnPlan.push({
          actorProfileId,
          essentialId: family.essentialId,
          role,
          turnId: `${matchId}:turn:${turnPlan.length + 1}`,
          variantId: selectedVariant.variantId,
          wasDue: memory.dueAt <= now
        });
      }
    }
    const adjudicationMode = options.adjudicationMode === "game_master" ? "game_master" : "consensus";
    const match = {
      adjudicationMode,
      completedAt: null,
      completedTurnCount: 0,
      completedTurnIds: [],
      createdAt: now,
      currentTurn: 0,
      familyId: state.family.familyId,
      gameMasterProfileId: adjudicationMode === "game_master" ? challengerProfileId : null,
      gradeLevel: options.gradeLevel || 3,
      learnerProfileId,
      matchId,
      matchSize,
      players: [
        { joinedAt: now, matchPlayerId: `mp:${matchId}:${learnerProfileId}`, profileId: learnerProfileId, roles: ["learner"], score: 0, seat: 0 },
        { joinedAt: now, matchPlayerId: `mp:${matchId}:${challengerProfileId}`, profileId: challengerProfileId, roles: adjudicationMode === "game_master" ? ["challenger", "game_master"] : ["challenger"], score: 0, seat: 1 }
      ],
      queue: [],
      startedAt: now,
      status: "in_progress",
      subject: options.subject || "Alle fag",
      turnPlan,
      updatedAt: now,
      version: 0
    };
    state.matches.push(match);
    state.activeMatchId = matchId;
    state.updatedAt = now;
    return { match: clone(match), state };
  }

  function getCurrentTurn(state, matchId = state.activeMatchId) {
    const match = getMatch(state, matchId);
    if (!match || match.status !== "in_progress") return null;
    const queued = match.queue.find((item) => !item.consumed && item.eligibleAfterTurn <= match.completedTurnCount);
    if (queued) return clone(queued.turn);
    const base = match.turnPlan.find((turn) => !match.completedTurnIds.includes(turn.turnId));
    if (base) return clone(base);
    const pendingComeback = match.queue.find((item) => !item.consumed);
    return pendingComeback ? clone(pendingComeback.turn) : null;
  }

  function projectionCard(memory, now) {
    const stageInterval = RetentionCore.INTERVALS[Math.min(memory.stage, RetentionCore.INTERVALS.length - 1)];
    return {
      back: memory.essentialId,
      deck: "Family Game",
      difficulty: memory.difficulty,
      dueAt: memory.dueAt,
      ease: memory.ease || 2.5,
      front: memory.essentialId,
      history: [],
      id: memory.learnerMemoryId,
      lapses: 0,
      lastGrade: "good",
      lastReviewedAt: memory.lastReviewedAt || now - stageInterval.ms,
      needsRewrite: false,
      reps: Math.max(1, memory.reps),
      responseTimes: [],
      stabilityDays: memory.stabilityDays,
      stage: memory.stage,
      subject: "Family Game"
    };
  }

  const FamilyGameRetentionAdapter = {
    preview(memory, semanticOutcome, context = {}) {
      const now = context.now ?? Date.now();
      const before = clone(memory);
      if (NO_PROMOTION_OUTCOMES.has(semanticOutcome)) {
        return { memory: before, semanticOutcome };
      }
      if (PROMOTION_OUTCOMES.has(semanticOutcome)) {
        if (!context.wasDue) throw new Error("PROMOTION_REQUIRES_DUE_ESSENTIAL");
        const scheduled = RetentionCore.scheduleReview(projectionCard(before, now), "good", { now });
        const expectedStage = Math.min(before.stage + 1, RetentionCore.INTERVALS.length - 1);
        if (scheduled.card.stage !== expectedStage || scheduled.card.dueAt <= now) throw new Error("INVALID_PROMOTION_PROJECTION");
        return { memory: { ...before, difficulty: scheduled.card.difficulty, dueAt: scheduled.card.dueAt, ease: scheduled.card.ease, reps: scheduled.card.reps, stabilityDays: scheduled.card.stabilityDays, stage: scheduled.card.stage }, semanticOutcome };
      }
      if (semanticOutcome === SEMANTIC_OUTCOMES.RELEARNING_HOLD) {
        const scheduled = RetentionCore.scheduleReview(projectionCard(before, now), "hard", { now });
        const maxDueAt = now + RetentionCore.INTERVALS[Math.min(before.stage, RetentionCore.INTERVALS.length - 1)].ms;
        if (scheduled.card.stage !== before.stage || (before.stage > 0 && scheduled.card.stage === 0) || scheduled.card.dueAt <= now || scheduled.card.dueAt > maxDueAt) {
          throw new Error("INVALID_RELEARNING_HOLD_PROJECTION");
        }
        return { memory: { ...before, difficulty: scheduled.card.difficulty, dueAt: scheduled.card.dueAt, ease: scheduled.card.ease, reps: scheduled.card.reps, stabilityDays: scheduled.card.stabilityDays, stage: scheduled.card.stage }, semanticOutcome };
      }
      throw new Error(`UNKNOWN_SEMANTIC_OUTCOME:${semanticOutcome}`);
    }
  };

  function stableAttemptPayload(attempt) {
    const keys = ["actorProfileId", "adjudicationMode", "attemptKind", "essentialId", "helpStatus", "matchId", "priorAttemptId", "priorOutcome", "turnId", "variantId", "variantRole", "verdict", "wasDue"];
    return JSON.stringify(keys.reduce((payload, key) => ({ ...payload, [key]: attempt[key] ?? null }), {}));
  }

  function outcomeForAttempt(attempt, match) {
    const learnerAttempt = attempt.actorProfileId === match.learnerProfileId;
    if (!learnerAttempt || attempt.verdict === "disputed" || attempt.verdict === "unsure") return null;
    if (attempt.helpStatus === "revealed") return SEMANTIC_OUTCOMES.REVEALED_NO_PROMOTE;
    if (attempt.helpStatus === "aided") return SEMANTIC_OUTCOMES.AIDED_NO_PROMOTE;
    if (attempt.verdict !== "correct") return SEMANTIC_OUTCOMES.FAILED_OPEN_NO_PROMOTE;
    if (attempt.attemptKind === "steal") {
      if (Content.memoryPolicy?.stealWritesLearnerMemory === false) return null;
      return attempt.wasDue ? SEMANTIC_OUTCOMES.STEAL_PROMOTE_ONE : null;
    }
    if (attempt.variantRole === "comeback") {
      if (attempt.priorOutcome === SEMANTIC_OUTCOMES.FAILED_OPEN_NO_PROMOTE) return SEMANTIC_OUTCOMES.RELEARNING_HOLD;
      return attempt.wasDue ? SEMANTIC_OUTCOMES.OPEN_CORRECT_COMEBACK_PROMOTE_ONE : null;
    }
    return attempt.wasDue ? SEMANTIC_OUTCOMES.PROMOTE_ONE : null;
  }

  function pointsForAttempt(attempt, match) {
    const scoring = Content.scoringPolicy || {};
    if (attempt.verdict === "disputed" || attempt.verdict === "unsure") return { points: 0, reason: "house_rule" };
    if (attempt.actorProfileId !== match.learnerProfileId) {
      return {
        points: attempt.verdict === "correct" ? (scoring.adultCorrect ?? 2) : 0,
        reason: attempt.verdict === "correct" ? "open_correct" : "failed_open"
      };
    }
    if (attempt.helpStatus === "revealed") return { points: 0, reason: "reveal" };
    if (attempt.verdict !== "correct") return { points: 0, reason: "failed_open" };
    if (attempt.helpStatus === "aided") return { points: scoring.childHelpTaken ?? 1, reason: "aided_correct" };
    if (attempt.attemptKind === "steal") return { points: scoring.successfulSteal ?? 2, reason: "steal" };
    if (attempt.variantRole === "comeback") {
      const points = attempt.priorOutcome === SEMANTIC_OUTCOMES.AIDED_NO_PROMOTE
        ? (scoring.childComebackAfterHelpCorrect ?? 3)
        : (scoring.childComebackAfterMissCorrect ?? 3);
      return { points, reason: "comeback" };
    }
    return { points: scoring.childUnaidedCorrect ?? 2, reason: "open_correct" };
  }

  function applyAttempt(inputState, rawAttempt) {
    const now = rawAttempt.occurredAt ?? Date.now();
    const state = normalizeState(inputState, now);
    const match = getMatch(state, rawAttempt.matchId);
    if (!match || match.status !== "in_progress") throw new Error("MATCH_NOT_ACTIVE");
    const attempt = {
      adjudicationMode: match.adjudicationMode,
      attemptId: rawAttempt.attemptId || createId("attempt"),
      attemptKind: rawAttempt.attemptKind || "turn",
      helpStatus: rawAttempt.helpStatus || "open",
      occurredAt: now,
      priorAttemptId: rawAttempt.priorAttemptId || null,
      priorOutcome: rawAttempt.priorOutcome || null,
      verdict: rawAttempt.verdict,
      ...rawAttempt,
      matchId: match.matchId
    };
    const payloadHash = stableAttemptPayload(attempt);
    const existing = state.attemptEvents.find((event) => event.attemptId === attempt.attemptId);
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new Error("IDEMPOTENCY_CONFLICT");
      const reviewEvent = state.reviewEvents.find((event) => event.attemptId === attempt.attemptId) || null;
      const scoreEvent = state.scoreEvents.find((event) => event.attemptId === attempt.attemptId) || null;
      return { attemptEvent: existing, duplicate: true, reviewEvent, scoreEvent, semanticOutcome: reviewEvent?.semanticOutcome || null, state };
    }
    const profile = getProfile(state, attempt.actorProfileId);
    if (!profile) throw new Error("UNKNOWN_ATTEMPT_ACTOR");
    const selectedVariant = Content.variants.find((variant) => variant.variantId === attempt.variantId);
    if (!selectedVariant || selectedVariant.essentialId !== attempt.essentialId) throw new Error("INVALID_VARIANT_IDENTITY");

    const attemptEvent = { ...attempt, payloadHash };
    state.attemptEvents.push(attemptEvent);
    const matchPlayer = match.players.find((player) => player.profileId === attempt.actorProfileId);
    if (!matchPlayer) throw new Error("ACTOR_NOT_IN_MATCH");
    const score = pointsForAttempt(attempt, match);
    const scoreEvent = {
      attemptId: attempt.attemptId,
      beneficiaryMatchPlayerId: matchPlayer.matchPlayerId,
      correctionOfEventId: null,
      eventId: `score:${attempt.attemptId}:${matchPlayer.matchPlayerId}:r0`,
      idempotencyKey: `score:${attempt.attemptId}:${matchPlayer.matchPlayerId}:r0`,
      matchId: match.matchId,
      occurredAt: now,
      pointsDelta: score.points,
      reason: score.reason,
      revision: 0
    };
    state.scoreEvents.push(scoreEvent);
    matchPlayer.score += score.points;

    const semanticOutcome = outcomeForAttempt(attempt, match);
    let reviewEvent = null;
    if (semanticOutcome) {
      const key = memoryKey(match.learnerProfileId, attempt.essentialId);
      const before = state.memories[key];
      if (!before) throw new Error("LEARNER_MEMORY_NOT_FOUND");
      const projected = FamilyGameRetentionAdapter.preview(before, semanticOutcome, { now, wasDue: Boolean(attempt.wasDue) }).memory;
      reviewEvent = {
        actorProfileId: attempt.actorProfileId,
        adjudicationMode: match.adjudicationMode,
        attemptId: attempt.attemptId,
        dueAtAfter: projected.dueAt,
        dueAtBefore: before.dueAt,
        essentialId: attempt.essentialId,
        eventId: `review:${attempt.attemptId}:${semanticOutcome}:r0`,
        helpStatus: attempt.helpStatus,
        idempotencyKey: `review:${attempt.attemptId}:${semanticOutcome}:r0`,
        learnerProfileId: match.learnerProfileId,
        matchId: match.matchId,
        occurredAt: now,
        priorOutcome: attempt.priorOutcome || null,
        schedulerId: SCHEDULER_ID,
        semanticOutcome,
        stageAfter: projected.stage,
        stageBefore: before.stage,
        variantId: attempt.variantId,
        wasDue: Boolean(attempt.wasDue)
      };
      state.reviewEvents.push(reviewEvent);
      state.memories[key] = {
        ...projected,
        lastAppliedReviewEventId: reviewEvent.eventId,
        lastReviewedAt: now,
        lastSemanticOutcome: semanticOutcome,
        schedulerId: SCHEDULER_ID,
        updatedAt: now,
        version: before.version + 1
      };
    }

    const queueStealRecheck = attempt.attemptKind === "steal"
      && Content.stealPolicy?.addRelatedChildCardToComebackOnAttempt === true
      && !["disputed", "unsure"].includes(attempt.verdict);
    if (queueStealRecheck || [SEMANTIC_OUTCOMES.AIDED_NO_PROMOTE, SEMANTIC_OUTCOMES.REVEALED_NO_PROMOTE, SEMANTIC_OUTCOMES.FAILED_OPEN_NO_PROMOTE].includes(semanticOutcome)) {
      const queueOutcome = semanticOutcome || "STEAL_RECHECK";
      const queueEvent = {
        attemptId: attempt.attemptId,
        consumed: false,
        eligibleAfterTurn: match.completedTurnCount + 2,
        essentialId: attempt.essentialId,
        eventId: `queue:${attempt.attemptId}:${queueOutcome}:r0`,
        idempotencyKey: `queue:${attempt.attemptId}:${queueOutcome}:r0`,
        learnerProfileId: match.learnerProfileId,
        matchId: match.matchId,
        occurredAt: now,
        reason: queueStealRecheck
          ? "steal_recheck"
          : semanticOutcome === SEMANTIC_OUTCOMES.AIDED_NO_PROMOTE
          ? "aided"
          : semanticOutcome === SEMANTIC_OUTCOMES.REVEALED_NO_PROMOTE
            ? "revealed"
            : "failed_open",
        requiredVariantRole: "comeback",
        turn: {
          actorProfileId: match.learnerProfileId,
          essentialId: attempt.essentialId,
          priorAttemptId: attempt.attemptId,
          priorOutcome: queueOutcome,
          role: "comeback",
          turnId: `${match.matchId}:comeback:${attempt.attemptId}`,
          variantId: variantFor(attempt.essentialId, "comeback").variantId,
          wasDue: Boolean(attempt.wasDue)
        }
      };
      state.matchQueueEvents.push({ ...queueEvent, turn: undefined });
      match.queue.push(queueEvent);
    }

    state.variantUsage.push({ essentialId: attempt.essentialId, matchId: match.matchId, occurredAt: now, promptFingerprint: selectedVariant.promptFingerprint, variantId: selectedVariant.variantId });
    match.updatedAt = now;
    match.version += 1;
    state.updatedAt = now;
    return { attemptEvent, reviewEvent, scoreEvent, semanticOutcome, state };
  }

  function completeTurn(inputState, turnId, now = Date.now()) {
    const state = normalizeState(inputState, now);
    const match = getMatch(state);
    if (!match || match.status !== "in_progress") throw new Error("MATCH_NOT_ACTIVE");
    if (!match.completedTurnIds.includes(turnId)) {
      match.completedTurnIds.push(turnId);
      match.completedTurnCount += 1;
      match.currentTurn = match.completedTurnCount;
    }
    const queueItem = match.queue.find((item) => item.turn.turnId === turnId);
    if (queueItem) queueItem.consumed = true;
    if (!getCurrentTurn(state, match.matchId)) {
      match.status = "completed";
      match.completedAt = now;
    }
    match.updatedAt = now;
    match.version += 1;
    state.updatedAt = now;
    return state;
  }

  function abandonMatch(inputState, now = Date.now()) {
    const state = normalizeState(inputState, now);
    const match = getMatch(state);
    if (match && match.status === "in_progress") {
      match.status = "abandoned";
      match.completedAt = now;
      match.updatedAt = now;
    }
    return state;
  }

  function matchSummary(state, matchId = state.activeMatchId) {
    const match = getMatch(state, matchId);
    if (!match) return null;
    const learner = match.players.find((player) => player.profileId === match.learnerProfileId);
    const challenger = match.players.find((player) => player.profileId !== match.learnerProfileId);
    const reviews = state.reviewEvents.filter((event) => event.matchId === match.matchId);
    return {
      challenger: { ...challenger, profile: getProfile(state, challenger.profileId) },
      comebackCount: reviews.filter((event) => [SEMANTIC_OUTCOMES.RELEARNING_HOLD, SEMANTIC_OUTCOMES.OPEN_CORRECT_COMEBACK_PROMOTE_ONE].includes(event.semanticOutcome)).length,
      learner: { ...learner, profile: getProfile(state, learner.profileId) },
      promotedCount: reviews.filter((event) => PROMOTION_OUTCOMES.has(event.semanticOutcome)).length,
      recalledWithoutHelp: reviews.filter((event) => PROMOTION_OUTCOMES.has(event.semanticOutcome) || event.semanticOutcome === SEMANTIC_OUTCOMES.RELEARNING_HOLD).length,
      reviewCount: reviews.length,
      winnerProfileId: learner.score === challenger.score ? null : learner.score > challenger.score ? learner.profileId : challenger.profileId
    };
  }

  function resolveCanonicalAnswer(variant, profile) {
    if (!variant) return "";
    if (variant.answerRuleId === "profile-display-name-v1") {
      return `My name is ${profile?.displayName || "…"}.`;
    }
    return variant.canonicalAnswer;
  }

  return {
    Content,
    FamilyGameRetentionAdapter,
    POLICY_ID,
    SCHEMA_VERSION,
    SCHEDULER_ID,
    SEMANTIC_OUTCOMES,
    STORE_KEY,
    abandonMatch,
    applyAttempt,
    completeTurn,
    createGameStorage,
    createSeedState,
    eligibleFamilies,
    getCurrentTurn,
    getMatch,
    getMemory,
    getProfile,
    learnerMemoryId,
    matchSummary,
    memoryKey,
    normalizeState,
    resolveCanonicalAnswer,
    startMatch,
    variantFor
  };
});
