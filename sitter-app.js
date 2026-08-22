const SITTER_PACKAGE = (() => {
  try {
    const search = window.location && window.location.search ? window.location.search : "";
    if (/[?&]pakke=casper(&|$)/.test(search) && window.SITTER_CURRICULUM_CASPER) return "casper";
  } catch (error) {
    console.warn("Sitter could not read package choice", error);
  }
  return "standard";
})();
const SITTER_STORAGE_KEY = SITTER_PACKAGE === "casper" ? "sitter-casper-v3" : "sitter-mvp-v1";
const SITTER_LEGACY_STORAGE_KEY = "casper-quest-retention-v1";
const SitterCore = window.RetentionCore;
const SitterMechanics = window.SitterMechanics;
const sitterCurriculum = SITTER_PACKAGE === "casper" ? window.SITTER_CURRICULUM_CASPER : window.SITTER_CURRICULUM;

if (!SitterCore) throw new Error("Retention core failed to load");
if (!SitterMechanics) throw new Error("Sitter mechanics failed to load");
if (!sitterCurriculum) throw new Error("Sitter curriculum failed to load");

const SITTER_GRADE_LEVEL = Number(sitterCurriculum.gradeLevels?.[0]) || 4;
const sitterSessionTargets = [5, 8, 12];
const sitterScreens = ["home", "session", "result", "complete", "memory", "history", "followup", "empty"];
const HOME_HERO_FLIP_MS = 1040;
const loadedSitterState = loadSitterState();
const sitterState = {
  data: loadedSitterState,
  screen: "home",
  session: loadedSitterState.activeSession?.session || null,
  pendingResult: loadedSitterState.activeSession?.pendingResult || null,
  selectedHistoryId: null,
  answerStartedAt: Date.now(),
  homeCountdownTimer: null,
  homeHeroFlipTimer: null,
  homeHeroFlipped: false,
  menuOpen: false,
  homeSubjectReveal: {
    deck: loadedSitterState.settings.activeDecks[loadedSitterState.settings.activeDecks.length - 1] || "Alle",
    behavior: "auto"
  },
  toastTimer: null,
  premiumSoundEnabled: true,
  premiumAudioContext: null,
  premiumAudioNodes: []
};

const sitterEls = {
  app: document.querySelector(".sitter-app"),
  description: document.querySelector("#sitterDescription"),
  gradeLabel: document.querySelector("#sitterGradeLabel"),
  subjectPickerTitle: document.querySelector("#subjectPickerTitle"),
  subjectPickerHelp: document.querySelector("#subjectPickerHelp"),
  screens: [...document.querySelectorAll("[data-screen-name]")],
  navButtons: [...document.querySelectorAll(".binder-tabs [data-go]")],
  menuToggle: document.querySelector("#sitterMenuToggle"),
  primaryNav: document.querySelector("#sitterPrimaryNav"),
  today: document.querySelector("#sitterToday"),
  streak: document.querySelector("#sitterStreak"),
  homeReadyPill: document.querySelector("#homeReadyPill"),
  homeStartCard: document.querySelector(".start-card"),
  homeStartTitle: document.querySelector("#homeStartTitle"),
  homeRoutine: document.querySelector("#homeRoutine"),
  homeSessionTarget: document.querySelector("#homeSessionTarget"),
  homeHeroLabel: document.querySelector("#homeHeroLabel"),
  homeHeroFront: document.querySelector("#homeHeroFront"),
  homeHeroBack: document.querySelector("#homeHeroBack"),
  homeProgressTitle: document.querySelector("#homeProgressTitle"),
  homeStageProgress: document.querySelector("#homeStageProgress"),
  showHeroProgress: document.querySelector("#showHeroProgress"),
  hideHeroProgress: document.querySelector("#hideHeroProgress"),
  homeSubjects: document.querySelector("#homeSubjects"),
  startSession: document.querySelector("#startSitterSession"),
  selectedSubjectCount: document.querySelector("#selectedSubjectCount"),
  selectedSubjectNames: document.querySelector("#selectedSubjectNames"),
  howSitterWorks: document.querySelector("#howSitterWorks"),
  dismissHowSitterWorks: document.querySelector("#dismissHowSitterWorks"),
  openHowSitterWorks: document.querySelector("#openHowSitterWorks"),
  sessionProgressText: document.querySelector("#sessionProgressText"),
  sessionSubject: document.querySelector("#sessionSubject"),
  sessionProgress: document.querySelector("#sessionProgress"),
  questionCard: document.querySelector("#questionCard"),
  questionImportance: document.querySelector("#questionImportance"),
  questionMemoryStage: document.querySelector("#questionMemoryStage"),
  questionType: document.querySelector("#questionType"),
  questionTitle: document.querySelector("#sessionTitle"),
  questionHelper: document.querySelector("#questionHelper"),
  answer: document.querySelector("#sitterAnswer"),
  checkAnswer: document.querySelector("#checkSitterAnswer"),
  resultShell: document.querySelector("#resultShell"),
  resultMark: document.querySelector("#resultMark"),
  resultEyebrow: document.querySelector("#resultEyebrow"),
  resultTitle: document.querySelector("#resultTitle"),
  resultMessage: document.querySelector("#resultMessage"),
  resultDetails: document.querySelector(".result-details"),
  resultReward: document.querySelector("#resultReward"),
  resultRewardMedia: document.querySelector("#resultRewardMedia"),
  premiumSceneTitle: document.querySelector("#premiumSceneTitle"),
  premiumSceneCaption: document.querySelector("#premiumSceneCaption"),
  premiumSealText: document.querySelector("#premiumSealText"),
  premiumSoundToggle: document.querySelector("#premiumSoundToggle"),
  premiumSoundLabel: document.querySelector("#premiumSoundToggle span"),
  premiumSkip: document.querySelector("#premiumSkip"),
  resultRewardStage: document.querySelector("#resultRewardStage"),
  resultRewardText: document.querySelector("#resultRewardText"),
  resultGivenAnswer: document.querySelector("#resultGivenAnswer"),
  resultCorrectAnswer: document.querySelector("#resultCorrectAnswer"),
  resultNextReviewLabel: document.querySelector("#resultNextReviewLabel"),
  resultNextReview: document.querySelector("#resultNextReview"),
  continueSession: document.querySelector("#continueSitterSession"),
  finishSession: document.querySelector("#finishSitterSession"),
  completeMessage: document.querySelector("#completeMessage"),
  completeCount: document.querySelector("#completeCount"),
  completeCorrect: document.querySelector("#completeCorrect"),
  completePromoted: document.querySelector("#completePromoted"),
  memorySittingCount: document.querySelector("#memorySittingCount"),
  memoryActive: document.querySelector("#memoryActive"),
  memoryHour: document.querySelector("#memoryHour"),
  memoryDay: document.querySelector("#memoryDay"),
  memoryWeek: document.querySelector("#memoryWeek"),
  memorySitting: document.querySelector("#memorySitting"),
  memorySubjects: document.querySelector("#memorySubjects"),
  memoryHistory: document.querySelector("#memoryHistory"),
  historySubject: document.querySelector("#historySubject"),
  historyTitle: document.querySelector("#historyTitle"),
  historyStage: document.querySelector("#historyStage"),
  historyQuestion: document.querySelector("#historyQuestion"),
  historyAnswer: document.querySelector("#historyAnswer"),
  historyMeaning: document.querySelector("#historyMeaning"),
  historySource: document.querySelector("#historySource"),
  historyAttempts: document.querySelector("#historyAttempts"),
  followupRecommendation: document.querySelector("#followupRecommendation"),
  followupTarget: document.querySelector("#followupTarget"),
  followupMode: document.querySelector("#followupMode"),
  followupReward: document.querySelector("#followupReward"),
  followupMetrics: document.querySelector("#followupMetrics"),
  followupGradeLabel: document.querySelector("#followupGradeLabel"),
  followupSourceNote: document.querySelector("#followupSourceNote"),
  saveFollowup: document.querySelector("#saveFollowup"),
  reset: document.querySelector("#resetSitterData"),
  emptyMessage: document.querySelector("#emptyMessage"),
  emptyNextDue: document.querySelector("#emptyNextDue"),
  toast: document.querySelector("#sitterToast")
};

function sitterDefaultSettings() {
  return {
    gradeLevel: SITTER_GRADE_LEVEL,
    activeDeck: "Alle",
    activeDecks: ["Alle"],
    sessionTarget: 5,
    contractMode: "requirement",
    howItWorksDismissed: false,
    rewardText: ""
  };
}

function normalizeSitterSettings(settings = {}) {
  const defaults = sitterDefaultSettings();
  const deckNames = new Set(["Alle", ...sitterCurriculum.decks.map((deck) => deck.deck)]);
  const contractModes = new Set(["requirement", "reward", "longMemory"]);
  const requestedDecks = Array.isArray(settings.activeDecks)
    ? settings.activeDecks.filter((deck) => deckNames.has(deck))
    : [settings.activeDeck].filter((deck) => deckNames.has(deck));
  const activeDecks = requestedDecks.includes("Alle") || !requestedDecks.length ? ["Alle"] : [...new Set(requestedDecks)];
  return {
    gradeLevel: SITTER_GRADE_LEVEL,
    activeDeck: activeDecks[0] || defaults.activeDeck,
    activeDecks,
    sessionTarget: sitterSessionTargets.includes(Number(settings.sessionTarget)) ? Number(settings.sessionTarget) : defaults.sessionTarget,
    contractMode: contractModes.has(settings.contractMode) ? settings.contractMode : defaults.contractMode,
    howItWorksDismissed: Boolean(settings.howItWorksDismissed),
    rewardText: String(settings.rewardText || "").trim().slice(0, 80)
  };
}

function sitterSeedById() {
  return new Map(sitterCurriculum.cards.map((card) => [card.id, card]));
}

function sitterCardMatchesActiveGrade(card) {
  const grades = Array.isArray(card.grades) && card.grades.length
    ? card.grades
    : sitterCurriculum.gradeLevels;
  return grades.map(Number).includes(SITTER_GRADE_LEVEL);
}

function createSitterCard(seed, createdAt, index = 0) {
  return SitterCore.normalizeCard(
    {
      ...seed,
      concept: seed.front,
      reps: 0,
      lapses: 0,
      stage: 0,
      ease: 2.5,
      dueAt: createdAt - index * 19_000,
      createdAt,
      lastReviewedAt: null,
      lastGrade: null,
      needsRewrite: false,
      responseTimes: [],
      history: []
    },
    { now: createdAt, createId: () => seed.id }
  );
}

function createSitterSeedState(createdAt = Date.now()) {
  return {
    schemaVersion: 3,
    app: "sitter",
    curriculumVersion: sitterCurriculum.version,
    settings: sitterDefaultSettings(),
    createdAt,
    updatedAt: createdAt,
    migratedFrom: null,
    activeSession: null,
    cards: sitterCurriculum.cards.map((card, index) => createSitterCard(card, createdAt, index))
  };
}

function mergeSitterSeed(card, seed) {
  return {
    ...seed,
    ...card,
    front: seed.front,
    back: seed.back,
    childPrompt: seed.childPrompt,
    source: seed.source,
    context: seed.context,
    tags: seed.tags,
    importance: seed.importance,
    acceptedAnswers: seed.acceptedAnswers,
    answerKeywords: seed.answerKeywords,
    requiredKeywords: seed.requiredKeywords,
    minKeywordHits: seed.minKeywordHits,
    answerMode: seed.answerMode
  };
}

function normalizeSitterState(parsed, migratedFrom = null) {
  if (!parsed || !Array.isArray(parsed.cards)) return createSitterSeedState();
  const timestamp = Date.now();
  const seedById = sitterSeedById();
  const migrateStages = Number(parsed.schemaVersion || 0) < 3;
  const existing = new Map(parsed.cards.filter((card) => seedById.has(card.id)).map((card) => [card.id, card]));
  const cards = sitterCurriculum.cards.map((seed, index) => {
    const saved = existing.get(seed.id);
    if (!saved) return createSitterCard(seed, timestamp, index);
    const merged = mergeSitterSeed(saved, seed);
    if (migrateStages) merged.stage = SitterMechanics.migrateLegacyStage(merged.stage);
    return SitterCore.normalizeCard(merged, { now: timestamp, createId: () => seed.id });
  });
  return {
    ...parsed,
    schemaVersion: 3,
    app: "sitter",
    curriculumVersion: sitterCurriculum.version,
    settings: normalizeSitterSettings(parsed.settings),
    migratedFrom: migratedFrom || parsed.migratedFrom || null,
    activeSession: parsed.activeSession && !migrateStages ? parsed.activeSession : null,
    cards
  };
}

function loadSitterState() {
  try {
    const current = localStorage.getItem(SITTER_STORAGE_KEY);
    if (current) return normalizeSitterState(JSON.parse(current));
    const legacy = SITTER_PACKAGE === "standard" ? localStorage.getItem(SITTER_LEGACY_STORAGE_KEY) : null;
    if (legacy) {
      const migrated = normalizeSitterState(JSON.parse(legacy), SITTER_LEGACY_STORAGE_KEY);
      localStorage.setItem(SITTER_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn("Sitter could not load local state", error);
  }
  return createSitterSeedState();
}

function saveSitterState() {
  sitterState.data = {
    ...sitterState.data,
    settings: normalizeSitterSettings(sitterState.data.settings),
    activeSession: sitterState.session && !sitterState.session.completed
      ? { session: sitterState.session, pendingResult: sitterState.pendingResult }
      : null,
    updatedAt: Date.now()
  };
  localStorage.setItem(SITTER_STORAGE_KEY, JSON.stringify(sitterState.data));
}

function sitterSettings() {
  return normalizeSitterSettings(sitterState.data.settings);
}

function escapeSitterHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function normalizeSitterAnswer(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[.,!?;:=()[\]{}"'`´]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sitterAnswerTokens(value = "") {
  return normalizeSitterAnswer(value).split(" ").filter(Boolean);
}

function sitterNumberAnswers(value = "") {
  return (String(value).match(/-?\d+(?:[,.]\d+)?/g) || []).map((item) => Number(item.replace(",", ".")));
}

function escapeSitterRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sitterContainsPhrase(answer, phrase) {
  const normalizedAnswer = normalizeSitterAnswer(answer);
  const normalizedPhrase = normalizeSitterAnswer(phrase);
  if (!normalizedPhrase) return false;
  if (normalizedAnswer === normalizedPhrase) return true;
  if (normalizedPhrase.length <= 2) return sitterAnswerTokens(answer).includes(normalizedPhrase);
  return new RegExp(`(^| )${escapeSitterRegExp(normalizedPhrase)}( |$)`).test(normalizedAnswer);
}

function evaluateSitterAnswer(card, scratchpad) {
  const answer = String(scratchpad || "").trim();
  const accepted = Array.isArray(card.acceptedAnswers) ? card.acceptedAnswers : [];
  const keywords = Array.isArray(card.answerKeywords) ? card.answerKeywords : [];
  const required = Array.isArray(card.requiredKeywords) ? card.requiredKeywords : [];
  const minKeywordHits = Number.isFinite(card.minKeywordHits) ? card.minKeywordHits : keywords.length;

  if (!answer) return { grade: "again", label: "Skriv et svar", message: "Skriv svaret før Sitter sjekker.", tone: "again" };

  if (card.answerMode === "number") {
    const numbers = sitterNumberAnswers(answer);
    const acceptedNumbers = accepted.map((item) => Number(String(item).replace(",", "."))).filter(Number.isFinite);
    const hit = acceptedNumbers.some((expected) => numbers.some((actual) => Math.abs(actual - expected) < 0.001));
    return hit
      ? { grade: "good", label: "Riktig", message: "Du hentet frem riktig svar.", tone: "success" }
      : { grade: "again", label: "Ikke ennå", message: "Se på fasiten. Oppgaven kommer snart tilbake.", tone: "again" };
  }

  const exactHit = accepted.some((item) => {
    const normalizedItem = normalizeSitterAnswer(item);
    if (normalizedItem.length <= 2) return normalizeSitterAnswer(answer) === normalizedItem;
    return normalizedItem && (normalizeSitterAnswer(answer) === normalizedItem || sitterContainsPhrase(answer, item));
  });
  if (exactHit) return { grade: "good", label: "Riktig", message: "Du hentet frem riktig svar.", tone: "success" };

  const tokens = new Set(sitterAnswerTokens(answer));
  const requiredHits = required.filter((item) => tokens.has(normalizeSitterAnswer(item)) || sitterContainsPhrase(answer, item));
  const keywordHits = keywords.filter((item) => tokens.has(normalizeSitterAnswer(item)) || sitterContainsPhrase(answer, item));
  const requiredOk = requiredHits.length >= required.length;
  const keywordOk = keywordHits.length >= minKeywordHits;

  if ((required.length && requiredOk && (!keywords.length || keywordOk)) || (!required.length && keywords.length && keywordOk)) {
    return { grade: "good", label: "Riktig", message: "Du fikk med det viktigste.", tone: "success" };
  }
  if (keywordHits.length || requiredHits.length) {
    return { grade: "hard", label: "Nesten", message: "Du var inne på det. Oppgaven får en kortere pause.", tone: "warning" };
  }
  return { grade: "again", label: "Ikke ennå", message: "Se på fasiten. Oppgaven kommer snart tilbake.", tone: "again" };
}

function sitterScopedCards() {
  const settings = sitterSettings();
  const activeDecks = new Set(settings.activeDecks || [settings.activeDeck]);
  return sitterState.data.cards.filter((card) => {
    const deckMatch = activeDecks.has("Alle") || activeDecks.has(card.deck);
    return sitterCardMatchesActiveGrade(card) && deckMatch;
  });
}

function sitterDueCards() {
  return SitterMechanics.dueCards(sitterScopedCards(), Date.now());
}

function sitterUpcomingCard() {
  const timestamp = Date.now();
  return sitterScopedCards().filter((card) => card.dueAt > timestamp).sort((a, b) => a.dueAt - b.dueAt)[0] || null;
}

function sitterStage(card) {
  return SitterMechanics.stageLabel(card);
}

function sitterDeckMeta(deckName) {
  return sitterCurriculum.decks.find((deck) => deck.deck === deckName) || { subject: deckName, deck: deckName, color: "#50648f", emoji: "•" };
}

function sitterProgress(cards = sitterScopedCards()) {
  const due = SitterMechanics.dueCards(cards, Date.now()).length;
  const fresh = cards.filter((card) => card.reps === 0).length;
  const stages = [0, 0, 0, 0, 0];
  cards.forEach((card) => { stages[SitterMechanics.clampStage(card.stage)] += 1; });
  const onWay = cards.filter((card) => card.reps > 0 && SitterMechanics.clampStage(card.stage) < 4).length;
  const sitting = cards.filter((card) => SitterMechanics.clampStage(card.stage) === 4).length;
  const lapsed = cards.filter((card) => Number(card.lapses || 0) > 0).length;
  const stuck = cards.filter((card) => Number(card.consecutiveLapses || 0) >= 2).length;
  const reps = cards.reduce((total, card) => total + card.reps, 0);
  return { due, fresh, lapsed, onWay, reps, sitting, stages, stuck, total: cards.length };
}

function sitterHistoryEntries() {
  return sitterState.data.cards
    .filter((card) => card.reps > 0 || card.history?.length)
    .sort((a, b) => Number(b.lastReviewedAt || 0) - Number(a.lastReviewedAt || 0));
}

function sitterSessionCard() {
  if (!sitterState.session) return null;
  const id = sitterState.session.cardIds[sitterState.session.index];
  return sitterState.data.cards.find((card) => card.id === id) || null;
}

function sitterRemainingActive() {
  return SitterMechanics.activeCount(sitterState.session);
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ukjent dato";
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatToday() {
  const text = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDuration(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value)) return "snart";
  if (value < 60 * 60 * 1000) return `${Math.max(1, Math.round(value / 60_000))} minutter`;
  if (value < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.round(value / 3_600_000))} timer`;
  return `${Math.max(1, Math.round(value / 86_400_000))} dager`;
}

function formatHomeCountdown(ms) {
  const value = Math.max(0, Number(ms) || 0);
  if (value < 60_000) return { value: "<1", label: "minutt" };
  if (value < 60 * 60 * 1000) {
    const totalSeconds = Math.ceil(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return { value: `${minutes}:${seconds}`, label: "til neste" };
  }
  if (value < 24 * 60 * 60 * 1000) {
    const totalMinutes = Math.ceil(value / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { value: `${hours}t ${minutes}m`, label: "til neste" };
  }
  const totalHours = Math.ceil(value / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { value: `${days}d ${hours}t`, label: "til neste" };
}

function selectedSubjectSummary(settings = sitterSettings(), due = sitterDueCards().length) {
  const allSelected = settings.activeDecks.includes("Alle") || settings.activeDecks.length === sitterCurriculum.decks.length;
  if (allSelected) {
    return {
      count: "Blandet økt",
      names: "Alle fag"
    };
  }
  const subjects = settings.activeDecks.map((deckName) => sitterDeckMeta(deckName).subject);
  return {
    count: `${subjects.length} ${subjects.length === 1 ? "fag" : "fag"} valgt`,
    names: subjects.join(" + ")
  };
}

function sitterRoutineText(settings = sitterSettings(), due = sitterDueCards().length) {
  const target = due > 0 ? Math.min(settings.sessionTarget, due) : settings.sessionTarget;
  const reward = settings.rewardText || "den avtalte belønningen";
  if (settings.contractMode === "reward") return `${target} oppgaver først. Etterpå: ${reward}.`;
  if (settings.contractMode === "longMemory") return `${target} oppgaver nå. Belønningen knyttes til det som faktisk sitter over tid.`;
  return settings.activeDecks.includes("Alle")
    ? "Sitter blander fagene og henter det viktigste først."
    : "Sitter blander de valgte fagene og henter det viktigste først.";
}

function sitterStreak() {
  const days = new Set();
  for (const card of sitterState.data.cards) {
    for (const event of card.history || []) {
      const timestamp = event.at || event.reviewedAt || event.timestamp;
      if (timestamp) days.add(new Date(timestamp).toISOString().slice(0, 10));
    }
  }
  if (!days.size) return 0;
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function showSitterToast(message) {
  window.clearTimeout(sitterState.toastTimer);
  sitterEls.toast.textContent = message;
  sitterEls.toast.hidden = false;
  sitterState.toastTimer = window.setTimeout(() => {
    sitterEls.toast.hidden = true;
  }, 3200);
}

function setSitterMenuOpen(open, { focus = false } = {}) {
  sitterState.menuOpen = Boolean(open);
  sitterEls.app.classList.toggle("menu-open", sitterState.menuOpen);
  sitterEls.menuToggle.classList.toggle("is-open", sitterState.menuOpen);
  sitterEls.menuToggle.setAttribute("aria-expanded", String(sitterState.menuOpen));
  sitterEls.menuToggle.setAttribute("aria-label", sitterState.menuOpen ? "Lukk meny" : "Åpne meny");
  sitterEls.primaryNav.setAttribute("aria-hidden", String(!sitterState.menuOpen));
  if (sitterState.menuOpen) sitterEls.primaryNav.removeAttribute("inert");
  else sitterEls.primaryNav.setAttribute("inert", "");
  if (sitterState.menuOpen && focus) {
    window.requestAnimationFrame?.(() => sitterEls.navButtons.find((button) => button.classList.contains("active"))?.focus());
  }
}

function setSitterScreen(screen) {
  setSitterMenuOpen(false);
  sitterState.screen = sitterScreens.includes(screen) ? screen : "home";
  if (sitterState.screen !== "result") stopPremiumSound();
  sitterEls.app.dataset.screen = sitterState.screen;
  sitterEls.screens.forEach((section) => {
    section.hidden = section.dataset.screenName !== sitterState.screen;
  });
  const navScreen = sitterState.screen === "history" ? "memory" : sitterState.screen;
  sitterEls.navButtons.forEach((button) => {
    const active = button.dataset.go === navScreen;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  renderSitter();
  window.scrollTo?.({ top: 0, behavior: "smooth" });
}

function renderSitterPackageIdentity() {
  const gradeLabel = `${SITTER_GRADE_LEVEL}. klasse`;
  sitterEls.app.dataset.package = SITTER_PACKAGE;
  sitterEls.app.dataset.grade = String(SITTER_GRADE_LEVEL);
  sitterEls.gradeLabel.textContent = gradeLabel;
  sitterEls.followupGradeLabel.textContent = gradeLabel;
  sitterEls.followupSourceNote.textContent = sitterCurriculum.note || sitterCurriculum.source;
  if (SITTER_PACKAGE === "casper") {
    sitterEls.subjectPickerTitle.textContent = `Casper sin pakke · ${sitterCurriculum.cards.length} spørsmål`;
    sitterEls.subjectPickerHelp.textContent = "Velg ett fag eller alle.";
  }
  sitterEls.description.setAttribute(
    "content",
    `Sitter hjelper elever i ${gradeLabel} å flytte viktig kunnskap til langtidsminnet.`
  );
}

function renderHomeSubjects() {
  const selected = new Set(sitterSettings().activeDecks);
  const allCards = sitterState.data.cards.filter(sitterCardMatchesActiveGrade);
  const allProgress = sitterProgress(allCards);
  const allRow = `
    <button class="subject-earmark subject-earmark-all ${selected.has("Alle") ? "is-selected" : ""}" type="button" data-subject-select="Alle" aria-pressed="${selected.has("Alle")}" style="--subject-color:#50648f">
      <span><strong>Alle fag</strong><small>${allProgress.due} nå</small></span>
    </button>`;
  const rows = sitterCurriculum.decks.map((deck) => {
    const cards = sitterState.data.cards.filter((card) => card.deck === deck.deck && sitterCardMatchesActiveGrade(card));
    const progress = sitterProgress(cards);
    return `
      <button class="subject-earmark ${selected.has(deck.deck) ? "is-selected" : ""}" type="button" data-subject-select="${escapeSitterHtml(deck.deck)}" aria-pressed="${selected.has(deck.deck)}" style="--subject-color:${deck.color}">
        <span><strong>${escapeSitterHtml(deck.deck)}</strong><small>${progress.due} nå</small></span>
      </button>`;
  }).join("");
  sitterEls.homeSubjects.innerHTML = rows + allRow;
  if (sitterState.homeSubjectReveal) {
    const reveal = sitterState.homeSubjectReveal;
    sitterState.homeSubjectReveal = null;
    scrollHomeSubjectIntoView(reveal.deck, reveal.behavior);
  }
}

function scrollHomeSubjectIntoView(deckName, behavior = "auto") {
  const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
  schedule(() => {
    const ears = sitterEls.homeSubjects.querySelectorAll?.("[data-subject-select]");
    const ear = ears ? [...ears].find((item) => item.dataset.subjectSelect === deckName) : null;
    if (!ear || typeof sitterEls.homeSubjects.scrollTo !== "function") return;

    const edge = 12;
    const viewLeft = sitterEls.homeSubjects.scrollLeft;
    const viewRight = viewLeft + sitterEls.homeSubjects.clientWidth;
    const earLeft = ear.offsetLeft;
    const earRight = earLeft + ear.offsetWidth;
    let nextLeft = viewLeft;

    if (earLeft < viewLeft + edge) nextLeft = Math.max(0, earLeft - edge);
    else if (earRight > viewRight - edge) nextLeft = earRight - sitterEls.homeSubjects.clientWidth + edge;
    if (nextLeft === viewLeft) return;
    sitterEls.homeSubjects.scrollTo({ left: nextLeft, behavior });
  });
}

function homeStageSummary(cards = sitterScopedCards()) {
  const progress = sitterProgress(cards);
  return SitterMechanics.STAGES.map((stage, index) => ({
    key: stage.key,
    label: stage.label,
    count: progress.stages[index] || 0
  }));
}

function renderHomeProgress(selected) {
  sitterEls.homeProgressTitle.textContent = `${selected.names}.`;
  sitterEls.homeStageProgress.innerHTML = homeStageSummary().map((stage) => `
    <div data-home-stage="${escapeSitterHtml(stage.key)}">
      <span>${escapeSitterHtml(stage.label)}</span>
      <strong>${stage.count}</strong>
    </div>`).join("");
}

function setHomeHeroFlipped(flipped, { focus = false } = {}) {
  const nextFlipped = Boolean(flipped);
  const changed = nextFlipped !== sitterState.homeHeroFlipped;
  const reducedMotion = sitterPrefersReducedMotion();
  sitterState.homeHeroFlipped = nextFlipped;
  window.clearTimeout(sitterState.homeHeroFlipTimer);
  sitterEls.homeStartCard.classList.toggle("is-flipped", sitterState.homeHeroFlipped);
  sitterEls.homeStartCard.classList.toggle("is-turning", changed && !reducedMotion);
  sitterEls.showHeroProgress.setAttribute("aria-expanded", String(sitterState.homeHeroFlipped));
  sitterEls.homeHeroFront.setAttribute("aria-hidden", String(sitterState.homeHeroFlipped));
  sitterEls.homeHeroBack.setAttribute("aria-hidden", String(!sitterState.homeHeroFlipped));
  if (sitterState.homeHeroFlipped) {
    sitterEls.homeHeroFront.setAttribute("inert", "");
    sitterEls.homeHeroBack.removeAttribute("inert");
  } else {
    sitterEls.homeHeroBack.setAttribute("inert", "");
    sitterEls.homeHeroFront.removeAttribute("inert");
  }

  const finishFlip = () => {
    sitterEls.homeStartCard.classList.remove("is-turning");
    if (focus) {
      const target = sitterState.homeHeroFlipped ? sitterEls.hideHeroProgress : sitterEls.showHeroProgress;
      target.focus({ preventScroll: true });
    }
  };
  if (!changed || reducedMotion) finishFlip();
  else sitterState.homeHeroFlipTimer = window.setTimeout(finishFlip, HOME_HERO_FLIP_MS);
}

function renderSitterHome() {
  const settings = sitterSettings();
  const due = sitterDueCards().length;
  const resting = due === 0 && !(sitterState.session && !sitterState.session.completed);
  const selected = selectedSubjectSummary(settings, due);
  window.clearTimeout(sitterState.homeCountdownTimer);
  sitterEls.today.textContent = formatToday();
  sitterEls.streak.textContent = `${sitterStreak()} dager`;
  sitterEls.homeStartCard.classList.toggle("is-resting", resting);
  sitterEls.selectedSubjectCount.textContent = selected.count;
  sitterEls.selectedSubjectNames.textContent = selected.names;
  const singleDeck = settings.activeDecks.length === 1 && settings.activeDecks[0] !== "Alle"
    ? sitterDeckMeta(settings.activeDecks[0])
    : null;
  sitterEls.homeStartCard.style.setProperty("--hero-color", singleDeck?.color || "#50648f");
  sitterEls.startSession.hidden = false;
  sitterEls.howSitterWorks.hidden = settings.howItWorksDismissed;
  sitterEls.openHowSitterWorks.hidden = !settings.howItWorksDismissed;
  renderHomeProgress(selected);

  if (resting) {
    const upcoming = sitterUpcomingCard();
    const countdown = upcoming ? formatHomeCountdown(upcoming.dueAt - Date.now()) : { value: "✓", label: "alt planlagt" };
    sitterEls.homeReadyPill.textContent = "Dagens kø er ryddet";
    sitterEls.homeStartTitle.textContent = "Alt ryddet. Hjernen jobber videre.";
    sitterEls.homeRoutine.textContent = upcoming
      ? "Sterkt jobbet. Du har skjøvet alle spørsmålene fremover. Nå er pausen en del av læringen."
      : "Sterkt jobbet. Alt er planlagt videre.";
    sitterEls.homeSessionTarget.textContent = countdown.value;
    sitterEls.homeHeroLabel.textContent = countdown.label;
    sitterEls.startSession.textContent = "Se hva som er på vei →";
    if (upcoming) {
      const wait = Math.max(0, upcoming.dueAt - Date.now());
      const refreshAfter = wait < 60 * 60 * 1000 ? 1000 : 60_000;
      sitterState.homeCountdownTimer = window.setTimeout(() => {
        if (sitterState.screen === "home") renderSitterHome();
      }, refreshAfter);
    }
  } else {
    const resuming = sitterState.session && !sitterState.session.completed;
    sitterEls.homeReadyPill.textContent = resuming ? "Økten venter på deg" : `${due} ${due === 1 ? "oppgave" : "oppgaver"} nå`;
    const heroSubject = selected.names;
    sitterEls.homeStartTitle.textContent = resuming ? "Fortsett der du slapp." : `${heroSubject}.`;
    sitterEls.homeRoutine.textContent = sitterRoutineText(settings, due);
    sitterEls.homeSessionTarget.textContent = String(Math.min(settings.sessionTarget, Math.max(1, due)));
    sitterEls.homeHeroLabel.textContent = "oppgaver";
    sitterEls.startSession.textContent = resuming ? "Fortsett økten →" : "Start økt →";
  }
  renderHomeSubjects();
}

function renderSessionProgress() {
  const session = sitterState.session;
  if (!session) return;
  const initialIds = session.initialCardIds || [...new Set(session.cardIds)];
  const resolved = new Set(session.resolvedCardIds || []);
  const currentId = session.cardIds[session.index];
  sitterEls.sessionProgress.style.setProperty("--steps", initialIds.length);
  sitterEls.sessionProgress.innerHTML = initialIds.map((id) => {
    const state = resolved.has(id) ? "done" : id === currentId ? "current" : "";
    return `<i class="${state}"></i>`;
  }).join("");
}

function renderSitterSession() {
  const session = sitterState.session;
  const card = sitterSessionCard();
  if (!session || !card) return;
  const deck = sitterDeckMeta(card.deck);
  const remaining = sitterRemainingActive();
  sitterEls.sessionProgressText.textContent = `${remaining} ${remaining === 1 ? "aktiv" : "aktive"} igjen`;
  sitterEls.sessionSubject.textContent = deck.subject;
  sitterEls.questionImportance.textContent = card.importance || "Viktig";
  sitterEls.questionMemoryStage.textContent = sitterStage(card);
  sitterEls.questionType.textContent = `${deck.subject} · ${card.promptType || "Oppgave"}`;
  sitterEls.questionTitle.textContent = card.front;
  sitterEls.questionHelper.textContent = card.childPrompt || "Skriv det du husker.";
  sitterEls.answer.value = "";
  sitterEls.checkAnswer.disabled = true;
  sitterState.answerStartedAt = Date.now();
  renderSessionProgress();
}

function sitterPrefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

function prefersReducedPremiumMotion() {
  return sitterPrefersReducedMotion();
}

function premiumRewardVariant(card) {
  const variants = [
    { key: "binder", seal: "S", title: "Månedsmerket er ditt.", caption: "Kunnskapen holdt hele veien." },
    { key: "month", seal: "1M", title: "Fra på vei til Sitter.", caption: "Du hentet det frem etter en hel måned." },
    { key: "memory", seal: "✓", title: "Denne ble værende.", caption: "Nå ligger den i langtidsminnet." }
  ];
  const hash = [...String(card?.id || "sitter")].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return variants[hash % variants.length];
}

function configurePremiumReward(card) {
  const variant = premiumRewardVariant(card);
  sitterEls.resultRewardMedia.dataset.variant = variant.key;
  sitterEls.resultRewardMedia.dataset.skipped = "false";
  sitterEls.resultRewardMedia.setAttribute("aria-hidden", "false");
  sitterEls.premiumSealText.textContent = variant.seal;
  sitterEls.premiumSceneTitle.textContent = variant.title;
  sitterEls.premiumSceneCaption.textContent = variant.caption;
  sitterEls.premiumSkip.textContent = "Vis ferdig bilde";
  sitterEls.premiumSoundToggle.setAttribute("aria-pressed", String(sitterState.premiumSoundEnabled));
  sitterEls.premiumSoundLabel.textContent = sitterState.premiumSoundEnabled ? "Lyd på" : "Lyd av";
}

function stopPremiumSound() {
  sitterState.premiumAudioNodes.forEach((node) => {
    try { node.stop(); } catch {}
  });
  sitterState.premiumAudioNodes = [];
}

function playPremiumSound() {
  stopPremiumSound();
  if (!sitterState.premiumSoundEnabled || prefersReducedPremiumMotion()) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const context = sitterState.premiumAudioContext || new AudioContext();
    sitterState.premiumAudioContext = context;
    context.resume?.();
    const start = context.currentTime + 0.02;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.12, start + 0.06);
    master.gain.exponentialRampToValueAtTime(0.0001, start + 1.25);
    master.connect(context.destination);
    [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 3 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start + index * 0.13);
      oscillator.connect(master);
      oscillator.start(start + index * 0.13);
      oscillator.stop(start + 0.72 + index * 0.13);
      sitterState.premiumAudioNodes.push(oscillator);
    });
  } catch {
    stopPremiumSound();
  }
}

function setPremiumSkipped(skipped) {
  sitterEls.resultRewardMedia.dataset.skipped = String(skipped);
  sitterEls.resultShell.classList.toggle("premium-skipped", skipped);
  sitterEls.premiumSkip.textContent = skipped ? "Vis transformasjonen igjen" : "Vis ferdig bilde";
  if (skipped) stopPremiumSound();
  else playPremiumSound();
}

function weekBinderBadge() {
  return '<svg class="week-binder-badge" viewBox="0 0 84 84" aria-hidden="true"><path d="M21 13h38c7 0 12 5 12 12v38c0 5-4 9-9 9H24c-6 0-11-5-11-11V21c0-4 4-8 8-8Z"/><path d="M27 14v57"/><path d="m38 43 8 8 16-20"/></svg>';
}

function renderSitterResult() {
  const pending = sitterState.pendingResult;
  if (!pending) return;
  const { card, answer, result, scheduled } = pending;
  const good = result.grade === "good";
  const almost = result.grade === "hard";
  const rewardEvent = scheduled.rewardEvent || "none";
  const rewardTier = rewardEvent === "promoted_to_month_sitter" ? "sitter"
    : rewardEvent === "promoted_to_week" ? "week"
      : good ? "standard" : "retry";
  sitterEls.resultShell.dataset.tone = good ? "success" : almost ? "warning" : "again";
  sitterEls.resultShell.dataset.reward = rewardTier;
  sitterEls.resultShell.classList.remove("premium-skipped");
  sitterEls.resultMark.innerHTML = rewardTier === "week" ? weekBinderBadge() : "";
  if (rewardTier !== "week") sitterEls.resultMark.textContent = rewardTier === "sitter" ? "" : good ? "✓" : almost ? "≈" : "↺";
  sitterEls.resultEyebrow.textContent = rewardTier === "sitter" ? "SUPER SITTER"
    : rewardTier === "week" ? "Gull i permen" : good ? "Hentet frem" : result.label;
  sitterEls.resultTitle.textContent = rewardTier === "sitter" ? "DET SITTER."
    : rewardTier === "week" ? "En hel uke!" : good ? "Den satt." : almost ? "Nesten." : "Vi tar den igjen.";
  sitterEls.resultMessage.textContent = result.message;
  sitterEls.resultGivenAnswer.textContent = answer;
  sitterEls.resultCorrectAnswer.textContent = card.back;
  sitterEls.resultNextReviewLabel.textContent = good ? "Kommer tilbake" : "Tilbake i køen";
  sitterEls.resultNextReview.textContent = good ? `om ${formatDuration(scheduled.intervalMs)}` : "nå · i denne økten";
  const stageBefore = SitterMechanics.stageMeta(card).label;
  const stageAfter = SitterMechanics.stageMeta(scheduled.card).label;
  if (good) {
    sitterEls.resultRewardStage.textContent = rewardTier === "standard" ? `Neste stopp: ${stageAfter}` : `${stageBefore} → ${stageAfter}`;
    sitterEls.resultRewardText.textContent = rewardTier === "sitter"
      ? "Du nådde Sitter."
      : rewardTier === "week" ? "Det fortjener gull i permen."
        : "Hjernen får en pause før du møter den igjen.";
  } else if (almost) {
    sitterEls.resultRewardStage.textContent = "Nesten → tilbake i køen";
    sitterEls.resultRewardText.textContent = "Du var nær. Den ligger aktiv til du skyver den bort.";
  } else {
    sitterEls.resultRewardStage.textContent = "Fasit sett → tilbake i køen";
    sitterEls.resultRewardText.textContent = "Den ligger aktiv og kommer igjen i denne økten.";
  }
  if (rewardTier === "sitter") configurePremiumReward(card);
  else {
    sitterEls.resultRewardMedia.setAttribute("aria-hidden", "true");
    stopPremiumSound();
  }
  sitterEls.resultDetails.removeAttribute("open");
  sitterEls.resultShell.classList.remove("is-celebrating");
  void sitterEls.resultShell.offsetWidth;
  const celebrate = () => {
    sitterEls.resultShell.classList.add("is-celebrating");
    if (rewardTier === "sitter") playPremiumSound();
  };
  if (window.requestAnimationFrame) window.requestAnimationFrame(celebrate);
  else celebrate();
  if (good) window.navigator?.vibrate?.(35);
  sitterEls.resultTitle.focus({ preventScroll: true });
  const last = good && sitterState.session && sitterState.session.index >= sitterState.session.cardIds.length - 1;
  sitterEls.continueSession.textContent = last ? "Se oppsummering →" : "Neste oppgave →";
}

function renderSitterComplete() {
  const results = sitterState.session?.results || [];
  const resolved = new Set(sitterState.session?.resolvedCardIds || []);
  const correct = results.filter((item) => item.grade === "good").length;
  const promoted = results.filter((item) => item.promoted).length;
  sitterEls.completeCount.textContent = String(resolved.size);
  sitterEls.completeCorrect.textContent = String(correct);
  sitterEls.completePromoted.textContent = String(promoted);
  sitterEls.completeMessage.textContent = resolved.size
    ? `Du ryddet ${resolved.size} ${resolved.size === 1 ? "spørsmål" : "spørsmål"} ut av den aktive køen. Sitter finner dem frem igjen når tidsporten åpner.`
    : "Dagens økt er avsluttet.";
}

function renderSitterMemory() {
  const progress = sitterProgress(sitterState.data.cards);
  sitterEls.memorySittingCount.textContent = String(progress.sitting);
  sitterEls.memoryActive.textContent = String(progress.stages[0]);
  sitterEls.memoryHour.textContent = String(progress.stages[1]);
  sitterEls.memoryDay.textContent = String(progress.stages[2]);
  sitterEls.memoryWeek.textContent = String(progress.stages[3]);
  sitterEls.memorySitting.textContent = String(progress.sitting);
  sitterEls.memorySubjects.innerHTML = sitterCurriculum.decks.map((deck) => {
    const cards = sitterState.data.cards.filter((card) => card.deck === deck.deck);
    const deckProgress = sitterProgress(cards);
    const percent = deckProgress.total ? Math.round((deckProgress.sitting / deckProgress.total) * 100) : 0;
    return `
      <article class="memory-subject-row" style="--subject-color:${deck.color}">
        <div class="memory-subject-head"><strong>${escapeSitterHtml(deck.subject)}</strong><span>${deckProgress.sitting} sitter · ${deckProgress.due} aktive nå</span></div>
        <div class="memory-bar"><i style="width:${percent}%"></i></div>
      </article>`;
  }).join("");

  const history = sitterHistoryEntries().slice(0, 8);
  sitterEls.memoryHistory.innerHTML = history.length ? history.map((card) => {
    const deck = sitterDeckMeta(card.deck);
    const lastEvent = card.history?.[card.history.length - 1];
    const grade = lastEvent?.grade || card.lastGrade || "good";
    const label = grade === "good" ? "Riktig" : grade === "hard" ? "Nesten" : "Øv igjen";
    return `
      <button class="history-row" type="button" data-history-id="${escapeSitterHtml(card.id)}" style="--subject-color:${deck.color}">
        <span class="subject-mark">${escapeSitterHtml(deck.emoji)}</span>
        <span><strong>${escapeSitterHtml(card.front)}</strong><small>${escapeSitterHtml(deck.subject)} · ${escapeSitterHtml(sitterStage(card))}</small></span>
        <span class="history-result">${label}</span>
      </button>`;
  }).join("") : '<p class="question-helper">Historikken fylles når den første økten er gjennomført.</p>';
}

function renderSitterHistory() {
  const card = sitterState.data.cards.find((item) => item.id === sitterState.selectedHistoryId) || sitterHistoryEntries()[0];
  if (!card) {
    setSitterScreen("memory");
    return;
  }
  const deck = sitterDeckMeta(card.deck);
  sitterEls.historySubject.textContent = deck.subject;
  sitterEls.historyTitle.textContent = sitterStage(card) === "Sitter" ? "Denne sitter." : "På vei til å sitte.";
  sitterEls.historyStage.textContent = sitterStage(card);
  sitterEls.historyQuestion.textContent = card.front;
  sitterEls.historyAnswer.textContent = `Fasit: ${card.back}`;
  sitterEls.historyMeaning.textContent = card.context || "Oppgaven bygger viktig kunnskap for videre læring.";
  sitterEls.historySource.textContent = card.source || sitterCurriculum.source;
  const attempts = [...(card.history || [])].reverse();
  sitterEls.historyAttempts.innerHTML = attempts.length ? attempts.map((event, index) => {
    const grade = event.grade || "good";
    const label = grade === "good" ? "Riktig" : grade === "hard" ? "Nesten" : "Øv igjen";
    const timestamp = event.at || event.reviewedAt || event.timestamp || card.lastReviewedAt;
    const interval = event.intervalMs || event.nextIntervalMs;
    return `
      <article class="attempt-row">
        <b>${timestamp ? formatShortDate(timestamp) : `Forsøk ${attempts.length - index}`}</b>
        <div><span>Resultat</span><p>${label}</p></div>
        <b>${interval ? `Neste: ${formatDuration(interval)}` : sitterStage(card)}</b>
      </article>`;
  }).join("") : '<p class="question-helper">Denne oppgaven er ikke repetert ennå.</p>';
}

function renderSitterFollowup() {
  const settings = sitterSettings();
  const progress = sitterProgress(sitterState.data.cards);
  sitterEls.followupRecommendation.textContent = progress.due
    ? sitterRoutineText(settings, progress.due)
    : "Alt er i rute. Neste oppgave åpner når repetisjonen er klar.";
  sitterEls.followupTarget.value = String(settings.sessionTarget);
  sitterEls.followupMode.value = settings.contractMode;
  sitterEls.followupReward.value = settings.rewardText;
  sitterEls.followupMetrics.innerHTML = `
    <div><strong>${progress.due}</strong><span>oppgaver nå</span></div>
    <div><strong>${progress.stages[3]}</strong><span>på 1 uke</span></div>
    <div><strong>${progress.sitting}</strong><span>sitter</span></div>
    <div><strong>${progress.stuck}</strong><span>trenger hjelp</span></div>
    <section class="followup-subject-table">
      <h3>Fag for fag</h3>
      ${sitterCurriculum.decks.map((deck) => {
        const deckProgress = sitterProgress(sitterState.data.cards.filter((card) => card.deck === deck.deck));
        return `<p><span>${escapeSitterHtml(deck.subject)}</span><b>${deckProgress.due} nå · ${deckProgress.stages[3]} uke · ${deckProgress.sitting} sitter</b></p>`;
      }).join("")}
    </section>`;
}

function renderSitterEmpty() {
  const upcoming = sitterUpcomingCard();
  if (upcoming) {
    const wait = Math.max(0, upcoming.dueAt - Date.now());
    sitterEls.emptyMessage.textContent = "Neste oppgave kommer når hjernen har fått en passe pause.";
    sitterEls.emptyNextDue.textContent = `${sitterDeckMeta(upcoming.deck).subject} · om ${formatDuration(wait)}`;
  } else {
    sitterEls.emptyMessage.textContent = "Alle oppgavene i kortpakken er planlagt videre.";
    sitterEls.emptyNextDue.textContent = "Alt er i rute";
  }
}

function renderSitter() {
  if (sitterState.screen === "home") renderSitterHome();
  if (sitterState.screen === "session") renderSitterSession();
  if (sitterState.screen === "result") renderSitterResult();
  if (sitterState.screen === "complete") renderSitterComplete();
  if (sitterState.screen === "memory") renderSitterMemory();
  if (sitterState.screen === "history") renderSitterHistory();
  if (sitterState.screen === "followup") renderSitterFollowup();
  if (sitterState.screen === "empty") renderSitterEmpty();
}

function startSitterSession() {
  if (sitterState.session && !sitterState.session.completed) {
    setSitterScreen(sitterState.pendingResult ? "result" : "session");
    return;
  }
  const due = sitterDueCards();
  if (!due.length) {
    setSitterScreen("memory");
    return;
  }
  const target = Math.min(sitterSettings().sessionTarget, due.length);
  const cardIds = SitterMechanics.buildSessionBag(due, target);
  sitterState.session = {
    cardIds,
    initialCardIds: [...cardIds],
    resolvedCardIds: [],
    index: 0,
    results: [],
    startedAt: Date.now(),
    selectedSubjectIds: [...sitterSettings().activeDecks],
    completed: false
  };
  sitterState.pendingResult = null;
  saveSitterState();
  setSitterScreen("session");
  window.setTimeout(() => sitterEls.answer.focus(), 50);
}

function checkSitterAnswer() {
  const card = sitterSessionCard();
  const answer = sitterEls.answer.value.trim();
  if (!card || !answer) return;
  const result = evaluateSitterAnswer(card, answer);
  const scheduled = SitterMechanics.scheduleReview(card, result.grade, {
    now: Date.now(),
    responseMs: Math.max(1000, Date.now() - sitterState.answerStartedAt),
    scratchpad: answer
  });
  sitterState.pendingResult = { card, answer, result, scheduled };
  saveSitterState();
  setSitterScreen("result");
}

function commitSitterResult() {
  const pending = sitterState.pendingResult;
  const session = sitterState.session;
  if (!pending || !session) return false;
  const promoted = pending.scheduled.promoted;
  sitterState.data.cards = sitterState.data.cards.map((card) => card.id === pending.card.id ? pending.scheduled.card : card);
  if (pending.scheduled.requeue) {
    session.cardIds = SitterMechanics.insertRetry(session.cardIds, session.index, pending.card.id, 2);
  } else if (!session.resolvedCardIds.includes(pending.card.id)) {
    session.resolvedCardIds.push(pending.card.id);
  }
  session.results.push({
    cardId: pending.card.id,
    grade: pending.result.grade,
    promoted,
    intervalMs: pending.scheduled.intervalMs,
    rewardEvent: pending.scheduled.rewardEvent
  });
  sitterState.pendingResult = null;
  saveSitterState();
  return true;
}

function continueSitterSession() {
  if (!commitSitterResult()) return;
  sitterState.session.index += 1;
  if (sitterState.session.index >= sitterState.session.cardIds.length) {
    sitterState.session.completed = true;
    saveSitterState();
    setSitterScreen("complete");
    return;
  }
  saveSitterState();
  setSitterScreen("session");
  window.setTimeout(() => sitterEls.answer.focus(), 50);
}

function finishSitterSession() {
  if (sitterState.pendingResult) commitSitterResult();
  if (sitterState.session) sitterState.session.completed = true;
  saveSitterState();
  setSitterScreen("complete");
}

function exitSitterSession() {
  if (sitterState.screen === "result" && sitterState.pendingResult) commitSitterResult();
  saveSitterState();
  setSitterScreen("home");
}

function toggleSitterSubject(deckName) {
  const settings = sitterSettings();
  if (deckName === "Alle") {
    settings.activeDecks = ["Alle"];
  } else if (SITTER_PACKAGE === "casper") {
    settings.activeDecks = [deckName];
  } else {
    const selected = new Set(settings.activeDecks.filter((deck) => deck !== "Alle"));
    if (selected.has(deckName)) selected.delete(deckName);
    else selected.add(deckName);
    settings.activeDecks = selected.size ? [...selected] : ["Alle"];
  }
  sitterState.data.settings = normalizeSitterSettings(settings);
  const activeDecks = sitterState.data.settings.activeDecks;
  if (SITTER_PACKAGE === "casper" && sitterState.session && !sitterState.session.completed) {
    const sessionDecks = sitterState.session.selectedSubjectIds || ["Alle"];
    const selectionChanged = sessionDecks.length !== activeDecks.length
      || sessionDecks.some((deck, index) => deck !== activeDecks[index]);
    if (selectionChanged) {
      sitterState.session = null;
      sitterState.pendingResult = null;
    }
  }
  sitterState.homeSubjectReveal = {
    deck: activeDecks.includes(deckName) ? deckName : activeDecks[activeDecks.length - 1],
    behavior: "smooth"
  };
  saveSitterState();
  renderSitterHome();
}

document.addEventListener("click", (event) => {
  const subject = event.target.closest("[data-subject-select]");
  if (subject) {
    toggleSitterSubject(subject.dataset.subjectSelect);
    return;
  }
  const navigation = event.target.closest("[data-go]");
  if (navigation) {
    setSitterScreen(navigation.dataset.go);
    return;
  }
  if (event.target.closest("[data-session-exit]")) exitSitterSession();
  const history = event.target.closest("[data-history-id]");
  if (history) {
    sitterState.selectedHistoryId = history.dataset.historyId;
    setSitterScreen("history");
    return;
  }
  if (sitterState.menuOpen && !event.target.closest("#sitterPrimaryNav") && !event.target.closest("#sitterMenuToggle")) setSitterMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sitterState.menuOpen) {
    setSitterMenuOpen(false);
    sitterEls.menuToggle.focus({ preventScroll: true });
  }
});

sitterEls.menuToggle.addEventListener("click", () => setSitterMenuOpen(!sitterState.menuOpen, { focus: !sitterState.menuOpen }));
sitterEls.startSession.addEventListener("click", startSitterSession);
sitterEls.showHeroProgress.addEventListener("click", () => setHomeHeroFlipped(true, { focus: true }));
sitterEls.hideHeroProgress.addEventListener("click", () => setHomeHeroFlipped(false, { focus: true }));
sitterEls.dismissHowSitterWorks.addEventListener("click", () => {
  sitterState.data.settings = normalizeSitterSettings({ ...sitterSettings(), howItWorksDismissed: true });
  saveSitterState();
  renderSitterHome();
});
sitterEls.openHowSitterWorks.addEventListener("click", () => {
  sitterState.data.settings = normalizeSitterSettings({ ...sitterSettings(), howItWorksDismissed: false });
  saveSitterState();
  renderSitterHome();
});
sitterEls.answer.addEventListener("input", () => {
  sitterEls.checkAnswer.disabled = sitterEls.answer.value.trim().length === 0;
});
sitterEls.answer.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && sitterEls.answer.value.trim()) checkSitterAnswer();
});
sitterEls.checkAnswer.addEventListener("click", checkSitterAnswer);
sitterEls.continueSession.addEventListener("click", continueSitterSession);
sitterEls.finishSession.addEventListener("click", finishSitterSession);
sitterEls.premiumSoundToggle.addEventListener("click", () => {
  sitterState.premiumSoundEnabled = !sitterState.premiumSoundEnabled;
  sitterEls.premiumSoundToggle.setAttribute("aria-pressed", String(sitterState.premiumSoundEnabled));
  sitterEls.premiumSoundLabel.textContent = sitterState.premiumSoundEnabled ? "Lyd på" : "Lyd av";
  if (sitterState.premiumSoundEnabled) playPremiumSound();
  else stopPremiumSound();
});
sitterEls.premiumSkip.addEventListener("click", () => {
  setPremiumSkipped(sitterEls.resultRewardMedia.dataset.skipped !== "true");
});
sitterEls.saveFollowup.addEventListener("click", () => {
  sitterState.data.settings = normalizeSitterSettings({
    ...sitterSettings(),
    sessionTarget: Number(sitterEls.followupTarget.value),
    contractMode: sitterEls.followupMode.value,
    rewardText: sitterEls.followupReward.value
  });
  saveSitterState();
  renderSitterFollowup();
  showSitterToast("Avtalen er lagret på denne enheten.");
});
sitterEls.reset.addEventListener("click", () => {
  if (!window.confirm("Nullstill alle lokale Sitter-data?")) return;
  sitterState.data = createSitterSeedState();
  sitterState.session = null;
  sitterState.pendingResult = null;
  saveSitterState();
  setSitterScreen("home");
  showSitterToast("Sitter er nullstilt.");
});

const sitterInitialScreen = sitterState.pendingResult ? "result"
  : sitterState.session && !sitterState.session.completed ? "session"
    : "home";
renderSitterPackageIdentity();
setSitterScreen(sitterInitialScreen);

window.SitterTest = {
  SITTER_PACKAGE,
  SITTER_GRADE_LEVEL,
  SITTER_STORAGE_KEY,
  SITTER_LEGACY_STORAGE_KEY,
  createSitterSeedState,
  evaluateSitterAnswer,
  normalizeSitterAnswer,
  normalizeSitterSettings,
  normalizeSitterState,
  sitterStage,
  sitterProgress,
  formatHomeCountdown,
  selectedSubjectSummary,
  homeStageSummary,
  scrollHomeSubjectIntoView,
  premiumRewardVariant,
  renderSitterHome,
  renderSitterResult,
  startSitterSession,
  checkSitterAnswer,
  commitSitterResult,
  continueSitterSession,
  toggleSitterSubject,
  setSitterMenuOpen,
  setHomeHeroFlipped,
  getState: () => sitterState
};
