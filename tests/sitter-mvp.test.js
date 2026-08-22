const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Core = require("../retention-core.js");
const Mechanics = require("../sitter-mechanics.js");

function loadSitterCurriculum() {
  const source = fs.readFileSync(path.join(__dirname, "..", "sitter-curriculum.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "sitter-curriculum.js" });
  return sandbox.window.SITTER_CURRICULUM;
}

function fakeElement(dataset = {}) {
  const attributes = new Map();
  return {
    attributes,
    dataset,
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {} },
    value: "",
    hidden: false,
    disabled: false,
    textContent: "",
    innerHTML: "",
    addEventListener() {},
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    focus() {}
  };
}

function loadSitterApp(legacyState = null, currentState = null) {
  const curriculum = loadSitterCurriculum();
  const source = fs.readFileSync(path.join(__dirname, "..", "sitter-app.js"), "utf8");
  const elements = new Map();
  const screens = ["home", "session", "result", "complete", "memory", "history", "followup", "empty"]
    .map((screenName) => fakeElement({ screenName }));
  const nav = ["home", "memory", "followup"].map((go) => fakeElement({ go }));
  const storage = new Map();
  if (legacyState) storage.set("casper-quest-retention-v1", JSON.stringify(legacyState));
  if (currentState) storage.set("sitter-mvp-v1", JSON.stringify(currentState));
  const getElement = (selector) => {
    if (!elements.has(selector)) elements.set(selector, fakeElement());
    return elements.get(selector);
  };
  const sandbox = {
    console,
    Date,
    Intl,
    window: {
      RetentionCore: Core,
      SitterMechanics: Mechanics,
      SITTER_CURRICULUM: curriculum,
      setTimeout: () => 1,
      clearTimeout() {},
      confirm: () => true,
      requestAnimationFrame: (callback) => callback(),
      scrollTo() {}
    },
    document: {
      querySelector: getElement,
      querySelectorAll(selector) {
        if (selector === "[data-screen-name]") return screens;
        if (selector === ".binder-tabs [data-go]") return nav;
        return [];
      },
      addEventListener() {}
    },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    }
  };
  vm.runInNewContext(source, sandbox, { filename: "sitter-app.js" });
  return { api: sandbox.window.SitterTest, curriculum, elements, storage };
}

test("Sitter MVP exposes the eight agreed product surfaces", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "sitter.html"), "utf8");
  const screens = [...html.matchAll(/data-screen-name="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(screens, ["home", "session", "result", "complete", "memory", "history", "followup", "empty"]);
  assert.match(html, /Hjem/);
  assert.match(html, /<span>Sitter<\/span>/);
  assert.match(html, /id="sitterMenuToggle"/);
  assert.match(html, /class="menu-label">Meny<\/span>/);
  assert.match(html, /class="menu-close-mark"[^>]*>×<\/span>/);
  assert.match(html, /id="sitterPrimaryNav"[\s\S]*?aria-hidden="true"[\s\S]*?inert/);
  assert.equal(html.includes("class=\"sitter-profile\""), false);
  assert.match(html, /Langtidsminne/);
  assert.match(html, /Oppfølging/);
  assert.equal(html.includes("1.-10. klasse"), false);
});

test("Sitter explains the learning loop without requiring spaced-repetition knowledge", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "sitter.html"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "..", "sitter-styles.css"), "utf8");

  assert.match(html, /Du svarer\. Vi passer på resten\./);
  assert.match(html, /Oppgaven kommer tilbake/);
  assert.match(html, /<b>3<\/b> Neste gang/);
  assert.match(html, /id="resultReward"/);
  assert.match(html, /id="resultRewardMedia"/);
  assert.match(html, /id="premiumSoundToggle"/);
  assert.match(html, /id="premiumSkip"/);
  assert.match(html, /class="premium-transformation"/);
  assert.match(html, /id="resultNextReviewLabel"/);
  assert.match(html, /sitter-mechanics\.js/);
  assert.match(html, /id="memoryWeek"/);
  assert.match(html, /class="subject-earmarks" id="homeSubjects"/);
  assert.match(html, /<article class="start-card"[\s\S]*id="startSitterSession"/);
  assert.match(html, /class="start-card-inner"/);
  assert.match(html, /class="start-card-motion"/);
  assert.match(html, /class="start-card-slab"/);
  assert.equal((html.match(/--slab-z:/g) || []).length, 11);
  assert.match(html, /id="homeHeroFront"/);
  assert.match(html, /id="homeHeroBack"/);
  assert.match(html, /id="showHeroProgress"/);
  assert.match(html, /id="hideHeroProgress"/);
  assert.equal(html.includes("subjectSelectionDock"), false);
  assert.match(html, /id="dismissHowSitterWorks"/);
  assert.match(html, /id="openHowSitterWorks"/);
  assert.match(html, /Se svar og tidspunkt/);
  assert.match(styles, /100dvh/);
  assert.match(styles, /--result-green/);
  assert.match(styles, /@keyframes result-pop/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /data-reward="week"/);
  assert.match(styles, /data-reward="sitter"/);
  assert.match(styles, /\.subject-earmark \+ \.subject-earmark \{[\s\S]*?margin-left: -10px/);
  assert.match(styles, /\.subject-earmarks \{[\s\S]*?margin: 0 clamp\(42px, 4\.8vw, 54px\) -22px/);
  assert.match(styles, /\.subject-earmarks \{[\s\S]*?top: -63px/);
  assert.match(styles, /\.subject-earmark\.is-selected \{[\s\S]*?min-height: 68px/);
  assert.match(styles, /\.subject-earmark \{[\s\S]*?border-radius: 14px 14px 9px 9px/);
  assert.match(styles, /\.subject-earmark::after \{[\s\S]*?bottom: -4px[\s\S]*?border-radius: 0 0 8px 8px/);
  assert.match(styles, /\.start-card \{[\s\S]*?z-index: 2/);
  assert.match(styles, /\.sitter-app\.menu-open \.binder-tabs \{[\s\S]*?visibility: visible/);
  assert.match(styles, /\.binder-tabs \{[\s\S]*?left: 50%[\s\S]*?background: var\(--paper-strong\)/);
  assert.match(styles, /\.binder-tabs button \{[\s\S]*?text-align: center/);
  assert.match(styles, /\.sitter-menu-toggle\.is-open \.menu-close-mark \{[\s\S]*?opacity: 1/);
  assert.match(styles, /perspective: 1250px/);
  assert.match(styles, /transform: rotateY\(180deg\)/);
  assert.match(styles, /backface-visibility: hidden/);
  assert.match(styles, /--card-depth: 36px/);
  assert.match(styles, /\.start-card-slab i \{[\s\S]*?translateZ\(var\(--slab-z\)\)/);
  assert.match(styles, /--home-flip-duration: 1040ms/);
  assert.match(styles, /--home-flip-ease: cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
  assert.match(styles, /transition: transform var\(--home-flip-duration\) var\(--home-flip-ease\)/);
  assert.match(styles, /\.start-card-front \{[\s\S]*?translateZ\(calc\(var\(--card-depth\) \/ 2\)\)/);
  assert.match(styles, /rotateY\(180deg\) translateZ\(calc\(var\(--card-depth\) \/ 2\)\)/);
  assert.match(styles, /\.start-card\.is-turning \.start-card-motion \{[\s\S]*?z-index: 8/);
  assert.match(styles, /\.subject-earmarks \{[\s\S]*?z-index: 0/);
  assert.match(styles, /@keyframes home-card-lift-settle[\s\S]*?48%[\s\S]*?translate3d\(0, -28px, 0\)[\s\S]*?90%[\s\S]*?scale\(0\.99\)/);
  assert.match(styles, /@keyframes subject-ears-recede[\s\S]*?translate3d\(0, 8px, 0\)[\s\S]*?scale\(0\.965\)/);
  assert.equal(styles.includes("@keyframes card-flip-sheen"), false);
  assert.match(styles, /\.sitter-wordmark span \{[\s\S]*?color: #a64e79[\s\S]*?5px 5px 0 #592344/);
  assert.equal(styles.includes("background-clip: text"), false);
  assert.equal(styles.includes("content: attr(data-text)"), false);
  assert.match(styles, /@keyframes screen-followup-enter/);
  assert.match(styles, /\.sitter-screen:not\(\[hidden\]\) \{[\s\S]*?animation: screen-followup-enter 420ms/);
  assert.equal(styles.includes("@keyframes screen-home-enter"), false);
  assert.equal(styles.includes("@keyframes screen-memory-enter"), false);
  assert.match(styles, /\.start-card-face\[aria-hidden="true"\] \{[\s\S]*?pointer-events: none/);
  assert.match(styles, /\.start-card-slab \{[\s\S]*?pointer-events: none/);
  assert.match(styles, /\.start-card-face::after \{[\s\S]*?pointer-events: none/);
  assert.match(styles, /\.start-card-copy \{[\s\S]*?z-index: 3/);
  assert.match(styles, /\.hero-flip-button \{[\s\S]*?touch-action: manipulation/);
  assert.equal(html.includes("POWER UP"), false);
  assert.equal(html.includes("⚡"), false);
});

test("Sitter curriculum is deliberately limited to 4th grade", () => {
  const curriculum = loadSitterCurriculum();

  assert.deepEqual(Array.from(curriculum.gradeLevels), [4]);
  assert.equal(curriculum.title, "Sitter — 4. klasse");
  assert.equal(curriculum.cards.length >= 30, true);
  assert.equal(curriculum.cards.every((card) => card.importance === "Grunnmur" || card.importance === "Viktig"), true);
});

test("Sitter boots with a fresh local state and reuses the retention core", () => {
  const { api, curriculum } = loadSitterApp();
  const seed = api.createSitterSeedState(1000);
  const mathCard = curriculum.cards.find((card) => card.id === "kid-grade4-math-half-48");

  assert.equal(seed.app, "sitter");
  assert.equal(seed.settings.gradeLevel, 4);
  assert.deepEqual(Array.from(seed.settings.activeDecks), ["Alle"]);
  assert.equal(seed.cards.length, curriculum.cards.length);
  assert.equal(api.evaluateSitterAnswer(mathCard, "24").grade, "good");
  assert.equal(api.evaluateSitterAnswer(mathCard, "12").grade, "again");
});

test("Sitter migrates legacy Hukomm data without deleting the original", () => {
  const legacy = {
    schemaVersion: 1,
    app: "hukomm",
    settings: { gradeLevel: 4, activeDeck: "Norsk", sessionTarget: 8, contractMode: "reward", rewardText: "20 min skjermtid" },
    cards: []
  };
  const { storage } = loadSitterApp(legacy);
  const migrated = JSON.parse(storage.get("sitter-mvp-v1"));

  assert.equal(migrated.app, "sitter");
  assert.equal(migrated.migratedFrom, "casper-quest-retention-v1");
  assert.equal(migrated.settings.sessionTarget, 8);
  assert.equal(storage.has("casper-quest-retention-v1"), true);
});

test("Sitter persists a pending result and resumes it after reload", () => {
  const first = loadSitterApp();
  first.api.startSitterSession();
  const firstState = first.api.getState();
  const cardId = firstState.session.cardIds[firstState.session.index];
  const card = firstState.data.cards.find((item) => item.id === cardId);
  first.elements.get("#sitterAnswer").value = card.acceptedAnswers[0];
  first.api.checkSitterAnswer();

  const saved = JSON.parse(first.storage.get("sitter-mvp-v1"));
  assert.equal(Boolean(saved.activeSession?.pendingResult), true);

  const resumed = loadSitterApp(null, saved);
  assert.equal(resumed.api.getState().screen, "result");
  assert.equal(resumed.api.getState().pendingResult.card.id, cardId);
  resumed.api.continueSitterSession();
  assert.equal(resumed.api.getState().pendingResult, null);
});

test("Sitter requeues a failed card after other cards", () => {
  const { api, elements } = loadSitterApp();
  api.startSitterSession();
  const state = api.getState();
  const failedId = state.session.cardIds[0];
  const initialLength = state.session.cardIds.length;
  elements.get("#sitterAnswer").value = "helt feil svar";
  api.checkSitterAnswer();
  api.continueSitterSession();

  assert.equal(state.session.cardIds.length, initialLength + 1);
  assert.equal(state.session.cardIds[3], failedId);
  const failedCard = state.data.cards.find((card) => card.id === failedId);
  assert.equal(failedCard.history.at(-1).outcome, "wrong");
  assert.equal(failedCard.stage, 0);
  assert.equal(failedCard.dueAt <= Date.now(), true);
});

test("Sitter supports selecting several subjects", () => {
  const { api, elements } = loadSitterApp();
  api.toggleSitterSubject("Matte");
  api.toggleSitterSubject("Norsk");

  assert.deepEqual(Array.from(api.getState().data.settings.activeDecks), ["Matte", "Norsk"]);
  assert.equal(elements.get("#selectedSubjectCount").textContent, "2 fag valgt");
  assert.equal(elements.get("#selectedSubjectNames").textContent, "Matematikk + Norsk");
  assert.equal(elements.get("#homeStartTitle").textContent, "Matematikk + Norsk.");
  assert.match(elements.get("#homeSubjects").innerHTML, /subject-earmark is-selected[^>]+data-subject-select="Matte"[^>]+aria-pressed="true"/);
  assert.match(elements.get("#homeSubjects").innerHTML, /subject-earmark is-selected[^>]+data-subject-select="Norsk"[^>]+aria-pressed="true"/);
  assert.match(elements.get("#homeSubjects").innerHTML, /<strong>Matte<\/strong>/);
  assert.equal(elements.get("#homeSubjects").innerHTML.includes("<strong>Matematikk</strong>"), false);
  assert.equal(elements.get("#homeSubjects").innerHTML.includes("subject-earmark-mark"), false);
});

test("Sitter scrolls the selected subject ear into horizontal view", () => {
  const { api, elements } = loadSitterApp();
  const rail = elements.get("#homeSubjects");
  const selectedEar = { dataset: { subjectSelect: "Alle" }, offsetLeft: 150, offsetWidth: 70 };
  let scrollOptions = null;
  rail.clientWidth = 160;
  rail.scrollLeft = 0;
  rail.querySelectorAll = () => [selectedEar];
  rail.scrollTo = (options) => { scrollOptions = options; };

  api.scrollHomeSubjectIntoView("Alle", "smooth");

  assert.equal(scrollOptions.left, 72);
  assert.equal(scrollOptions.behavior, "smooth");
});

test("Sitter makes a single subject the identity of the Home hero", () => {
  const { api, elements } = loadSitterApp();
  api.toggleSitterSubject("Norsk");

  assert.equal(elements.get("#selectedSubjectCount").textContent, "1 fag valgt");
  assert.equal(elements.get("#homeStartTitle").textContent, "Norsk.");
  assert.equal(elements.get("#homeReadyPill").textContent, "6 oppgaver nå");
  assert.equal(elements.get("#startSitterSession").hidden, false);
  assert.equal(elements.get("#homeSubjects").innerHTML.trim().endsWith("</button>"), true);
  assert.equal(elements.get("#homeSubjects").innerHTML.lastIndexOf('data-subject-select="Alle"') > elements.get("#homeSubjects").innerHTML.lastIndexOf('data-subject-select="Samfunn"'), true);
});

test("Sitter flips the Home hero as a five-stage 3D progress card", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "sitter-app.js"), "utf8");
  const { api, elements } = loadSitterApp();
  const stages = api.homeStageSummary();

  assert.deepEqual(Array.from(stages, (stage) => stage.label), ["Nå", "1 time", "1 dag", "1 uke", "Sitter"]);
  assert.equal(stages.reduce((total, stage) => total + stage.count, 0), 30);

  api.setHomeHeroFlipped(true);
  assert.equal(api.getState().homeHeroFlipped, true);
  assert.equal(elements.get("#showHeroProgress").attributes.get("aria-expanded"), "true");
  assert.equal(elements.get("#homeHeroFront").attributes.get("aria-hidden"), "true");
  assert.equal(elements.get("#homeHeroBack").attributes.get("aria-hidden"), "false");

  api.setHomeHeroFlipped(false);
  assert.equal(api.getState().homeHeroFlipped, false);
  assert.equal(elements.get("#homeHeroBack").attributes.get("aria-hidden"), "true");
  assert.match(appSource, /HOME_HERO_FLIP_MS = 1040/);
  assert.match(appSource, /setTimeout\(finishFlip, HOME_HERO_FLIP_MS\)/);
});

test("Sitter hamburger opens as an accessible nav and closes back to an X-free state", () => {
  const { api, elements } = loadSitterApp();
  const toggle = elements.get("#sitterMenuToggle");
  const nav = elements.get("#sitterPrimaryNav");

  api.setSitterMenuOpen(true);
  assert.equal(api.getState().menuOpen, true);
  assert.equal(toggle.attributes.get("aria-expanded"), "true");
  assert.equal(toggle.attributes.get("aria-label"), "Lukk meny");
  assert.equal(nav.attributes.get("aria-hidden"), "false");
  assert.equal(nav.attributes.has("inert"), false);

  api.setSitterMenuOpen(false);
  assert.equal(api.getState().menuOpen, false);
  assert.equal(toggle.attributes.get("aria-expanded"), "false");
  assert.equal(nav.attributes.get("aria-hidden"), "true");
  assert.equal(nav.attributes.has("inert"), true);
});

test("Sitter summarizes all subjects without clipping a subject-name list", () => {
  const { api } = loadSitterApp();
  const summary = api.selectedSubjectSummary(api.getState().data.settings, 30);

  assert.equal(summary.count, "Blandet økt");
  assert.equal(summary.names, "Alle fag");
});

test("Sitter standard reward keeps its signature copy without repetition", () => {
  const { api, elements } = loadSitterApp();
  api.startSitterSession();
  const state = api.getState();
  const card = state.data.cards.find((item) => item.id === state.session.cardIds[0]);
  elements.get("#sitterAnswer").value = card.acceptedAnswers[0];
  api.checkSitterAnswer();

  assert.equal(elements.get("#resultEyebrow").textContent, "Hentet frem");
  assert.equal(elements.get("#resultTitle").textContent, "Den satt.");
  assert.equal(elements.get("#resultRewardStage").textContent, "Neste stopp: 1 time");
  assert.equal(elements.get("#resultRewardText").textContent.includes("1 time"), false);
});

test("Sitter premium reward uses a curated original transformation variant", () => {
  const { api, elements } = loadSitterApp();
  const state = api.getState();
  const card = { ...state.data.cards[0], stage: 3 };
  state.pendingResult = {
    card,
    answer: card.acceptedAnswers[0],
    result: { grade: "good", label: "Riktig", message: "Du hentet frem riktig svar." },
    scheduled: {
      card: { ...card, stage: 4 },
      intervalMs: 30 * 24 * 60 * 60 * 1000,
      rewardEvent: "promoted_to_month_sitter"
    }
  };
  api.renderSitterResult();
  const variant = api.premiumRewardVariant(card);

  assert.equal(["binder", "month", "memory"].includes(variant.key), true);
  assert.equal(elements.get("#resultMark").textContent, "");
  assert.equal(elements.get("#resultEyebrow").textContent, "SUPER SITTER");
  assert.equal(elements.get("#premiumSceneTitle").textContent, variant.title);
  assert.equal(elements.get("#premiumSceneCaption").textContent, variant.caption);
});

test("Sitter Home celebrates an empty queue and counts down to the next question", () => {
  const { api, elements } = loadSitterApp();
  const state = api.getState();
  const nextHour = Date.now() + 60 * 60 * 1000;
  state.data.cards = state.data.cards.map((card) => ({ ...card, dueAt: nextHour }));
  state.session = null;
  api.renderSitterHome();

  assert.equal(elements.get("#homeReadyPill").textContent, "Dagens kø er ryddet");
  assert.equal(elements.get("#homeStartTitle").textContent, "Alt ryddet. Hjernen jobber videre.");
  assert.equal(elements.get("#homeHeroLabel").textContent, "til neste");
  assert.match(elements.get("#startSitterSession").textContent, /Se hva som er på vei/);
});

test("Sitter remembers when the learning explainer is dismissed", () => {
  const { api } = loadSitterApp();
  const settings = api.normalizeSitterSettings({ howItWorksDismissed: true });

  assert.equal(settings.howItWorksDismissed, true);
});
