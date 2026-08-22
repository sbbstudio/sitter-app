(function initRetentionCore(root, factory) {
  const core = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = core;
  }
  root.RetentionCore = core;
})(typeof globalThis !== "undefined" ? globalThis : window, function createRetentionCore() {
  const DAY = 24 * 60 * 60 * 1000;
  const TARGET_RETENTION = 0.9;
  const INTERVALS = [
    { label: "5 min", ms: 5 * 60 * 1000 },
    { label: "1 time", ms: 60 * 60 * 1000 },
    { label: "1 dag", ms: DAY },
    { label: "3 dager", ms: 3 * DAY },
    { label: "1 uke", ms: 7 * DAY },
    { label: "2 uker", ms: 14 * DAY },
    { label: "1 måned", ms: 30 * DAY },
    { label: "3 måneder", ms: 90 * DAY },
    { label: "6 måneder", ms: 180 * DAY }
  ];
  const RETENTION_POLICY = {
    name: "Rune Retention Policy",
    targetRetention: TARGET_RETENTION,
    intervals: INTERVALS,
    phases: [
      "Learning",
      "Learning",
      "Early retention",
      "Early retention",
      "Long memory",
      "Long memory",
      "Long memory",
      "Maintenance",
      "Maintenance"
    ],
    ladderRules: [
      "Fresh pass or miss comes back fast.",
      "Second same-day proof leaves working memory.",
      "First sleep gap.",
      "Friction step before week.",
      "One-week retention proof.",
      "Two-week consolidation.",
      "One-month mastery gate.",
      "Quarterly maintenance.",
      "Half-year maintenance."
    ],
    gates: {
      week: {
        key: "week",
        label: "Week proof",
        minStage: 4,
        coverage: 0.38,
        maxResponseMs: 45_000,
        traceChars: 18,
        queueRequirements: ["38% coverage", "recall trace", "<45s pace"]
      },
      month: {
        key: "month",
        label: "Month proof",
        minStage: 6,
        coverage: 0.5,
        maxResponseMs: 35_000,
        traceChars: 28,
        queueRequirements: ["50% coverage", "transfer signal", "<35s pace"]
      }
    },
    transferSignals: [
      "boundary",
      "drift",
      "eval",
      "failure",
      "feil",
      "gate",
      "handoff",
      "latency",
      "merge",
      "owner",
      "production",
      "queue",
      "retry",
      "scale",
      "scenario",
      "source",
      "system",
      "tradeoff",
      "transfer",
      "workflow"
    ]
  };

  const CURRICULUM = [
    { deck: "Pull Retention", lane: "Method", target: "Build the recall engine" },
    { deck: "Git / Merge", lane: "Ops", target: "Ship clean branches" },
    { deck: "Backend Lingo", lane: "Backend", target: "Name system behavior" },
    { deck: "System Design", lane: "Architecture", target: "Reason about scale" },
    { deck: "AI Expert", lane: "AI Systems", target: "Design model workflows" },
    { deck: "RuneOS", lane: "Governance", target: "Operate the whole machine" }
  ];

  const MASTERY_LEVELS = [
    {
      key: "foundation",
      label: "Foundation",
      minCards: 0,
      score: 0,
      accuracy: null,
      longMemory: 0,
      maxLapseRate: 1,
      maxRewriteRatio: 1,
      maxAvgResponseMs: null,
      target: "Capture the lane and start honest recall."
    },
    {
      key: "operator",
      label: "Operator",
      minCards: 4,
      score: 0.28,
      accuracy: 0.55,
      longMemory: 0,
      maxLapseRate: 0.42,
      maxRewriteRatio: 0.34,
      maxAvgResponseMs: 60 * 1000,
      target: "Use the concepts under daily review pressure."
    },
    {
      key: "architect",
      label: "Architect",
      minCards: 6,
      score: 0.56,
      accuracy: 0.72,
      longMemory: 1,
      maxLapseRate: 0.24,
      maxRewriteRatio: 0.16,
      maxAvgResponseMs: 35 * 1000,
      target: "Connect the lane to scenarios and tradeoffs."
    },
    {
      key: "expert",
      label: "Expert",
      minCards: 6,
      score: 0.78,
      accuracy: 0.86,
      longMemory: 3,
      maxLapseRate: 0.12,
      maxRewriteRatio: 0,
      maxAvgResponseMs: 22 * 1000,
      target: "Hold clean recall through month-level gates."
    }
  ];

  const METHOD_RULES = [
    {
      title: "Answer first",
      proof: "Retrieval practice",
      body: "Reveal is locked until you have a written trace or spoken recall. The rep is the attempt, not the reading."
    },
    {
      title: "Short learning steps",
      proof: "Adaptive R/S/D",
      body: "New cards stay under one day first, then difficulty, stability and retrievability tune the next interval."
    },
    {
      title: "Week and month proof",
      proof: "Distributed practice",
      body: "A card is not stable just because it survived today. One week and one month are explicit mastery gates."
    },
    {
      title: "Rewrite weak prompts",
      proof: "Feedback loop",
      body: "Repeated misses mark the card, because bad prompts create noisy memory data."
    },
    {
      title: "Contrast neighbors",
      proof: "Interleaving",
      body: "Confusable concepts are pulled together so you learn the boundary: fetch vs pull, eval vs gate."
    }
  ];

  const GRADE_CONTRACT = [
    { grade: "Again", label: "Glemte", rule: "No recall. Reset fast and inspect the prompt." },
    { grade: "Hard", label: "Slet", rule: "Correct, but slow or effortful. Keep it close." },
    { grade: "Good", label: "Kan", rule: "Correct without drama. Advance one step." },
    { grade: "Easy", label: "Lett", rule: "Correct, fast and transferable. Skip forward." }
  ];

  const CANON_CARD_TYPES = [
    { type: "Fact", target: "Define the term precisely." },
    { type: "Contrast", target: "Separate two confusable concepts." },
    { type: "Scenario", target: "Apply the concept in a real workflow." },
    { type: "Failure mode", target: "Spot what breaks and why." },
    { type: "Tradeoff", target: "Choose between valid paths." },
    { type: "Transfer", target: "Use the idea in a new system." }
  ];

  const CANON_SIGNALS = [
    {
      lane: "Backend Gate",
      target: "Separate triage, eval, gate and writeback.",
      source: "Notion: Backend Gate / NYME quality coverage"
    },
    {
      lane: "Clean Merge",
      target: "Lift reviewed work from origin/main without unrelated WIP.",
      source: "Notion: KAIZEN CTO merge discipline"
    },
    {
      lane: "AI Stack",
      target: "Python, FastAPI, LangChain, PostgreSQL, AWS and LLM orchestration.",
      source: "Notion: Senior AI Engineer role signals"
    },
    {
      lane: "Runtime Truth",
      target: "System Logs carry runtime events; System Docs carry durable contracts.",
      source: "Notion: System Docs cleanup contract"
    }
  ];

  const TOP5_TRACKS = [
    {
      id: "retention-engine",
      label: "Retention Engine",
      deck: "Pull Retention",
      role: "Learn faster than baseline",
      source: "Notion: IRIS Memory Assistant System Docs; Pull Retention objective",
      requiredPromptTypes: ["Scenario", "Failure mode", "Transfer"],
      signals: ["answer-first recall", "week/month proof", "rewrite loop"],
      drill: "Explain why reveal is locked before answer."
    },
    {
      id: "clean-ops",
      label: "Clean Ops",
      deck: "Git / Merge",
      role: "Ship without WIP leakage",
      source: "Notion: CTO End Log; clean merge discipline; REVIEW_PASS flip rule",
      requiredPromptTypes: ["Scenario", "Failure mode", "Tradeoff"],
      signals: ["origin/main lift", "review gate", "flip on pass"],
      drill: "Choose the clean path from reviewed branch to main."
    },
    {
      id: "backend-control",
      label: "Backend Control",
      deck: "Backend Lingo",
      role: "Name runtime behavior precisely",
      source: "Notion: Backend Gate; Status Tracker; iris-sync auto-heal governance",
      requiredPromptTypes: ["Definition", "Contrast", "Scenario"],
      signals: ["source of truth", "cron visibility", "triage vs eval"],
      drill: "Separate source-of-truth, runtime event and derived status."
    },
    {
      id: "system-architecture",
      label: "System Architecture",
      deck: "System Design",
      role: "Design for scale and drift",
      source: "Notion: System Docs; Two-Layer Canon Contract; content drift logs",
      requiredPromptTypes: ["Scenario", "Tradeoff", "Transfer"],
      signals: ["contracts", "reconciler", "migration path"],
      drill: "Design a reconciler for Notion, repo and cache drift."
    },
    {
      id: "ai-systems",
      label: "AI Systems",
      deck: "AI Expert",
      role: "Build model workflows end to end",
      source: "Notion: Senior AI Engineer; Python/FastAPI/LangChain/PostgreSQL/AWS",
      requiredPromptTypes: ["Scenario", "Failure mode", "Transfer"],
      signals: ["LLM eval", "tool orchestration", "production backend"],
      drill: "Design an LLM workflow with eval gate and writeback."
    },
    {
      id: "runeos-governance",
      label: "RuneOS Governance",
      deck: "RuneOS",
      role: "Operate the whole machine",
      source: "Notion: KAIZEN Status Tracker SOP; System Logs routing",
      requiredPromptTypes: ["Scenario", "Tradeoff", "Transfer"],
      signals: ["domain row", "handoff id", "material event"],
      drill: "Decide what becomes durable system truth after a session."
    }
  ];

  const CANON_BLUEPRINTS = [
    {
      trackId: "retention-engine",
      promptType: "Scenario",
      front: "Du legger inn et nytt Backend Gate-begrep. Hva er riktig recall-loop første kveld?",
      back: "Svar først uten å se, reveal etterpå, grade ærlig og hold kortet tett: 5 min, 1 time og deretter dag/uke/måned når svaret faktisk holder.",
      context: "Pull Retention skal gjøre canon-begrep operative samme dag.",
      tags: ["retrieval", "learning-step", "backend-gate"]
    },
    {
      trackId: "retention-engine",
      promptType: "Failure mode",
      front: "Hva går galt hvis du revealer før du har skrevet eller sagt svaret?",
      back: "Du trener gjenkjenning i stedet for retrieval. Dataene blir falskt positive, intervallet vokser for tidlig og svake prompts blir skjult.",
      context: "Svar-gaten beskytter recall-data mot passiv lesing.",
      tags: ["retrieval", "reveal", "grading"]
    },
    {
      trackId: "retention-engine",
      promptType: "Transfer",
      front: "Hvordan gjør du en Notion-beslutning om til et varig Pull Retention-kort?",
      back: "Trekk ut ett atomisk prinsipp, skriv et scenario der prinsippet brukes, legg inn kilde og kontekst, og test kortet før det får lengre intervall.",
      context: "Notion er canon-kilde; appen skal gjøre kunnskapen operativ.",
      tags: ["notion", "canon", "capture"]
    },
    {
      trackId: "clean-ops",
      promptType: "Scenario",
      front: "En branch har REVIEW_PASS, men lokal working tree har WIP. Hvordan shipper du rent?",
      back: "Start fra frisk origin/main, løft kun de reviewede endringene, kjør checks, åpne PR og merge uten å dra med urelatert WIP.",
      context: "CTO merge-disiplin fra KAIZEN End Logs.",
      tags: ["git", "merge", "review-pass"]
    },
    {
      trackId: "clean-ops",
      promptType: "Failure mode",
      front: "Hva går galt hvis REVIEW_PASS merges sammen med urelaterte WIP-commits?",
      back: "Review-signalet blir upålitelig, regressions kan snike inn uten gate, og main slutter å være en ren historikk over godkjent arbeid.",
      context: "Clean merge skal beskytte source-of-truth i repo.",
      tags: ["wip", "main", "review"]
    },
    {
      trackId: "clean-ops",
      promptType: "Tradeoff",
      front: "Når velger du cherry-pick/lift fremfor vanlig merge av en arbeidsbranch?",
      back: "Når branchen inneholder blandet historikk eller WIP. Lift/cherry-pick bevarer bare godkjente endringer; merge er trygg når hele branchen er reviewet scope.",
      context: "Tradeoff mellom historikkbevaring og scope-kontroll.",
      tags: ["cherry-pick", "scope", "git"]
    },
    {
      trackId: "backend-control",
      promptType: "Definition",
      front: "Hva betyr source of truth i en Status Tracker?",
      back: "Den flaten som andre systemer skal stole på for nå-status. Den må ha klare felt, eier, siste hendelse og oppdateres ved materielle endringer.",
      context: "Status Tracker SOP gjør status operasjonell.",
      tags: ["status-tracker", "source-of-truth", "backend"]
    },
    {
      trackId: "backend-control",
      promptType: "Contrast",
      front: "Forskjellen på System Logs og System Docs i RuneOS?",
      back: "System Logs er hendelsesledger for runtime og handoffs. System Docs er durable kontrakter, arkitektur og regler som skal vare etter økten.",
      context: "Riktig routing hindrer content drift.",
      tags: ["system-logs", "system-docs", "runtime"]
    },
    {
      trackId: "backend-control",
      promptType: "Scenario",
      front: "En cron kjører iris-sync, men statusflaten oppdateres ikke. Hva sjekker du først?",
      back: "Sjekk om cron faktisk trigget, om run logger en materiell hendelse, om writeback traff riktig source of truth, og om feil ble routet til drift.",
      context: "iris-sync må være synlig før auto-heal kan være trygt.",
      tags: ["cron", "iris-sync", "writeback"]
    },
    {
      trackId: "system-architecture",
      promptType: "Scenario",
      front: "Notion, repo og cache viser ulik status. Hvordan designer du en trygg reconciler?",
      back: "Definer source of truth, les alle kilder, marker drift, foreslå patch i shadow mode, krev gate før writeback og logg hver material event.",
      context: "Two-Layer Canon Contract og content drift-signaler.",
      tags: ["reconciler", "drift", "source-of-truth"]
    },
    {
      trackId: "system-architecture",
      promptType: "Tradeoff",
      front: "Tradeoff: automatisk auto-heal vs human gate når system docs og repo divergerer?",
      back: "Auto-heal gir fart for lavrisiko drift, men human gate trengs når canonical contract eller publiserbar sannhet kan endres.",
      context: "Governance må styre muterende automasjon.",
      tags: ["auto-heal", "gate", "governance"]
    },
    {
      trackId: "system-architecture",
      promptType: "Transfer",
      front: "Hvordan overfører du Two-Layer Canon Contract til et nytt AI-produkt?",
      back: "Skill mellom runtime events og durable contracts, bygg writeback-gate, hold provenance på hver endring og la cache være avledet, ikke sannhet.",
      context: "System design-prinsippet skal fungere utenfor KAIZEN også.",
      tags: ["canon", "contracts", "ai-product"]
    },
    {
      trackId: "ai-systems",
      promptType: "Scenario",
      front: "Hvordan designer du en LLM-workflow med eval gate og writeback?",
      back: "La modellen produsere kandidat, kjør deterministiske og LLM-baserte evals, hold shadow mode ved usikkerhet, og skriv bare tilbake etter gate.",
      context: "Senior AI Engineer-stack krever production-grade AI workflows.",
      tags: ["llm", "eval", "writeback"]
    },
    {
      trackId: "ai-systems",
      promptType: "Failure mode",
      front: "Hva går galt hvis en LangChain/FastAPI-agent skriver til PostgreSQL uten eval gate?",
      back: "Feil hallucinerte beslutninger kan bli persistent state. Du mister skille mellom forslag og sannhet, og rollback/audit blir vanskeligere.",
      context: "AI workflows må skille inference fra canonical write.",
      tags: ["langchain", "fastapi", "postgresql"]
    },
    {
      trackId: "ai-systems",
      promptType: "Transfer",
      front: "Hvordan bruker du AWS, FastAPI og PostgreSQL til å gjøre en LLM-agent produksjonsklar?",
      back: "FastAPI eier kontrakter, PostgreSQL lagrer auditable state, AWS kjører jobs/queues/secrets, og LLM-laget holdes bak eval, logging og retries.",
      context: "Dette matcher Senior AI Engineer-stack i Notion.",
      tags: ["aws", "fastapi", "postgresql"]
    },
    {
      trackId: "runeos-governance",
      promptType: "Scenario",
      front: "Et agent-handoff har en materiell beslutning. Hva skal inn i RuneOS etter økten?",
      back: "Logg material event, eier, beslutning, source, neste steg og om dette skal bli durable System Docs eller bare session history.",
      context: "RuneOS skal operere hele maskinen uten status-støy.",
      tags: ["handoff", "system-log", "decision"]
    },
    {
      trackId: "runeos-governance",
      promptType: "Tradeoff",
      front: "Når skal en session-note bli System Docs i stedet for bare System Logs?",
      back: "Når den endrer en varig kontrakt, SOP, arkitektur, datafelt eller policy. Vanlige hendelser og progress-notater blir i logs.",
      context: "Dette hindrer at docs blir en oppblåst hendelsesfeed.",
      tags: ["docs", "logs", "sop"]
    },
    {
      trackId: "runeos-governance",
      promptType: "Transfer",
      front: "Hvordan kan Status Tracker-prinsippet brukes på din egen læring?",
      back: "Lag en rad per mastery-lane, mål due/rewrite/month-proof, skriv siste material event, og bruk neste blocker til å velge dagens økt.",
      context: "RuneOS governance kan styre både system og personlig mastery.",
      tags: ["status-tracker", "mastery", "learning"]
    }
  ];

  const PASSING_GRADES = new Set(["hard", "good", "easy"]);
  const MAX_STABILITY_DAYS = INTERVALS[INTERVALS.length - 1].ms / DAY;
  const MIN_STABILITY_DAYS = INTERVALS[0].ms / DAY;
  const TOKEN_STOPWORDS = new Set([
    "also",
    "are",
    "can",
    "det",
    "den",
    "der",
    "eller",
    "for",
    "fra",
    "har",
    "hvis",
    "ikke",
    "med",
    "men",
    "nar",
    "når",
    "og",
    "om",
    "over",
    "pa",
    "på",
    "same",
    "seg",
    "som",
    "that",
    "the",
    "til",
    "uten",
    "ved",
    "vil",
    "with",
    "without",
    "eller",
    "forskjellen",
    "hvorfor",
    "hvordan",
    "hva",
    "med",
    "nar",
    "når",
    "som",
    "the",
    "and",
    "for",
    "til",
    "you"
  ]);

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function fallbackId() {
    return `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function safeId(value) {
    return typeof value === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(value);
  }

  function inferPromptType(card) {
    const text = `${card.front || ""} ${(card.tags || []).join(" ")}`.toLowerCase();
    if (text.includes("diagnose") || text.includes("hva går galt") || text.includes("hva gar galt")) return "Failure mode";
    if (text.includes("design") || text.includes("bygger") || text.includes("nytt system")) return "Transfer";
    if (text.includes("forskjell") || text.includes(" vs ")) return "Contrast";
    if (text.includes("hva skjer") || text.includes("god for")) return "Scenario";
    if (text.includes("feil") || text.includes("conflict") || text.includes("drift")) return "Failure mode";
    if (text.includes("tradeoff") || text.includes("prefer")) return "Tradeoff";
    return "Definition";
  }

  function normalizeCard(card, options = {}) {
    const now = options.now ?? Date.now();
    const createId = options.createId || fallbackId;
    const normalized = {
      ...card,
      id: safeId(card.id) ? card.id : createId(),
      concept: card.concept || card.front || "Concept",
      promptType: card.promptType || inferPromptType(card),
      tags: Array.isArray(card.tags) ? card.tags : [],
      source: card.source || "Rune capture",
      stage: typeof card.stage === "number" ? card.stage : 0,
      ease: typeof card.ease === "number" ? card.ease : 2.5,
      reps: typeof card.reps === "number" ? card.reps : 0,
      lapses: typeof card.lapses === "number" ? card.lapses : 0,
      dueAt: typeof card.dueAt === "number" ? card.dueAt : now,
      createdAt: typeof card.createdAt === "number" ? card.createdAt : now,
      lastReviewedAt: card.lastReviewedAt || null,
      lastGrade: card.lastGrade || null,
      needsRewrite: Boolean(card.needsRewrite),
      responseTimes: Array.isArray(card.responseTimes) ? card.responseTimes : [],
      history: Array.isArray(card.history) ? card.history : []
    };
    normalized.difficulty = Number.isFinite(card.difficulty) ? round1(clamp(card.difficulty, 1, 10)) : null;
    normalized.stabilityDays = Number.isFinite(card.stabilityDays)
      ? round3(clamp(card.stabilityDays, MIN_STABILITY_DAYS, MAX_STABILITY_DAYS))
      : null;
    return normalized;
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }

  function dueCards(cards, now = Date.now()) {
    return [...cards]
      .filter((card) => card.dueAt <= now)
      .sort((a, b) => a.dueAt - b.dueAt || a.reps - b.reps);
  }

  function nextCard(cards, now = Date.now()) {
    const due = dueCards(cards, now);
    if (due.length) return due[0];
    return [...cards].sort((a, b) => a.dueAt - b.dueAt)[0] || null;
  }

  function stageLabel(card) {
    if (card.reps === 0) return "ny";
    const next = RETENTION_POLICY.intervals[Math.min(card.stage, RETENTION_POLICY.intervals.length - 1)];
    return `S${card.stage} · ${next.label}`;
  }

  function stabilityMs(card) {
    if (Number.isFinite(card.stabilityDays) && card.stabilityDays > 0) {
      return Math.max(INTERVALS[0].ms, card.stabilityDays * DAY);
    }
    return Math.max(latestReviewIntervalMs(card), INTERVALS[0].ms);
  }

  function storedDifficulty(card) {
    return Number.isFinite(card.difficulty) ? round1(clamp(card.difficulty, 1, 10)) : difficultyScore(card);
  }

  function estimateRetrievability(card, now = Date.now()) {
    const normalized = normalizeCard(card, { now });
    if (normalized.reps === 0 || !normalized.lastReviewedAt) return null;
    const elapsedMs = Math.max(0, now - normalized.lastReviewedAt);
    return clamp(Math.pow(TARGET_RETENTION, elapsedMs / stabilityMs(normalized)), 0.05, 0.99);
  }

  function updateDifficulty(difficulty, grade) {
    const deltas = {
      again: 1.25,
      hard: 0.45,
      good: -0.12,
      easy: -0.45
    };
    return round1(clamp(difficulty + (deltas[grade] ?? 0), 1, 10));
  }

  function stabilityGrowth(grade, difficulty, retrievability) {
    const cleanRecall = retrievability === null ? 0 : clamp((retrievability - TARGET_RETENTION) * 2, -0.35, 0.18);
    const easeRelief = clamp((10 - difficulty) / 9, 0, 1);
    if (grade === "hard") return clamp(0.58 + easeRelief * 0.22 + cleanRecall * 0.2, 0.45, 0.82);
    if (grade === "easy") return clamp(2.15 + easeRelief * 1.25 + cleanRecall, 1.8, 3.45);
    return clamp(1.45 + easeRelief * 0.85 + cleanRecall * 0.55, 1.18, 2.45);
  }

  function boundedAdaptiveIntervalMs({ grade, nextStage, oldStabilityMs, difficulty, retrievability, wasFresh }) {
    const intervals = RETENTION_POLICY.intervals;
    if (grade === "again") return intervals[0].ms;
    if (wasFresh && grade !== "easy") return intervals[0].ms;

    const ladderTarget = intervals[Math.min(nextStage, intervals.length - 1)].ms;
    if (nextStage <= 2 && grade !== "hard") return ladderTarget;

    const adaptive = Math.round(oldStabilityMs * stabilityGrowth(grade, difficulty, retrievability));
    if (grade === "hard") {
      return Math.round(clamp(adaptive, intervals[0].ms, Math.max(intervals[0].ms, ladderTarget * 0.82)));
    }

    const lowerBound = nextStage <= 2 ? ladderTarget : intervals[Math.max(0, nextStage - 1)].ms;
    const upperBound = intervals[Math.min(intervals.length - 1, nextStage + 1)].ms;
    return Math.round(clamp(adaptive, lowerBound, upperBound));
  }

  function scheduleReview(card, grade, options = {}) {
    const now = options.now ?? Date.now();
    const responseMs = options.responseMs ?? 0;
    const scratchpad = (options.scratchpad || "").trim().slice(0, 1000);
    const oldStage = card.stage;
    const wasFresh = card.reps === 0 || card.lastGrade === "again";
    const next = normalizeCard(card, { now });
    const difficultyBefore = storedDifficulty(next);
    const stabilityBeforeMs = stabilityMs(next);
    const retrievabilityBefore = estimateRetrievability(next, now);
    let nextStage = oldStage;
    let intervalMs = RETENTION_POLICY.intervals[0].ms;

    if (grade === "again") {
      nextStage = 0;
      next.ease = Math.max(1.3, next.ease - 0.25);
      next.lapses += 1;
      if (next.lapses >= 2) next.needsRewrite = true;
    }

    if (grade === "hard") {
      nextStage = wasFresh ? 0 : Math.max(0, oldStage);
      next.ease = Math.max(1.3, next.ease - 0.1);
      intervalMs = Math.max(RETENTION_POLICY.intervals[0].ms, Math.round(RETENTION_POLICY.intervals[Math.min(nextStage, RETENTION_POLICY.intervals.length - 1)].ms * 0.65));
    }

    if (grade === "good") {
      nextStage = wasFresh ? 0 : Math.min(oldStage + 1, RETENTION_POLICY.intervals.length - 1);
      next.ease = Math.min(3.2, next.ease + 0.04);
      intervalMs = RETENTION_POLICY.intervals[nextStage].ms;
      if (next.lapses < 2) next.needsRewrite = false;
    }

    if (grade === "easy") {
      nextStage = wasFresh ? 1 : Math.min(oldStage + 2, RETENTION_POLICY.intervals.length - 1);
      next.ease = Math.min(3.4, next.ease + 0.12);
      intervalMs = Math.round(RETENTION_POLICY.intervals[nextStage].ms * 1.15);
      if (next.lapses < 3) next.needsRewrite = false;
    }

    if (grade === "again") {
      intervalMs = RETENTION_POLICY.intervals[0].ms;
    }

    const difficultyAfter = updateDifficulty(difficultyBefore, grade);
    intervalMs = boundedAdaptiveIntervalMs({
      difficulty: difficultyAfter,
      grade,
      nextStage,
      oldStabilityMs: stabilityBeforeMs,
      retrievability: retrievabilityBefore,
      wasFresh
    });

    next.stage = nextStage;
    next.difficulty = difficultyAfter;
    next.stabilityDays = round3(clamp(intervalMs / DAY, MIN_STABILITY_DAYS, MAX_STABILITY_DAYS));
    next.reps += 1;
    next.lastReviewedAt = now;
    next.lastGrade = grade;
    next.dueAt = now + intervalMs;
    next.responseTimes = [...(next.responseTimes || []), responseMs].slice(-20);
    const proofGateSummary = summarizeReviewGate(options.proofGate);
    const expertDrillGateSummary = summarizeReviewGate(options.expertDrillGate, "Expert drill gate");
    const historyEntry = {
      at: now,
      grade,
      oldStage,
      nextStage,
      intervalMs,
      responseMs,
      scratchpad,
      targetRetention: RETENTION_POLICY.targetRetention,
      retrievabilityBefore,
      stabilityBeforeMs,
      stabilityAfterMs: intervalMs,
      difficultyBefore,
      difficultyAfter
    };
    if (proofGateSummary) historyEntry.proofGate = proofGateSummary;
    if (expertDrillGateSummary) historyEntry.expertDrillGate = expertDrillGateSummary;
    next.history = [
      ...(next.history || []),
      historyEntry
    ].slice(-40);

    return {
      card: next,
      difficultyAfter,
      difficultyBefore,
      intervalMs,
      oldStage,
      nextStage,
      retrievabilityBefore,
      stabilityAfterMs: intervalMs,
      stabilityBeforeMs,
      targetRetention: RETENTION_POLICY.targetRetention
    };
  }

  function summarizeReviewGate(gate, fallbackLabel = "Review gate") {
    if (!gate || gate.active === false) return null;
    const checks = Array.isArray(gate.checks)
      ? gate.checks.slice(0, 8).map((check) => ({
          complete: Boolean(check.complete),
          key: String(check.key || check.label || "check").slice(0, 40),
          label: String(check.label || check.key || "Check").slice(0, 80),
          tone: String(check.tone || (check.complete ? "success" : "warning")).slice(0, 20),
          value: String(check.value ?? "").slice(0, 120)
        }))
      : [];
    const missing = Array.isArray(gate.missing)
      ? gate.missing.slice(0, 8).map((item) => String(item).slice(0, 40))
      : checks.filter((check) => !check.complete).map((check) => check.key);

    return {
      checks,
      label: String(gate.label || fallbackLabel).slice(0, 80),
      missing,
      passed: Boolean(gate.passed),
      tone: String(gate.tone || (gate.passed ? "success" : "warning")).slice(0, 20)
    };
  }

  function formatIntervalMs(ms) {
    const exact = INTERVALS.find((interval) => interval.ms === ms);
    if (exact) return exact.label;
    if (ms < 60 * 60 * 1000) return `ca. ${Math.round(ms / (60 * 1000))} min`;
    if (ms < DAY) return `ca. ${Math.round(ms / (60 * 60 * 1000))} timer`;
    return `ca. ${Math.round(ms / DAY)} dager`;
  }

  function learningLadder() {
    return RETENTION_POLICY.intervals.map((interval, index) => ({
      ...interval,
      phase: RETENTION_POLICY.phases[index] || "Maintenance",
      rule: RETENTION_POLICY.ladderRules[index] || "Maintenance review.",
      step: index + 1
    }));
  }

  function reviewOutcome(grade, scheduled) {
    const labels = {
      again: "Glemte",
      hard: "Slet",
      good: "Kan",
      easy: "Lett"
    };
    const tones = {
      again: "danger",
      hard: "warning",
      good: "success",
      easy: "success"
    };
    const intervalLabel = formatIntervalMs(scheduled.intervalMs);
    return {
      intervalLabel,
      label: labels[grade] || grade,
      message: `${labels[grade] || grade}: neste recall om ${intervalLabel}`,
      tone: tones[grade] || "default"
    };
  }

  function stemToken(token) {
    if (token.startsWith("retri")) return "retry";
    if (token.endsWith("ies") && token.length > 5) return `${token.slice(0, -3)}y`;
    if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3);
    if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2);
    if (token.endsWith("es") && token.length > 5) return token.slice(0, -2);
    if (token.endsWith("s") && token.length > 4) return token.slice(0, -1);
    return token;
  }

  function textTokens(value) {
    const raw = String(value || "")
      .toLowerCase()
      .replaceAll("/", " ")
      .replaceAll("-", " ")
      .match(/[a-zæøå0-9]{3,}/g) || [];
    return [...new Set(raw.map(stemToken).filter((token) => !TOKEN_STOPWORDS.has(token)))];
  }

  function answerCoverage(card, scratchpad = "") {
    const normalized = normalizeCard(card || {});
    const scratchTokens = new Set(textTokens(scratchpad));
    const expectedTokens = textTokens([
      normalized.back,
      normalized.context,
      ...(normalized.tags || [])
    ].join(" "));

    if (!String(scratchpad || "").trim()) {
      return {
        expected: expectedTokens,
        matched: [],
        missing: expectedTokens.slice(0, 5),
        score: 0,
        label: "0%",
        tone: "danger"
      };
    }

    if (!expectedTokens.length) {
      return {
        expected: [],
        matched: [],
        missing: [],
        score: null,
        label: "n/a",
        tone: "neutral"
      };
    }

    const matched = expectedTokens.filter((token) => scratchTokens.has(token));
    const missing = expectedTokens.filter((token) => !scratchTokens.has(token)).slice(0, 5);
    const score = matched.length / expectedTokens.length;
    let tone = "danger";
    if (score >= 0.45) tone = "success";
    else if (score >= 0.22) tone = "warning";

    return {
      expected: expectedTokens,
      matched,
      missing,
      score,
      label: `${Math.round(score * 100)}%`,
      tone
    };
  }

  function answerDelta(card, scratchpad = "", limit = 5) {
    const coverage = answerCoverage(card, scratchpad);
    const cappedLimit = Math.max(1, Math.min(12, Math.round(Number(limit) || 5)));
    return {
      hasTrace: Boolean(String(scratchpad || "").trim()),
      label: coverage.label,
      matched: coverage.matched.slice(0, cappedLimit),
      missing: coverage.missing.slice(0, cappedLimit),
      score: coverage.score,
      tone: coverage.tone
    };
  }

  function proofGate(input = {}) {
    const card = normalizeCard(input.card || {}, { now: input.now ?? Date.now() });
    const scratchpad = String(input.scratchpad || "").trim();
    const spoken = Boolean(input.spoken);
    const responseMs = Math.max(0, input.responseMs ?? 0);
    const stage = Math.max(0, Math.min(card.stage, RETENTION_POLICY.intervals.length - 1));

    if (stage < RETENTION_POLICY.gates.week.minStage) {
      return {
        active: false,
        checks: [],
        label: "Learning",
        missing: [],
        passed: false,
        recommendation: "Build recall first.",
        tone: "neutral"
      };
    }

    const coverage = answerCoverage(card, scratchpad);
    const gate = stage >= RETENTION_POLICY.gates.month.minStage ? RETENTION_POLICY.gates.month : RETENTION_POLICY.gates.week;
    const transferWords = new Set(RETENTION_POLICY.transferSignals);
    const traceTokens = textTokens(scratchpad);
    const transferHits = traceTokens.filter((token) => transferWords.has(token));
    const traceOk = spoken || scratchpad.length >= gate.traceChars;
    const coverageOk = coverage.score === null ? true : coverage.score >= gate.coverage;
    const transferOk = transferHits.length > 0 || card.promptType === "Transfer";
    const paceOk = !responseMs || responseMs <= gate.maxResponseMs;
    const checks = [
      {
        complete: traceOk,
        key: "trace",
        label: "Recall trace",
        tone: traceOk ? "success" : "danger",
        value: spoken ? "spoken" : `${scratchpad.length} chars`
      },
      {
        complete: coverageOk,
        key: "coverage",
        label: "Answer coverage",
        tone: coverageOk ? "success" : "danger",
        value: coverage.label
      },
      {
        complete: transferOk,
        key: "transfer",
        label: "Transfer signal",
        tone: transferOk ? "success" : "warning",
        value: transferHits[0] || card.promptType
      },
      {
        complete: paceOk,
        key: "pace",
        label: "Pace",
        tone: paceOk ? "success" : "warning",
        value: formatResponse(responseMs)
      }
    ];
    const missing = checks.filter((check) => !check.complete).map((check) => check.key);
    const passed = missing.length === 0;
    const label = gate.label;
    const recommendation = passed
      ? "Lett er lov hvis recallen føltes ren."
      : missing.includes("coverage")
        ? "Ikke trykk Lett. Bruk Slet eller Kan og reparer manglene."
        : "Bruk Kan til proof-checkene sitter rent.";
    let tone = "success";
    if (!passed) tone = missing.includes("coverage") || missing.includes("trace") ? "danger" : "warning";

    return {
      active: true,
      checks,
      label,
      missing,
      passed,
      recommendation,
      tone
    };
  }

  function expertDrillGate(input = {}) {
    const drill = input.drill || null;
    const scratchpad = String(input.scratchpad || "").trim();
    const spoken = Boolean(input.spoken);

    if (!drill) {
      return {
        active: false,
        checks: [],
        label: "Expert drill gate",
        missing: [],
        passed: false,
        recommendation: "No active expert drill.",
        tone: "neutral"
      };
    }

    const tokens = new Set(textTokens(scratchpad));
    const categories = [
      {
        key: "failure",
        label: "Failure mode",
        terms: ["break", "bug", "conflict", "drift", "duplicate", "fail", "failure", "feil", "leak", "outage", "risk", "stale"]
      },
      {
        key: "gate",
        label: "Gate",
        terms: ["block", "check", "eval", "gate", "guard", "policy", "review", "score", "stop", "test", "threshold", "validation"]
      },
      {
        key: "tradeoff",
        label: "Tradeoff",
        terms: ["choose", "complexity", "consistency", "cost", "latency", "risk", "speed", "tradeoff", "velg", "vs"]
      },
      {
        key: "decision",
        label: "Decision",
        terms: ["action", "decide", "decision", "next", "owner", "prioritize", "ship", "tiltak", "velg"]
      },
      {
        key: "writeback",
        label: "Writeback",
        terms: ["commit", "docs", "log", "notion", "record", "repo", "source", "status", "sync", "update", "writeback"]
      }
    ];

    const checks = categories.map((category) => {
      const hit = category.terms.find((term) => tokens.has(term));
      const complete = Boolean(hit);
      return {
        complete,
        key: category.key,
        label: category.label,
        tone: complete ? "success" : "danger",
        value: hit || (spoken ? "spoken only" : "missing")
      };
    });
    const missing = checks.filter((check) => !check.complete).map((check) => check.key);
    const passed = missing.length === 0;
    const traceOk = spoken || scratchpad.length >= 24;
    let tone = passed && traceOk ? "success" : "warning";
    if (!traceOk || missing.length >= 3) tone = "danger";

    return {
      active: true,
      checks,
      label: "Expert drill gate",
      missing,
      passed: passed && traceOk,
      recommendation: passed && traceOk
        ? "Expert drill sitter. Lett er lov hvis base recall også var ren."
        : "Hold igjen på Lett til drillen har failure, gate, tradeoff, decision og writeback.",
      tone
    };
  }

  function gradeCoach(input = {}) {
    const card = normalizeCard(input.card || {}, { now: input.now ?? Date.now() });
    const responseMs = Math.max(0, input.responseMs ?? 0);
    const scratchpad = String(input.scratchpad || "").trim();
    const spoken = Boolean(input.spoken);
    const coverage = answerCoverage(card, scratchpad);
    let grade = "good";
    let confidence = "medium";

    if (!spoken && scratchpad.length < 4) {
      grade = "again";
      confidence = "high";
    } else if (!spoken && coverage.score !== null && coverage.score < 0.22) {
      grade = "hard";
      confidence = "high";
    } else if (card.needsRewrite || responseMs > 45000 || scratchpad.length < 10) {
      grade = "hard";
      confidence = card.needsRewrite || responseMs > 60000 ? "high" : "medium";
    } else if (responseMs <= 9000 && scratchpad.length >= 22 && !card.needsRewrite && coverage.score !== null && coverage.score >= 0.45) {
      grade = "easy";
      confidence = "medium";
    }

    const labels = {
      again: "Glemte",
      hard: "Slet",
      good: "Kan",
      easy: "Lett"
    };
    const tones = {
      again: "danger",
      hard: "warning",
      good: "success",
      easy: "success"
    };

    return {
      confidence,
      grade,
      label: labels[grade],
      signals: [
        {
          label: "Trace",
          value: spoken ? "spoken" : `${scratchpad.length} chars`,
          tone: spoken || scratchpad.length >= 10 ? "success" : "warning"
        },
        {
          label: "Time",
          value: formatResponse(responseMs),
          tone: responseMs <= 12000 ? "success" : responseMs <= 45000 ? "warning" : "danger"
        },
        {
          label: "Coverage",
          value: spoken && !scratchpad ? "spoken" : coverage.label,
          tone: spoken && !scratchpad ? "neutral" : coverage.tone
        },
        {
          label: "Prompt",
          value: card.needsRewrite ? "rewrite" : "clean",
          tone: card.needsRewrite ? "danger" : "success"
        }
      ],
      tone: tones[grade]
    };
  }

  function deckScore(cards) {
    if (!cards.length) return 0;
    return cards.reduce((sum, card) => sum + Math.min(card.stage, INTERVALS.length - 1), 0) / (cards.length * (INTERVALS.length - 1));
  }

  function recentReviews(cards, now = Date.now(), days = 7) {
    const since = now - days * DAY;
    return cards.flatMap((card) =>
      (card.history || [])
        .filter((entry) => entry.at >= since && entry.grade !== "rewrite")
        .map((entry) => ({ ...entry, deck: card.deck }))
    );
  }

  function averageResponseMs(cards) {
    const responses = cards.flatMap((card) => card.responseTimes || []).filter((value) => Number.isFinite(value));
    if (!responses.length) return null;
    return Math.round(responses.reduce((sum, value) => sum + value, 0) / responses.length);
  }

  function average(values) {
    const finite = values.filter((value) => Number.isFinite(value));
    if (!finite.length) return null;
    return finite.reduce((sum, value) => sum + value, 0) / finite.length;
  }

  function sessionSummary(events = []) {
    const reviews = events.filter((event) => event && event.grade);
    const reps = reviews.length;
    const passed = reviews.filter((event) => PASSING_GRADES.has(event.grade)).length;
    const avgCoverage = average(reviews.map((event) => event.coverageScore));
    const avgResponseMs = average(reviews.map((event) => event.responseMs));
    const avgStabilityGain = average(
      reviews
        .filter((event) => Number.isFinite(event.stabilityBeforeMs) && event.stabilityBeforeMs > 0)
        .map((event) => event.stabilityAfterMs / event.stabilityBeforeMs)
    );
    const gradeCounts = reviews.reduce((counts, event) => {
      counts[event.grade] = (counts[event.grade] || 0) + 1;
      return counts;
    }, {});
    const accuracy = reps ? passed / reps : null;
    let tone = "neutral";

    if (reps && accuracy >= 0.8 && (avgCoverage === null || avgCoverage >= 0.42)) tone = "success";
    else if (reps && (accuracy < 0.55 || (avgCoverage !== null && avgCoverage < 0.22))) tone = "danger";
    else if (reps) tone = "warning";

    return {
      accuracy,
      avgCoverage,
      avgResponseMs: avgResponseMs === null ? null : Math.round(avgResponseMs),
      avgStabilityGain,
      gradeCounts,
      passed,
      reps,
      tone
    };
  }

  function sessionImpact(events = []) {
    const reviews = events.filter((event) => event && event.grade);
    const reps = reviews.length;
    const promotions = reviews.filter((event) => Number.isFinite(event.oldStage) && Number.isFinite(event.nextStage) && event.nextStage > event.oldStage).length;
    const monthUnlocks = reviews.filter((event) => Number.isFinite(event.oldStage) && Number.isFinite(event.nextStage) && event.oldStage < 6 && event.nextStage >= 6).length;
    const avgStabilityGain = average(
      reviews
        .filter((event) => Number.isFinite(event.stabilityBeforeMs) && event.stabilityBeforeMs > 0 && Number.isFinite(event.stabilityAfterMs))
        .map((event) => event.stabilityAfterMs / event.stabilityBeforeMs)
    );
    const deckCounts = reviews.reduce((counts, event) => {
      if (event.deck) counts[event.deck] = (counts[event.deck] || 0) + 1;
      return counts;
    }, {});
    const topDeck = Object.entries(deckCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
    const topTrack = TOP5_TRACKS.find((track) => track.deck === topDeck) || null;
    let tone = "neutral";

    if (reps && (monthUnlocks || promotions >= 2 || (avgStabilityGain !== null && avgStabilityGain >= 2))) tone = "success";
    else if (reps) tone = "warning";

    return {
      avgStabilityGain,
      deckCounts,
      monthUnlocks,
      promotions,
      reps,
      tone,
      topDeck,
      topTrack
    };
  }

  function buildBlindspotRadar(events = [], cards = [], options = {}) {
    const limit = Math.max(1, Math.round(options.limit || 3));
    const cardsById = new Map(cards.map((card) => [card.id, normalizeCard(card)]));
    const blindspots = new Map();

    events
      .filter((event) => event && event.grade && event.grade !== "rewrite")
      .forEach((event) => {
        const card = cardsById.get(event.cardId) || null;
        const id = event.cardId || `${event.deck || "unknown"}:${event.promptType || "card"}`;
        const existing = blindspots.get(id) || {
          action: "review",
          cardId: event.cardId || null,
          deck: card?.deck || event.deck || "Unknown",
          hits: 0,
          id,
          missing: [],
          promptType: card?.promptType || event.promptType || "Card",
          reasons: [],
          score: 0,
          title: card?.front || event.front || "Unknown card",
          tone: "warning"
        };

        const addReason = (label, points) => {
          existing.score += points;
          if (!existing.reasons.includes(label)) existing.reasons.push(label);
        };

        existing.hits += 1;

        if (event.grade === "again") addReason("missed recall", 4);
        if (event.grade === "hard") addReason("effortful", 1.5);
        if (Number.isFinite(event.coverageScore)) {
          if (event.coverageScore < 0.22) addReason("low coverage", 3);
          else if (event.coverageScore < 0.45) addReason("thin coverage", 1.5);
        }
        if (Number.isFinite(event.responseMs)) {
          if (event.responseMs > 45_000) addReason("slow recall", 2);
          else if (event.responseMs > 22_000) addReason("slow-ish", 1);
        }
        if (Number.isFinite(event.oldStage) && Number.isFinite(event.nextStage) && event.nextStage < event.oldStage) {
          addReason("stage drop", 2);
        }
        if (card?.needsRewrite) addReason("rewrite debt", 2);

        const missing = Array.isArray(event.coverageMissing) ? event.coverageMissing : [];
        existing.missing = [...new Set([...existing.missing, ...missing])].slice(0, 5);
        existing.action = existing.score >= 5 || card?.needsRewrite ? "rewrite" : "review";
        existing.tone = existing.action === "rewrite" ? "danger" : "warning";
        blindspots.set(id, existing);
      });

    return [...blindspots.values()]
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.hits - a.hits || a.deck.localeCompare(b.deck) || a.title.localeCompare(b.title))
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        label: item.action === "rewrite" ? "Rewrite" : "Review",
        rank: index + 1,
        score: Math.round(item.score * 10) / 10
      }));
  }

  function dayKey(timestamp = Date.now()) {
    const date = new Date(Number.isFinite(timestamp) ? timestamp : Date.now());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shiftDayKey(key, offsetDays) {
    const [year, month, day] = String(key).split("-").map(Number);
    const date = new Date(year, month - 1, day + offsetDays);
    return dayKey(date.getTime());
  }

  function safeCount(value) {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }

  function safeTotal(value) {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function normalizeCountMap(map = {}) {
    if (!map || typeof map !== "object" || Array.isArray(map)) return {};
    return Object.entries(map).reduce((counts, [key, value]) => {
      const count = safeCount(value);
      if (key && count) counts[key] = count;
      return counts;
    }, {});
  }

  function normalizeDailyEntry(entry = {}, date = dayKey()) {
    return {
      coverageCount: safeCount(entry.coverageCount),
      coverageTotal: safeTotal(entry.coverageTotal),
      date,
      decks: normalizeCountMap(entry.decks),
      gradeCounts: normalizeCountMap(entry.gradeCounts),
      passed: safeCount(entry.passed),
      promptTypes: normalizeCountMap(entry.promptTypes),
      reps: safeCount(entry.reps),
      responseCount: safeCount(entry.responseCount),
      responseTotalMs: safeTotal(entry.responseTotalMs),
      stabilityGainCount: safeCount(entry.stabilityGainCount),
      stabilityGainTotal: safeTotal(entry.stabilityGainTotal),
      updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : null
    };
  }

  function recordDailyReview(ledger = {}, event = {}, now = Date.now()) {
    if (!event || !event.grade || event.grade === "rewrite") return { ...(ledger || {}) };

    const timestamp = Number.isFinite(event.at) ? event.at : now;
    const key = dayKey(timestamp);
    const nextLedger = { ...(ledger || {}) };
    const entry = normalizeDailyEntry(nextLedger[key], key);
    entry.reps += 1;
    if (PASSING_GRADES.has(event.grade)) entry.passed += 1;
    entry.gradeCounts[event.grade] = (entry.gradeCounts[event.grade] || 0) + 1;

    if (event.deck) entry.decks[event.deck] = (entry.decks[event.deck] || 0) + 1;
    if (event.promptType) entry.promptTypes[event.promptType] = (entry.promptTypes[event.promptType] || 0) + 1;

    if (Number.isFinite(event.coverageScore)) {
      entry.coverageTotal += clamp(event.coverageScore);
      entry.coverageCount += 1;
    }

    if (Number.isFinite(event.responseMs) && event.responseMs >= 0) {
      entry.responseTotalMs += event.responseMs;
      entry.responseCount += 1;
    }

    if (Number.isFinite(event.stabilityBeforeMs) && event.stabilityBeforeMs > 0 && Number.isFinite(event.stabilityAfterMs)) {
      entry.stabilityGainTotal += event.stabilityAfterMs / event.stabilityBeforeMs;
      entry.stabilityGainCount += 1;
    }

    entry.updatedAt = now;
    nextLedger[key] = entry;
    return nextLedger;
  }

  function summarizeDailyEntry(entry = {}, date = dayKey()) {
    const normalized = normalizeDailyEntry(entry, date);
    const topDeck = Object.entries(normalized.decks).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;

    return {
      ...normalized,
      accuracy: normalized.reps ? normalized.passed / normalized.reps : null,
      avgCoverage: normalized.coverageCount ? normalized.coverageTotal / normalized.coverageCount : null,
      avgResponseMs: normalized.responseCount ? Math.round(normalized.responseTotalMs / normalized.responseCount) : null,
      avgStabilityGain: normalized.stabilityGainCount ? normalized.stabilityGainTotal / normalized.stabilityGainCount : null,
      topDeck
    };
  }

  function dailyLedgerSummary(ledger = {}, now = Date.now(), days = 7) {
    const safeDays = Math.max(1, Math.round(days || 7));
    const todayKey = dayKey(now);
    const keys = Array.from({ length: safeDays }, (_, index) => shiftDayKey(todayKey, index - safeDays + 1));
    const entries = keys.map((key) => summarizeDailyEntry(ledger?.[key], key));
    const totals = entries.reduce(
      (memo, entry) => {
        memo.reps += entry.reps;
        memo.passed += entry.passed;
        memo.coverageTotal += entry.coverageTotal;
        memo.coverageCount += entry.coverageCount;
        memo.responseTotalMs += entry.responseTotalMs;
        memo.responseCount += entry.responseCount;
        memo.stabilityGainTotal += entry.stabilityGainTotal;
        memo.stabilityGainCount += entry.stabilityGainCount;
        Object.entries(entry.gradeCounts).forEach(([grade, count]) => {
          memo.gradeCounts[grade] = (memo.gradeCounts[grade] || 0) + count;
        });
        return memo;
      },
      {
        coverageCount: 0,
        coverageTotal: 0,
        gradeCounts: {},
        passed: 0,
        reps: 0,
        responseCount: 0,
        responseTotalMs: 0,
        stabilityGainCount: 0,
        stabilityGainTotal: 0
      }
    );

    let streak = 0;
    let cursor = todayKey;
    while (summarizeDailyEntry(ledger?.[cursor], cursor).reps > 0) {
      streak += 1;
      cursor = shiftDayKey(cursor, -1);
    }

    return {
      ...totals,
      accuracy: totals.reps ? totals.passed / totals.reps : null,
      activeDays: entries.filter((entry) => entry.reps > 0).length,
      avgCoverage: totals.coverageCount ? totals.coverageTotal / totals.coverageCount : null,
      avgResponseMs: totals.responseCount ? Math.round(totals.responseTotalMs / totals.responseCount) : null,
      avgStabilityGain: totals.stabilityGainCount ? totals.stabilityGainTotal / totals.stabilityGainCount : null,
      days: safeDays,
      entries,
      streak,
      today: entries[entries.length - 1]
    };
  }

  function buildMomentumCoach(ledger = {}, now = Date.now(), options = {}) {
    const days = Math.max(1, Math.round(options.days || 7));
    const targetReps = Math.max(1, Math.round(options.targetReps || 8));
    const summary = dailyLedgerSummary(ledger, now, days);
    const metDays = summary.entries.filter((entry) => entry.reps >= targetReps).length;
    const deckCounts = summary.entries.reduce((counts, entry) => {
      Object.entries(entry.decks || {}).forEach(([deck, count]) => {
        counts[deck] = (counts[deck] || 0) + count;
      });
      return counts;
    }, {});
    const topDeck = Object.entries(deckCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
    const activeRatio = summary.activeDays / days;
    const repRatio = clamp(summary.reps / (days * targetReps));
    const accuracyScore = summary.accuracy === null ? 0 : summary.accuracy;
    const coverageScore = summary.avgCoverage === null ? 0 : summary.avgCoverage;
    const score = clamp(activeRatio * 0.34 + repRatio * 0.3 + accuracyScore * 0.2 + coverageScore * 0.16);
    const todayRemaining = Math.max(0, targetReps - summary.today.reps);
    let nextAction = todayRemaining ? `${todayRemaining} reps to lock today` : "Protect tomorrow";
    let tone = summary.reps ? "warning" : "neutral";

    if (summary.reps && summary.accuracy !== null && summary.accuracy < 0.58) nextAction = "Repair misses before volume";
    else if (summary.reps && summary.avgCoverage !== null && summary.avgCoverage < 0.28) nextAction = "Raise answer coverage";
    else if (!todayRemaining && summary.streak >= 3 && score >= 0.72) nextAction = "Advance month proof";

    if (summary.reps && score >= 0.72 && summary.streak >= 3) tone = "success";
    else if (summary.reps && (score < 0.34 || summary.streak === 0)) tone = "danger";

    return {
      activeDays: summary.activeDays,
      days,
      entries: summary.entries.map((entry) => ({
        accuracy: entry.accuracy,
        avgCoverage: entry.avgCoverage,
        date: entry.date,
        metTarget: entry.reps >= targetReps,
        reps: entry.reps,
        tone: entry.reps >= targetReps ? "success" : entry.reps > 0 ? "warning" : "neutral"
      })),
      metDays,
      nextAction,
      score,
      streak: summary.streak,
      targetReps,
      todayRemaining,
      tone,
      topDeck,
      totalReps: summary.reps
    };
  }

  function formatResponse(ms) {
    if (ms === null) return "new";
    if (ms < 1000) return "<1s";
    if (ms < 60 * 1000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / (60 * 1000))}m`;
  }

  function latestReviewIntervalMs(card) {
    const history = Array.isArray(card.history) ? [...card.history].reverse() : [];
    const latest = history.find((entry) => entry && entry.grade !== "rewrite" && Number.isFinite(entry.intervalMs) && entry.intervalMs > 0);
    if (latest) return latest.intervalMs;
    return INTERVALS[Math.min(card.stage, INTERVALS.length - 1)].ms;
  }

  function difficultyScore(card) {
    if (Number.isFinite(card.difficulty)) return round1(clamp(card.difficulty, 1, 10));
    const reps = Math.max(card.reps, 1);
    const lapseLoad = clamp(card.lapses / reps);
    const easeLoad = clamp((2.5 - card.ease) / 1.2);
    const stageRelief = clamp(card.stage / (INTERVALS.length - 1));
    const rewriteLoad = card.needsRewrite ? 1.5 : 0;
    const raw = 5 + lapseLoad * 3 + easeLoad * 2 + rewriteLoad - stageRelief * 1.2;
    return round1(clamp(raw, 1, 10));
  }

  function difficultyLabel(score, card) {
    if (card.reps === 0) return "New";
    if (card.needsRewrite || score >= 7.5) return "Hard";
    if (score >= 6) return "Loaded";
    if (score <= 4.2) return "Clean";
    return "Normal";
  }

  function memoryState(card, now = Date.now()) {
    const normalized = normalizeCard(card, { now });
    const stableMs = stabilityMs(normalized);
    const difficulty = storedDifficulty(normalized);
    const base = {
      difficulty,
      difficultyLabel: difficultyLabel(difficulty, normalized),
      stabilityMs: stableMs,
      stabilityLabel: formatIntervalMs(stableMs)
    };

    if (normalized.reps === 0 || !normalized.lastReviewedAt) {
      return {
        ...base,
        elapsedMs: 0,
        retrievability: null,
        retrievabilityLabel: "new",
        tone: "neutral"
      };
    }

    const elapsedMs = Math.max(0, now - normalized.lastReviewedAt);
    const retrievability = estimateRetrievability(normalized, now);
    const retrievabilityLabel = `${Math.round(retrievability * 100)}%`;
    let tone = "success";

    if (retrievability < 0.92) tone = "warning";
    if (retrievability < 0.86 || normalized.needsRewrite) tone = "danger";

    return {
      ...base,
      elapsedMs,
      retrievability,
      retrievabilityLabel,
      tone
    };
  }

  function cardHealth(card) {
    if (card.reps === 0) {
      return {
        label: "New",
        score: 50,
        tone: "neutral"
      };
    }

    const stageScore = clamp(card.stage / (INTERVALS.length - 1));
    const reps = Math.max(card.reps, 1);
    const lapsePenalty = clamp(card.lapses / reps);
    const responseMs = averageResponseMs([card]);
    const responseScore = responseMs === null ? 0.5 : clamp(1 - responseMs / 45000);
    const rewritePenalty = card.needsRewrite ? 0.35 : 0;
    const score = Math.round(clamp(stageScore * 0.5 + (1 - lapsePenalty) * 0.25 + responseScore * 0.25 - rewritePenalty) * 100);
    let label = "Watch";
    let tone = "warning";

    if (score >= 72) {
      label = "Stable";
      tone = "success";
    }

    if (score < 40 || card.needsRewrite) {
      label = "Fix";
      tone = "danger";
    }

    return {
      label,
      score,
      tone
    };
  }

  function deckMetrics(cards, now = Date.now()) {
    if (!cards.length) {
      return {
        attempts: 0,
        accuracy: null,
        avgResponseMs: null,
        lapseRate: 0,
        longMemory: 0,
        mastery: 0,
        rewrite: 0,
        stageScore: 0
      };
    }

    const reviews = recentReviews(cards, now);
    const attempts = reviews.length;
    const passed = reviews.filter((entry) => PASSING_GRADES.has(entry.grade)).length;
    const accuracy = attempts ? passed / attempts : null;
    const reps = cards.reduce((sum, card) => sum + card.reps, 0);
    const lapses = cards.reduce((sum, card) => sum + card.lapses, 0);
    const lapseRate = reps ? lapses / reps : 0;
    const rewrite = cards.filter((card) => card.needsRewrite).length;
    const longMemory = cards.filter((card) => card.stage >= 6).length;
    const avgResponseMs = averageResponseMs(cards);
    const stageScore = deckScore(cards);
    const accuracyScore = accuracy ?? stageScore;
    const responseScore = avgResponseMs === null ? 0.5 : clamp(1 - avgResponseMs / 45000);
    const rewritePenalty = cards.length ? rewrite / cards.length : 0;
    const mastery = clamp(stageScore * 0.52 + accuracyScore * 0.28 + (1 - clamp(lapseRate)) * 0.14 + responseScore * 0.06 - rewritePenalty * 0.12);

    return {
      attempts,
      accuracy,
      avgResponseMs,
      lapseRate,
      longMemory,
      mastery,
      rewrite,
      stageScore
    };
  }

  function levelRequirements(level, cards, metrics) {
    const cardCount = cards.length;
    const rewriteRatio = cardCount ? metrics.rewrite / cardCount : 0;
    const requirements = [
      {
        key: "cards",
        label: `Add ${Math.max(0, level.minCards - cardCount)} canon cards`,
        shortLabel: "card base",
        complete: cardCount >= level.minCards,
        current: cardCount,
        target: level.minCards,
        priority: 10
      },
      {
        key: "score",
        label: `Raise mastery to ${Math.round(level.score * 100)}%`,
        shortLabel: "mastery score",
        complete: metrics.mastery >= level.score,
        current: metrics.mastery,
        target: level.score,
        priority: 20
      },
      {
        key: "longMemory",
        label: `Move ${Math.max(0, level.longMemory - metrics.longMemory)} cards to 1m+`,
        shortLabel: "month gate",
        complete: metrics.longMemory >= level.longMemory,
        current: metrics.longMemory,
        target: level.longMemory,
        priority: 30
      },
      {
        key: "rewrite",
        label: `Clear rewrite debt to ${Math.round(level.maxRewriteRatio * 100)}%`,
        shortLabel: "rewrite debt",
        complete: rewriteRatio <= level.maxRewriteRatio,
        current: rewriteRatio,
        target: level.maxRewriteRatio,
        priority: 40
      },
      {
        key: "lapseRate",
        label: `Hold lapse under ${Math.round(level.maxLapseRate * 100)}%`,
        shortLabel: "lapse control",
        complete: metrics.lapseRate <= level.maxLapseRate,
        current: metrics.lapseRate,
        target: level.maxLapseRate,
        priority: 50
      }
    ];

    if (level.accuracy !== null) {
      requirements.push({
        key: "accuracy",
        label: `Lift 7d accuracy to ${Math.round(level.accuracy * 100)}%`,
        shortLabel: "7d accuracy",
        complete: metrics.accuracy !== null && metrics.accuracy >= level.accuracy,
        current: metrics.accuracy,
        target: level.accuracy,
        priority: 25
      });
    }

    if (level.maxAvgResponseMs !== null) {
      requirements.push({
        key: "response",
        label: `Keep answers under ${formatResponse(level.maxAvgResponseMs)}`,
        shortLabel: "answer pace",
        complete: metrics.avgResponseMs !== null && metrics.avgResponseMs <= level.maxAvgResponseMs,
        current: metrics.avgResponseMs,
        target: level.maxAvgResponseMs,
        priority: 60
      });
    }

    return requirements.sort((a, b) => a.priority - b.priority);
  }

  function masteryPath(deck, cards, now = Date.now()) {
    const normalizedCards = cards.map((card) => normalizeCard(card, { now }));
    const metrics = deckMetrics(normalizedCards, now);
    const levels = MASTERY_LEVELS.map((level) => {
      const requirements = levelRequirements(level, normalizedCards, metrics);
      return {
        ...level,
        complete: requirements.every((requirement) => requirement.complete),
        requirements
      };
    });
    const completedLevels = levels.filter((level) => level.complete);
    const currentLevel = completedLevels[completedLevels.length - 1] || levels[0];
    const nextLevel = levels.find((level) => !level.complete) || null;
    const activeRequirements = nextLevel ? nextLevel.requirements : currentLevel.requirements;
    const blockers = activeRequirements.filter((requirement) => !requirement.complete);
    const completedRequirementCount = activeRequirements.length - blockers.length;

    return {
      deck,
      level: {
        key: currentLevel.key,
        label: currentLevel.label,
        target: currentLevel.target
      },
      nextLevel: nextLevel
        ? {
            key: nextLevel.key,
            label: nextLevel.label,
            target: nextLevel.target
          }
        : null,
      blockers,
      completedRequirementCount,
      metrics,
      primaryBlocker: blockers[0] || null,
      progress: activeRequirements.length ? completedRequirementCount / activeRequirements.length : 1,
      requirements: activeRequirements,
      totalRequirementCount: activeRequirements.length
    };
  }

  function top5Readiness(cards, now = Date.now()) {
    return TOP5_TRACKS.map((track) => {
      const deckCards = cards.filter((card) => card.deck === track.deck).map((card) => normalizeCard(card, { now }));
      const path = masteryPath(track.deck, deckCards, now);
      const promptTypes = new Set(deckCards.map((card) => card.promptType));
      const missingPromptTypes = track.requiredPromptTypes.filter((type) => !promptTypes.has(type));
      const promptCoverage = track.requiredPromptTypes.length
        ? (track.requiredPromptTypes.length - missingPromptTypes.length) / track.requiredPromptTypes.length
        : 1;
      const due = deckCards.filter((card) => card.dueAt <= now).length;
      const score = clamp(path.metrics.mastery * 0.52 + path.progress * 0.28 + promptCoverage * 0.2);
      let status = "Capture";

      if (path.level.key === "foundation" && deckCards.length) status = "Base";
      if (path.level.key === "operator") status = "Build";
      if (path.level.key === "architect") status = "Proof";
      if (path.level.key === "expert" && !missingPromptTypes.length) status = "Top 5 loop";

      const nextAction = path.primaryBlocker?.shortLabel || missingPromptTypes[0] || (due ? "review due" : track.drill);

      return {
        ...track,
        cardCount: deckCards.length,
        due,
        missingPromptTypes,
        nextAction,
        path,
        promptCoverage,
        score,
        status
      };
    });
  }

  function normalizeTextKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function compactText(value, maxLength = 92) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
  }

  function trackForDeck(deck) {
    return TOP5_TRACKS.find((track) => track.deck === deck) || null;
  }

  function buildCanonBacklog(cards, options = {}) {
    const now = options.now ?? Date.now();
    const limit = Math.max(1, Math.round(options.limit || 6));
    const existingFronts = new Set(cards.map((card) => normalizeTextKey(card.front)));
    const tracksById = new Map(TOP5_TRACKS.map((track) => [track.id, track]));
    const readiness = top5Readiness(cards, now).sort((a, b) => a.score - b.score || a.deck.localeCompare(b.deck));
    const suggestions = [];
    const seen = new Set();

    const addSuggestion = (trackReadiness, blueprint, reason) => {
      if (!blueprint || suggestions.length >= limit) return;
      const key = normalizeTextKey(blueprint.front);
      if (!key || existingFronts.has(key) || seen.has(key)) return;
      const track = tracksById.get(blueprint.trackId) || trackReadiness;
      suggestions.push({
        id: `${blueprint.trackId}:${blueprint.promptType}`,
        deck: track.deck,
        promptType: blueprint.promptType,
        front: blueprint.front,
        back: blueprint.back,
        context: blueprint.context,
        source: track.source,
        tags: [...new Set([track.id, ...track.signals, ...(blueprint.tags || [])])],
        reason,
        score: trackReadiness.score,
        trackId: track.id,
        trackLabel: track.label
      });
      seen.add(key);
    };

    const targetTypesForTrack = (trackReadiness) => (
      trackReadiness.missingPromptTypes.length
        ? trackReadiness.missingPromptTypes
        : trackReadiness.path.primaryBlocker?.key === "cards"
          ? trackReadiness.requiredPromptTypes
          : [trackReadiness.path.primaryBlocker?.shortLabel].filter(Boolean)
    );

    const addForTrack = (trackReadiness, maxPerTrack = Number.POSITIVE_INFINITY) => {
      const blueprints = CANON_BLUEPRINTS.filter((blueprint) => blueprint.trackId === trackReadiness.id);
      let added = 0;

      targetTypesForTrack(trackReadiness).forEach((type) => {
        if (suggestions.length >= limit || added >= maxPerTrack) return;
        const blueprint = blueprints.find((item) => item.promptType === type) || blueprints.find((item) => !existingFronts.has(normalizeTextKey(item.front)));
        const before = suggestions.length;
        addSuggestion(trackReadiness, blueprint, trackReadiness.missingPromptTypes.includes(type) ? `Missing ${type}` : trackReadiness.nextAction);
        if (suggestions.length > before) added += 1;
      });
    };

    readiness.forEach((trackReadiness) => {
      if (suggestions.length >= limit) return;
      addForTrack(trackReadiness, 1);
    });

    readiness.forEach((trackReadiness) => {
      if (suggestions.length >= limit) return;
      addForTrack(trackReadiness);
    });

    readiness.forEach((trackReadiness) => {
      if (suggestions.length >= limit) return;
      CANON_BLUEPRINTS
        .filter((blueprint) => blueprint.trackId === trackReadiness.id)
        .forEach((blueprint) => addSuggestion(trackReadiness, blueprint, trackReadiness.nextAction));
    });

    return suggestions.slice(0, limit);
  }

  function deckSummaries(cards, now = Date.now()) {
    return [...new Set(cards.map((card) => card.deck))]
      .map((deck) => {
        const deckCards = cards.filter((card) => card.deck === deck);
        const due = deckCards.filter((card) => card.dueAt <= now).length;
        const metrics = deckMetrics(deckCards, now);
        return { deck, cards: deckCards, due, rewrite: metrics.rewrite, score: metrics.mastery, metrics };
      })
      .sort((a, b) => a.score - b.score || b.due - a.due || b.rewrite - a.rewrite);
  }

  function buildDailyDrill(cards, options = {}) {
    const now = options.now ?? Date.now();
    const target = options.target ?? 12;
    const selected = [];
    const seen = new Set();
    const add = (card, reason) => {
      if (!card || seen.has(card.id) || selected.length >= target) return;
      selected.push({ card, reason });
      seen.add(card.id);
    };

    dueCards(cards, now).forEach((card) => add(card, "due"));

    [...cards]
      .filter((card) => card.needsRewrite)
      .sort((a, b) => Number(a.dueAt > now) - Number(b.dueAt > now) || b.lapses - a.lapses || a.dueAt - b.dueAt)
      .forEach((card) => add(card, "rewrite"));

    deckSummaries(cards, now).forEach((summary) => {
      [...summary.cards]
        .sort((a, b) => a.stage - b.stage || b.lapses - a.lapses || a.dueAt - b.dueAt)
        .forEach((card) => add(card, "weak lane"));
    });

    [...cards]
      .sort((a, b) => a.dueAt - b.dueAt || a.stage - b.stage)
      .forEach((card) => add(card, "next"));

    return selected;
  }

  function interleaveDrillItems(items) {
    const reasons = ["due", "rewrite", "weak lane", "next"];
    const arranged = [];
    let previousDeck = "";
    let previousPromptType = "";

    const pickGroup = (group) => {
      const remaining = [...group];
      while (remaining.length) {
        let index = remaining.findIndex(({ card }) => card.deck !== previousDeck && card.promptType !== previousPromptType);
        if (index === -1) index = remaining.findIndex(({ card }) => card.deck !== previousDeck);
        if (index === -1) index = remaining.findIndex(({ card }) => card.promptType !== previousPromptType);
        if (index === -1) index = 0;

        const [item] = remaining.splice(index, 1);
        arranged.push(item);
        previousDeck = item.card.deck;
        previousPromptType = item.card.promptType;
      }
    };

    reasons.forEach((reason) => pickGroup(items.filter((item) => item.reason === reason)));
    pickGroup(items.filter((item) => !reasons.includes(item.reason)));

    return arranged;
  }

  function buildSessionPlan(cards, options = {}) {
    const items = interleaveDrillItems(buildDailyDrill(cards, options));
    const deckSwitches = items.slice(1).filter((item, index) => item.card.deck !== items[index].card.deck).length;
    const promptSwitches = items.slice(1).filter((item, index) => item.card.promptType !== items[index].card.promptType).length;
    const reasons = items.reduce((counts, item) => {
      counts[item.reason] = (counts[item.reason] || 0) + 1;
      return counts;
    }, {});
    const uniqueDecks = new Set(items.map((item) => item.card.deck)).size;
    const uniquePromptTypes = new Set(items.map((item) => item.card.promptType)).size;
    const transitionCount = Math.max(0, items.length - 1);
    const mixScore = transitionCount ? Math.round(((deckSwitches + promptSwitches) / (transitionCount * 2)) * 100) : 0;
    let focus = "Build queue";

    if (reasons.due) focus = "Due first";
    if (reasons.rewrite) focus = "Rewrite debt";
    if (!reasons.due && reasons["weak lane"]) focus = "Weak lane";

    return {
      deckSwitches,
      focus,
      items,
      mixScore,
      promptSwitches,
      reasons,
      uniqueDecks,
      uniquePromptTypes
    };
  }

  function buildProofQueue(cards, options = {}) {
    const now = options.now ?? Date.now();
    const limit = Math.max(1, Math.round(options.limit || 3));
    const normalized = cards.map((card) => normalizeCard(card, { now }));

    return normalized
      .filter((card) => card.stage >= RETENTION_POLICY.gates.week.minStage)
      .map((card) => {
        const memory = memoryState(card, now);
        const due = card.dueAt <= now;
        const gate = card.stage >= RETENTION_POLICY.gates.month.minStage ? RETENTION_POLICY.gates.month : RETENTION_POLICY.gates.week;
        const monthGate = gate.key === "month";
        const retrievability = memory.retrievability;
        let tone = "neutral";
        if (due || memory.tone === "danger" || card.needsRewrite) tone = "danger";
        else if (memory.tone === "warning" || !monthGate) tone = "warning";
        else if (monthGate) tone = "success";

        return {
          cardId: card.id,
          deck: card.deck,
          due,
          dueAt: card.dueAt,
          dueLabel: due ? "due now" : relativeTime(card.dueAt, now),
          gateLabel: gate.label,
          rank: 0,
          requirements: gate.queueRequirements,
          retrievability,
          retrievabilityLabel: retrievability === null ? "new" : `${Math.round(retrievability * 100)}% R`,
          stabilityLabel: memory.stabilityLabel,
          stage: card.stage,
          stageLabel: stageLabel(card),
          title: card.front,
          tone
        };
      })
      .sort((a, b) => (
        Number(b.due) - Number(a.due)
        || (a.retrievability ?? 1) - (b.retrievability ?? 1)
        || b.stage - a.stage
        || a.dueAt - b.dueAt
        || a.title.localeCompare(b.title)
      ))
      .slice(0, limit)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  function buildNextMoves(cards, options = {}) {
    const now = options.now ?? Date.now();
    const limit = Math.max(1, Math.round(options.limit || 4));
    const normalized = cards.map((card) => normalizeCard(card, { now }));
    const moves = [];
    const usedCards = new Set();

    const addMove = (move) => {
      if (!move) return;
      const cardKey = move.cardId ? `card:${move.cardId}` : "";
      if (cardKey && usedCards.has(cardKey)) return;
      if (moves.some((item) => item.id === move.id)) return;
      moves.push(move);
      if (cardKey) usedCards.add(cardKey);
    };

    const formatCardReason = (reason, card) => `${reason} · ${stageLabel(card)}`;
    const plan = buildSessionPlan(normalized, { now, target: Math.max(8, limit * 2) });
    const dueItem = plan.items.find(({ card }) => card.dueAt <= now);

    if (dueItem) {
      addMove({
        action: "review",
        cardId: dueItem.card.id,
        deck: dueItem.card.deck,
        id: `review:${dueItem.card.id}`,
        label: "Review due",
        priority: 10,
        reason: formatCardReason(dueItem.reason, dueItem.card),
        title: dueItem.card.front,
        tone: "danger"
      });
    }

    const rewriteCard = [...normalized]
      .filter((card) => card.needsRewrite)
      .sort((a, b) => b.lapses - a.lapses || a.dueAt - b.dueAt || a.front.localeCompare(b.front))[0];

    if (rewriteCard) {
      addMove({
        action: "rewrite",
        cardId: rewriteCard.id,
        deck: rewriteCard.deck,
        id: `rewrite:${rewriteCard.id}`,
        label: "Rewrite prompt",
        priority: 20,
        reason: formatCardReason(`${rewriteCard.lapses} lapses`, rewriteCard),
        title: rewriteCard.front,
        tone: "warning"
      });
    }

    const capture = buildCanonBacklog(normalized, { now, limit: 1 })[0];
    if (capture) {
      addMove({
        action: "capture",
        deck: capture.deck,
        id: `capture:${capture.id}`,
        label: "Capture gap",
        priority: 30,
        reason: capture.reason,
        suggestionId: capture.id,
        title: capture.front,
        tone: "neutral",
        trackId: capture.trackId,
        trackLabel: capture.trackLabel
      });
    }

    const monthCard = [...normalized]
      .filter((card) => card.stage >= 4 && card.stage < 6)
      .sort((a, b) => b.stage - a.stage || a.dueAt - b.dueAt || a.front.localeCompare(b.front))[0];

    if (monthCard) {
      const nextGate = INTERVALS[Math.min(monthCard.stage + 1, INTERVALS.length - 1)]?.label || "month";
      addMove({
        action: "review",
        cardId: monthCard.id,
        deck: monthCard.deck,
        id: `month:${monthCard.id}`,
        label: "Month proof",
        priority: 40,
        reason: `next gate ${nextGate}`,
        title: monthCard.front,
        tone: "success"
      });
    }

    const weakest = deckSummaries(normalized, now)[0];
    const weakCard = weakest
      ? [...weakest.cards].sort((a, b) => a.stage - b.stage || b.lapses - a.lapses || a.dueAt - b.dueAt)[0]
      : null;

    if (weakCard) {
      addMove({
        action: "review",
        cardId: weakCard.id,
        deck: weakCard.deck,
        id: `weak:${weakCard.id}`,
        label: "Weak lane",
        priority: 50,
        reason: `${Math.round(weakest.score * 100)}% mastery · ${stageLabel(weakCard)}`,
        title: weakCard.front,
        tone: "neutral"
      });
    }

    if (!moves.length && normalized.length) {
      const card = nextCard(normalized, now);
      addMove({
        action: "review",
        cardId: card.id,
        deck: card.deck,
        id: `practice:${card.id}`,
        label: "Practice next",
        priority: 60,
        reason: formatCardReason(relativeTime(card.dueAt, now), card),
        title: card.front,
        tone: "neutral"
      });
    }

    return moves
      .sort((a, b) => a.priority - b.priority || a.deck.localeCompare(b.deck) || a.title.localeCompare(b.title))
      .slice(0, limit)
      .map((move, index) => ({ ...move, rank: index + 1 }));
  }

  function cardSignalTokens(card) {
    const raw = [
      card.deck,
      card.promptType,
      card.concept,
      card.front,
      card.context,
      ...(card.tags || [])
    ]
      .join(" ")
      .toLowerCase()
      .replaceAll("/", " ")
      .replaceAll("-", " ")
      .match(/[a-zæøå0-9]{3,}/g) || [];

    return new Set(raw.filter((token) => !TOKEN_STOPWORDS.has(token)));
  }

  function buildContrastPairs(cards, options = {}) {
    const now = options.now ?? Date.now();
    const target = options.target ?? 3;
    const normalized = cards.map((card) => normalizeCard(card, { now }));
    const pairs = [];

    for (let index = 0; index < normalized.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < normalized.length; otherIndex += 1) {
        const first = normalized[index];
        const second = normalized[otherIndex];
        const firstTokens = cardSignalTokens(first);
        const secondTokens = cardSignalTokens(second);
        const commonTokens = [...firstTokens].filter((token) => secondTokens.has(token));
        const sharedTags = (first.tags || []).filter((tag) => (second.tags || []).includes(tag));
        const weakSignal = Number(first.needsRewrite) + Number(second.needsRewrite) + clamp(first.lapses / Math.max(first.reps, 1)) + clamp(second.lapses / Math.max(second.reps, 1));
        const dueSignal = Number(first.dueAt <= now) + Number(second.dueAt <= now);
        const crossDeck = first.deck !== second.deck ? 1 : 0;
        const promptSwitch = first.promptType !== second.promptType ? 1 : 0;
        const score = sharedTags.length * 5 + commonTokens.length * 1.4 + crossDeck * 2 + promptSwitch + weakSignal * 2 + dueSignal;

        if (score < 4) continue;

        pairs.push({
          cards: [first, second],
          decks: [...new Set([first.deck, second.deck])],
          promptTypes: [...new Set([first.promptType, second.promptType])],
          score: Math.round(score * 10) / 10,
          signal: sharedTags[0] || commonTokens[0] || "contrast"
        });
      }
    }

    const used = new Set();
    return pairs
      .sort((a, b) => b.score - a.score || a.signal.localeCompare(b.signal))
      .filter((pair) => {
        if (used.has(pair.cards[0].id) || used.has(pair.cards[1].id)) return false;
        used.add(pair.cards[0].id);
        used.add(pair.cards[1].id);
        return true;
      })
      .slice(0, target);
  }

  function buildTransferMissions(cards, options = {}) {
    const now = options.now ?? Date.now();
    const target = Math.max(1, Math.round(options.target || 2));
    const normalized = cards.map((card) => normalizeCard(card, { now }));
    const pairPool = buildContrastPairs(normalized, { now, target: Math.max(target * 4, 8) })
      .sort((a, b) => Number(b.cards[0].deck !== b.cards[1].deck) - Number(a.cards[0].deck !== a.cards[1].deck) || b.score - a.score);
    const missions = [];
    const usedCards = new Set();

    const addPair = (pair) => {
      if (!pair || missions.length >= target) return;
      const [first, second] = pair.cards;
      if (!first || !second || usedCards.has(first.id) || usedCards.has(second.id)) return;

      const firstTrack = trackForDeck(first.deck);
      const secondTrack = trackForDeck(second.deck);
      const title = `${firstTrack?.label || first.deck} x ${secondTrack?.label || second.deck}`;
      const primary = [first, second].sort((a, b) => Number(b.dueAt <= now) - Number(a.dueAt <= now) || a.stage - b.stage || b.lapses - a.lapses)[0];
      const tone = first.needsRewrite || second.needsRewrite ? "warning" : first.dueAt <= now || second.dueAt <= now ? "danger" : "neutral";

      missions.push({
        cardIds: [first.id, second.id],
        checks: ["Boundary", "Failure mode", "Gate", "Next action"],
        decks: [first.deck, second.deck],
        id: `transfer:${first.id}:${second.id}`,
        primaryCardId: primary.id,
        prompt: `Koble ${compactText(first.front, 70)} med ${compactText(second.front, 70)}. Hva er failure mode, gate og next action?`,
        reason: pair.signal,
        score: pair.score,
        title,
        tone,
        trackLabels: [firstTrack?.label || first.deck, secondTrack?.label || second.deck]
      });

      usedCards.add(first.id);
      usedCards.add(second.id);
    };

    pairPool.forEach(addPair);

    if (missions.length < target) {
      const summaries = deckSummaries(normalized, now);
      for (let index = 0; index < summaries.length && missions.length < target; index += 1) {
        for (let otherIndex = index + 1; otherIndex < summaries.length && missions.length < target; otherIndex += 1) {
          const first = summaries[index].cards.find((card) => !usedCards.has(card.id));
          const second = summaries[otherIndex].cards.find((card) => !usedCards.has(card.id));
          if (!first || !second) continue;
          addPair({
            cards: [first, second],
            decks: [first.deck, second.deck],
            promptTypes: [first.promptType, second.promptType],
            score: Math.round((1 - summaries[index].score + 1 - summaries[otherIndex].score) * 50) / 10,
            signal: "weak lanes"
          });
        }
      }
    }

    return missions.map((mission, index) => ({ ...mission, rank: index + 1 }));
  }

  function buildExpertDrills(cards, options = {}) {
    const now = options.now ?? Date.now();
    const target = Math.max(1, Math.round(options.target || 3));
    const normalized = cards.map((card) => normalizeCard(card, { now }));
    const suggestions = buildCanonBacklog(normalized, {
      now,
      limit: Math.max(TOP5_TRACKS.length, target * 3)
    });
    const readiness = top5Readiness(normalized, now)
      .sort((a, b) => (
        a.score - b.score
        || b.missingPromptTypes.length - a.missingPromptTypes.length
        || b.due - a.due
        || a.deck.localeCompare(b.deck)
      ));

    const chooseCard = (trackReadiness) => {
      const missing = new Set(trackReadiness.missingPromptTypes);
      return normalized
        .filter((card) => card.deck === trackReadiness.deck)
        .sort((a, b) => (
          Number(b.dueAt <= now) - Number(a.dueAt <= now)
          || Number(b.needsRewrite) - Number(a.needsRewrite)
          || Number(missing.has(b.promptType)) - Number(missing.has(a.promptType))
          || a.stage - b.stage
          || b.lapses - a.lapses
          || a.dueAt - b.dueAt
        ))[0] || null;
    };

    return readiness.slice(0, target).map((trackReadiness, index) => {
      const card = chooseCard(trackReadiness);
      const suggestion = suggestions.find((item) => item.trackId === trackReadiness.id) || null;
      const action = card ? "review" : "capture";
      const sourceSignal = card ? compactText(card.front, 76) : compactText(suggestion?.front || trackReadiness.drill, 76);
      const signalList = trackReadiness.signals.slice(0, 3).join(", ");
      let tone = "neutral";
      if (trackReadiness.score < 0.38 || trackReadiness.due > 0 || card?.needsRewrite) tone = "danger";
      else if (trackReadiness.score < 0.68 || trackReadiness.missingPromptTypes.length) tone = "warning";
      else if (trackReadiness.path.level.key === "expert") tone = "success";

      return {
        action,
        cardId: card?.id || null,
        checks: ["Failure mode", "Gate", "Tradeoff", "Decision", "Writeback"],
        deck: trackReadiness.deck,
        id: `expert:${trackReadiness.id}`,
        prompt: `Scenario: ${sourceSignal}. Bruk ${signalList}. Hva kan feile, hvilken gate stopper det, hva er tradeoffen, og hva er neste handling?`,
        rank: index + 1,
        reason: trackReadiness.nextAction,
        score: trackReadiness.score,
        source: trackReadiness.source,
        status: trackReadiness.status,
        suggestionId: suggestion?.id || null,
        title: trackReadiness.label,
        tone,
        trackId: trackReadiness.id
      };
    });
  }

  function buildMasterySprint(cards, events = [], options = {}) {
    const now = options.now ?? Date.now();
    const normalized = cards.map((card) => normalizeCard(card, { now }));
    const plan = buildSessionPlan(normalized, { now, target: options.targetReps || 12 });
    const moves = buildNextMoves(normalized, { now, limit: 6 });
    const blindspots = buildBlindspotRadar(events, normalized, { limit: 3 });
    const transfers = buildTransferMissions(normalized, { now, target: 2 });
    const backlog = buildCanonBacklog(normalized, { now, limit: 2 });
    const blocks = [];
    const usedIds = new Set();

    const addBlock = (block) => {
      if (!block || usedIds.has(block.id)) return;
      blocks.push(block);
      usedIds.add(block.id);
    };

    const reviewMove = moves.find((move) => move.action === "review" && move.label === "Review due") || moves.find((move) => move.action === "review");
    const reviewCard = reviewMove?.cardId ? normalized.find((card) => card.id === reviewMove.cardId) : plan.items[0]?.card || nextCard(normalized, now);

    if (reviewCard) {
      addBlock({
        action: "review",
        cardId: reviewCard.id,
        deck: reviewCard.deck,
        id: `sprint:review:${reviewCard.id}`,
        label: "Pull",
        minutes: 8,
        reason: reviewMove?.reason || stageLabel(reviewCard),
        title: reviewCard.front,
        tone: reviewCard.dueAt <= now ? "danger" : "neutral"
      });
    }

    const repair = blindspots[0] || moves.find((move) => move.action === "rewrite");
    if (repair?.cardId) {
      addBlock({
        action: repair.action || "review",
        cardId: repair.cardId,
        deck: repair.deck,
        id: `sprint:repair:${repair.cardId}`,
        label: "Repair",
        minutes: 5,
        reason: repair.reasons?.join(" / ") || repair.reason || "rewrite debt",
        title: repair.title,
        tone: repair.tone || "warning"
      });
    }

    const transfer = transfers[0];
    if (transfer?.primaryCardId) {
      addBlock({
        action: "review",
        cardId: transfer.primaryCardId,
        deck: transfer.decks.join(" x "),
        id: `sprint:transfer:${transfer.primaryCardId}`,
        label: "Transfer",
        minutes: 5,
        reason: transfer.reason,
        title: transfer.title,
        tone: transfer.tone
      });
    }

    const capture = backlog[0] || moves.find((move) => move.action === "capture");
    if (capture) {
      addBlock({
        action: "capture",
        deck: capture.deck,
        id: `sprint:capture:${capture.id || capture.suggestionId}`,
        label: "Capture",
        minutes: 2,
        reason: capture.reason || capture.nextAction || "canon gap",
        suggestionId: capture.id || capture.suggestionId,
        title: capture.front || capture.title,
        tone: "neutral"
      });
    }

    let focus = "Maintain loop";
    if (blocks.some((block) => block.label === "Repair")) focus = "Repair blindspots";
    else if (reviewCard?.dueAt <= now) focus = "Clear due queue";
    else if (blocks.some((block) => block.label === "Transfer")) focus = "Transfer judgement";
    else if (blocks.some((block) => block.label === "Capture")) focus = "Grow canon";

    return {
      blocks: blocks.map((block, index) => ({ ...block, rank: index + 1 })),
      focus,
      targetReps: plan.items.length,
      totalMinutes: blocks.reduce((sum, block) => sum + block.minutes, 0)
    };
  }

  function buildRetentionBudget(cards, options = {}) {
    const now = options.now ?? Date.now();
    const normalized = cards.map((card) => normalizeCard(card, { now }));
    const targetMinutes = Math.max(5, Math.round(options.targetMinutes || 20));
    const defaultReviewMs = Math.max(20_000, Math.round(options.defaultReviewMs || 55_000));
    const avgMs = averageResponseMs(normalized);
    const reviewMs = Math.max(25_000, Math.min(95_000, (avgMs || defaultReviewMs) + 10_000));
    const dailyReviewCap = Math.max(1, Math.floor((targetMinutes * 60_000) / reviewMs));
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dueNow = normalized.filter((card) => card.dueAt <= now);
    const dueToday = normalized.filter((card) => card.dueAt <= todayEnd.getTime());
    const proofDue = buildProofQueue(normalized, { now, limit: normalized.length }).filter((item) => item.due);
    const overdueRisk = dueNow.filter((card) => {
      const retrievability = estimateRetrievability(card, now);
      const lateMs = now - card.dueAt;
      return card.needsRewrite || lateMs >= DAY || (retrievability !== null && retrievability < TARGET_RETENTION);
    });
    const rewriteDebt = normalized.filter((card) => card.needsRewrite);
    const loadRatio = dueToday.length / dailyReviewCap;
    const spareReviews = Math.max(0, dailyReviewCap - dueToday.length - rewriteDebt.length);
    let newCardCap = Math.min(5, Math.floor(spareReviews / 2));
    if (loadRatio >= 0.9 || overdueRisk.length || rewriteDebt.length >= 3) newCardCap = 0;
    else if (proofDue.length) newCardCap = Math.min(newCardCap, 2);

    const expectedMinutes = Math.ceil((dueToday.length * reviewMs) / 60_000);
    let tone = "success";
    let status = "Sustainable";
    if (loadRatio >= 1.2 || overdueRisk.length >= 4) {
      tone = "danger";
      status = "Over budget";
    } else if (loadRatio >= 0.75 || overdueRisk.length || proofDue.length >= 3 || rewriteDebt.length) {
      tone = "warning";
      status = "Tight";
    }

    const focusPath = [
      {
        action: "review",
        count: dueNow.length,
        label: "Clear due",
        tone: dueNow.length ? "danger" : "success"
      },
      {
        action: "proof",
        count: proofDue.length,
        label: "Proof gates",
        tone: proofDue.length ? "warning" : "neutral"
      },
      {
        action: "expert",
        count: Math.min(1, buildExpertDrills(normalized, { now, target: 1 }).length),
        label: "1 expert drill",
        tone: "warning"
      },
      {
        action: "capture",
        count: newCardCap,
        label: "New canon cap",
        tone: newCardCap ? "success" : "neutral"
      }
    ];

    const recommendation = tone === "danger"
      ? "Ingen nye kort. Clear due, proof/rewrite, så stopp."
      : tone === "warning"
        ? "Hold nye kort lavt. Kjør due, proof og ett expert drill."
        : "Budsjettet tåler noen nye canon-kort etter review.";

    return {
      avgReviewMs: reviewMs,
      dailyReviewCap,
      dueNow: dueNow.length,
      dueToday: dueToday.length,
      expectedMinutes,
      focusPath,
      loadRatio,
      newCardCap,
      overdueRisk: overdueRisk.length,
      proofDue: proofDue.length,
      recommendation,
      rewriteDebt: rewriteDebt.length,
      status,
      targetMinutes,
      targetRetention: TARGET_RETENTION,
      tone
    };
  }

  function buildWeeklyProofArtifact(cards, options = {}) {
    const now = options.now ?? Date.now();
    const days = Math.max(1, Math.round(options.days || 7));
    const limit = Math.max(1, Math.round(options.limit || 4));
    const since = now - days * DAY;
    const normalized = cards.map((card) => normalizeCard(card, { now }));
    const readiness = top5Readiness(normalized, now);
    const capabilities = {
      "Pull Retention": "forklare og justere retention-loopen uten å jukse med reveal",
      "Git / Merge": "velge ren Git/merge-rute og stoppe WIP-lekkasje",
      "Backend Lingo": "navngi runtime behavior og skille source of truth fra status",
      "System Design": "designe gate/reconciler rundt drift, latency og ownership",
      "AI Expert": "sette LLM eval/tool-calling gates med failure modes",
      RuneOS: "styre handoff, owner og status uten control-plane drift"
    };
    const cardsByDeck = normalized.reduce((map, card) => {
      if (!map.has(card.deck)) map.set(card.deck, []);
      map.get(card.deck).push(card);
      return map;
    }, new Map());

    const events = normalized.flatMap((card) =>
      (card.history || [])
        .filter((entry) => entry && entry.grade && entry.grade !== "rewrite" && Number.isFinite(entry.at) && entry.at >= since)
        .map((entry) => ({ ...entry, card }))
    );
    const passedEvents = events.filter((event) => PASSING_GRADES.has(event.grade));
    const expertPasses = events.filter((event) => event.expertDrillGate?.passed);
    const proofPasses = events.filter((event) => event.proofGate?.passed);
    const transferReps = passedEvents.filter((event) => event.card.promptType === "Transfer" || event.card.promptType === "Scenario");
    const monthUnlocks = passedEvents.filter((event) => Number.isFinite(event.oldStage) && Number.isFinite(event.nextStage) && event.oldStage < 6 && event.nextStage >= 6);
    const deckWeights = new Map();

    passedEvents.forEach((event) => {
      const weight = 1
        + (event.proofGate?.passed ? 2 : 0)
        + (event.expertDrillGate?.passed ? 2 : 0)
        + (event.card.promptType === "Transfer" ? 1.5 : 0)
        + (Number.isFinite(event.oldStage) && Number.isFinite(event.nextStage) && event.oldStage < 6 && event.nextStage >= 6 ? 2 : 0);
      deckWeights.set(event.card.deck, (deckWeights.get(event.card.deck) || 0) + weight);
    });

    const fallbackTrack = readiness.sort((a, b) => a.score - b.score || a.deck.localeCompare(b.deck))[0] || null;
    const topDeck = [...deckWeights.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || fallbackTrack?.deck || null;
    const track = TOP5_TRACKS.find((item) => item.deck === topDeck) || fallbackTrack || null;
    const trackReadiness = readiness.find((item) => item.deck === topDeck) || track || null;
    const deckCards = topDeck ? cardsByDeck.get(topDeck) || [] : [];
    const path = topDeck ? masteryPath(topDeck, deckCards, now) : null;
    const score = clamp(
      passedEvents.length * 0.05
      + proofPasses.length * 0.18
      + expertPasses.length * 0.2
      + transferReps.length * 0.08
      + monthUnlocks.length * 0.18
    );
    let tone = "danger";
    if (score >= 0.55 && (expertPasses.length || proofPasses.length)) tone = "success";
    else if (passedEvents.length || proofPasses.length || expertPasses.length) tone = "warning";

    const evidence = events
      .filter((event) => PASSING_GRADES.has(event.grade) || event.proofGate?.passed || event.expertDrillGate?.passed)
      .map((event) => {
        let type = "Recall";
        if (event.expertDrillGate?.passed) type = "Expert gate";
        else if (event.proofGate?.passed) type = event.proofGate.label || "Proof gate";
        else if (Number.isFinite(event.oldStage) && Number.isFinite(event.nextStage) && event.oldStage < 6 && event.nextStage >= 6) type = "Month unlock";
        else if (event.card.promptType === "Transfer") type = "Transfer";

        return {
          at: event.at,
          deck: event.card.deck,
          grade: event.grade,
          id: `${event.card.id}:${event.at}`,
          stage: event.nextStage,
          title: event.card.front,
          type
        };
      })
      .sort((a, b) => b.at - a.at || a.deck.localeCompare(b.deck))
      .slice(0, limit);
    const nextProof = !expertPasses.length
      ? "Kjør ett Expert Drill med failure, gate, tradeoff og writeback."
      : !proofPasses.length
        ? "Pass en week/month proof uten å låse opp Lett for tidlig."
        : path?.primaryBlocker?.label || trackReadiness?.nextAction || "Skriv en production note fra ukens beste proof.";
    const statement = passedEvents.length
      ? `Denne uka har du bevis på at du kan ${capabilities[topDeck] || track?.role || "bruke systemet i praksis"}.`
      : "Denne uka mangler fortsatt et produksjonsbevis. Start med due review og ett Expert Drill.";

    return {
      counts: {
        expertPasses: expertPasses.length,
        monthUnlocks: monthUnlocks.length,
        passedReviews: passedEvents.length,
        proofPasses: proofPasses.length,
        transferReps: transferReps.length
      },
      days,
      evidence,
      nextProof,
      score,
      statement,
      status: tone === "success" ? "Proof ready" : tone === "warning" ? "Proof forming" : "Proof missing",
      title: track ? `Weekly proof · ${track.label || track.id}` : "Weekly proof",
      tone,
      track: track ? {
        deck: track.deck,
        id: track.id,
        label: track.label
      } : null
    };
  }

  function formatWeeklyProofMarkdown(artifact) {
    const safeArtifact = artifact || {};
    const counts = safeArtifact.counts || {};
    const evidence = Array.isArray(safeArtifact.evidence) ? safeArtifact.evidence : [];
    const lines = [
      `# ${safeArtifact.title || "Weekly proof"}`,
      "",
      `Status: ${safeArtifact.status || "Proof missing"}`,
      `Track: ${safeArtifact.track?.deck || "Top 5"}`,
      `Score: ${Math.round((safeArtifact.score || 0) * 100)}%`,
      "",
      safeArtifact.statement || "No proof statement yet.",
      "",
      "Signals:",
      `- Expert gates: ${counts.expertPasses || 0}`,
      `- Proof gates: ${counts.proofPasses || 0}`,
      `- Transfer/scenario reps: ${counts.transferReps || 0}`,
      `- Month unlocks: ${counts.monthUnlocks || 0}`,
      "",
      "Evidence:"
    ];

    if (evidence.length) {
      evidence.forEach((item) => {
        lines.push(`- ${item.type || "Recall"} · ${item.deck || "Deck"}: ${item.title || "Untitled"}`);
      });
    } else {
      lines.push(`- Next proof: ${safeArtifact.nextProof || "Run due review and one Expert Drill."}`);
    }

    lines.push("", `Next proof: ${safeArtifact.nextProof || "Run due review and one Expert Drill."}`);

    return lines.join("\n");
  }

  function masteryInsights(cards, now = Date.now()) {
    const summaries = deckSummaries(cards, now);
    const reviews = recentReviews(cards, now);
    const due = dueCards(cards, now);
    const rewrite = cards.filter((card) => card.needsRewrite);
    const passed = reviews.filter((entry) => PASSING_GRADES.has(entry.grade)).length;
    const accuracy = reviews.length ? passed / reviews.length : null;
    const weakest = summaries[0] || null;
    const longMemory = cards.filter((card) => card.stage >= 6).length;
    const nextUnlockCard = [...cards]
      .filter((card) => card.stage < 6)
      .sort((a, b) => b.stage - a.stage || a.dueAt - b.dueAt)[0] || null;
    const nextUnlock = nextUnlockCard
      ? {
          deck: nextUnlockCard.deck,
          label: INTERVALS[Math.min(nextUnlockCard.stage + 1, INTERVALS.length - 1)].label,
          cardId: nextUnlockCard.id
        }
      : null;

    return {
      accuracy,
      due: due.length,
      longMemory,
      nextUnlock,
      rewrite: rewrite.length,
      weakestDeck: weakest ? weakest.deck : null,
      weakestMastery: weakest ? weakest.score : 0
    };
  }

  function qualityGateChecks(payload) {
    return [
      {
        label: "Atomic",
        ok: payload.front.length >= 18 && payload.front.length <= 180
      },
      {
        label: "Answer",
        ok: payload.back.length >= 20 && payload.back.length <= 700
      },
      {
        label: "Canon source",
        ok: payload.source.length >= 3
      },
      {
        label: "Context",
        ok: payload.context.length >= 10
      },
      {
        label: "Prompt type",
        ok: Boolean(payload.promptType)
      }
    ];
  }

  function payloadIsReady(payload) {
    return qualityGateChecks(payload).every((check) => check.ok);
  }

  function recallIsReady(input = {}) {
    const scratchpad = String(input.scratchpad || "").trim();
    return Boolean(input.spoken) || scratchpad.length >= 4;
  }

  function relativeTime(timestamp, now = Date.now()) {
    const diff = timestamp - now;
    const abs = Math.abs(diff);
    const suffix = diff <= 0 ? "nå" : "";
    if (diff <= 0) return "due";
    if (abs < 60 * 1000) return suffix || `${Math.ceil(abs / 1000)}s`;
    if (abs < 60 * 60 * 1000) return `${Math.ceil(abs / (60 * 1000))}m`;
    if (abs < DAY) return `${Math.ceil(abs / (60 * 60 * 1000))}t`;
    return `${Math.ceil(abs / DAY)}d`;
  }

  return {
    CURRICULUM,
    CANON_SIGNALS,
    CANON_CARD_TYPES,
    CANON_BLUEPRINTS,
    DAY,
    GRADE_CONTRACT,
    INTERVALS,
    MASTERY_LEVELS,
    METHOD_RULES,
    PASSING_GRADES,
    RETENTION_POLICY,
    TARGET_RETENTION,
    TOP5_TRACKS,
    answerCoverage,
    answerDelta,
    averageResponseMs,
    buildContrastPairs,
    buildCanonBacklog,
    buildDailyDrill,
    buildBlindspotRadar,
    buildExpertDrills,
    buildMasterySprint,
    buildMomentumCoach,
    buildNextMoves,
    buildProofQueue,
    buildRetentionBudget,
    buildSessionPlan,
    buildTransferMissions,
    buildWeeklyProofArtifact,
    formatWeeklyProofMarkdown,
    cardHealth,
    clamp,
    deckMetrics,
    deckScore,
    deckSummaries,
    dueCards,
    estimateRetrievability,
    expertDrillGate,
    dailyLedgerSummary,
    dayKey,
    formatResponse,
    formatIntervalMs,
    gradeCoach,
    inferPromptType,
    learningLadder,
    masteryInsights,
    masteryPath,
    memoryState,
    nextCard,
    normalizeCard,
    payloadIsReady,
    proofGate,
    qualityGateChecks,
    recallIsReady,
    recentReviews,
    recordDailyReview,
    relativeTime,
    reviewOutcome,
    scheduleReview,
    sessionImpact,
    sessionSummary,
    stageLabel,
    top5Readiness
  };
});
