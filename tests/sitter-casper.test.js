const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Core = require("../retention-core.js");
const Mechanics = require("../sitter-mechanics.js");

function loadCurriculumFile(filename, globalName) {
  const source = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename });
  return sandbox.window[globalName];
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

function loadSitterApp({ search = "", includeCasper = true, initialStorage = [] } = {}) {
  const curriculum = loadCurriculumFile("sitter-curriculum.js", "SITTER_CURRICULUM");
  const casperCurriculum = includeCasper
    ? loadCurriculumFile("sitter-curriculum-casper.js", "SITTER_CURRICULUM_CASPER")
    : null;
  const source = fs.readFileSync(path.join(__dirname, "..", "sitter-app.js"), "utf8");
  const elements = new Map();
  const screens = ["home", "session", "result", "complete", "memory", "history", "followup", "empty"]
    .map((screenName) => fakeElement({ screenName }));
  const nav = ["home", "memory", "followup"].map((go) => fakeElement({ go }));
  const storage = new Map(initialStorage);
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
      location: { search },
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
  if (casperCurriculum) sandbox.window.SITTER_CURRICULUM_CASPER = casperCurriculum;
  vm.runInNewContext(source, sandbox, { filename: "sitter-app.js" });
  return { api: sandbox.window.SitterTest, curriculum, casperCurriculum, elements, storage };
}

test("Casper curriculum is a valid, answerable 3rd grade package", () => {
  const casper = loadCurriculumFile("sitter-curriculum-casper.js", "SITTER_CURRICULUM_CASPER");
  const standard = loadCurriculumFile("sitter-curriculum.js", "SITTER_CURRICULUM");

  assert.deepEqual(Array.from(casper.gradeLevels), [3]);
  assert.equal(casper.version, 3);
  assert.equal(casper.cards.length, 60);
  assert.deepEqual(
    Array.from(casper.decks, (deck) => deck.deck),
    Array.from(standard.decks, (deck) => deck.deck)
  );

  const ids = new Set();
  const deckNames = new Set(casper.decks.map((deck) => deck.deck));
  const deckCounts = new Map(casper.decks.map((deck) => [deck.deck, 0]));
  for (const card of casper.cards) {
    assert.ok(card.id && !ids.has(card.id), `unique id: ${card.id}`);
    ids.add(card.id);
    assert.ok(deckNames.has(card.deck), `known deck: ${card.id}`);
    assert.ok(card.front && card.back, `front/back set: ${card.id}`);
    assert.ok(
      Array.isArray(card.acceptedAnswers) && card.acceptedAnswers.length > 0,
      `answerable: ${card.id}`
    );
    deckCounts.set(card.deck, deckCounts.get(card.deck) + 1);
  }
  assert.deepEqual(Array.from(deckCounts.values()), [12, 12, 12, 12, 12]);
  assert.equal(casper.cards.filter((card) => card.tags.includes("sett-2")).length, 30);

  const standardIds = new Set(standard.cards.map((card) => card.id));
  for (const card of casper.cards) {
    assert.equal(standardIds.has(card.id), false, `no id collision with standard pack: ${card.id}`);
  }
});

test("Casper v3 covers the agreed foundation before curriculum breadth", () => {
  const casper = loadCurriculumFile("sitter-curriculum-casper.js", "SITTER_CURRICULUM_CASPER");
  const ids = new Set(casper.cards.map((card) => card.id));
  const requiredFoundation = [
    "casper-matte-tallinje-førti",
    "casper-matte-posisjonssystem",
    "casper-matte-storst-tall",
    "casper-matte-halvparten-diamanter",
    "casper-matte-partall-fjorten",
    "casper-norsk-lydsyntese-sol",
    "casper-norsk-forstelyd-maane",
    "casper-norsk-vokal-sverd",
    "casper-norsk-stavelser-mario",
    "casper-norsk-hoyfrekvent-og",
    "casper-norsk-lese-lue",
    "casper-norsk-sistelyd-sol",
    "casper-engelsk-please",
    "casper-engelsk-thank-you",
    "casper-engelsk-your-name",
    "casper-naturfag-vaske-hender",
    "casper-naturfag-regn-skyer",
    "casper-samfunn-samene-urfolk",
    "casper-samfunn-barns-rett-skole"
  ];

  for (const id of requiredFoundation) assert.ok(ids.has(id), `foundation card present: ${id}`);
  assert.ok(casper.cards.filter((card) => card.tags.includes("lesegrunnmur")).length >= 7);
  assert.ok(casper.cards.filter((card) => card.tags.includes("grunnmur")).length >= 15);
  assert.equal(casper.cards.filter((card) => card.answerKeywords && !card.requiredKeywords).length, 0);
});

test("Casper v3 accepts every documented variant and rejects representative wrong answers", () => {
  const { api, casperCurriculum } = loadSitterApp({ search: "?pakke=casper" });
  const cards = new Map(casperCurriculum.cards.map((card) => [card.id, card]));

  for (const card of casperCurriculum.cards) {
    for (const answer of card.acceptedAnswers) {
      assert.equal(
        api.evaluateSitterAnswer(card, answer).grade,
        "good",
        `documented answer works: ${card.id} → ${answer}`
      );
    }
  }

  const wrongAnswers = [
    ["casper-matte-tallinje-førti", "39"],
    ["casper-matte-posisjonssystem", "7"],
    ["casper-matte-storst-tall", "38"],
    ["casper-matte-halvparten-diamanter", "8"],
    ["casper-matte-partall-fjorten", "oddetall"],
    ["casper-norsk-lydsyntese-sol", "som"],
    ["casper-norsk-forstelyd-maane", "n"],
    ["casper-norsk-vokal-sverd", "v"],
    ["casper-norsk-stavelser-mario", "2"],
    ["casper-norsk-hoyfrekvent-og", "jeg"],
    ["casper-norsk-lese-lue", "blå"],
    ["casper-norsk-sistelyd-sol", "s"],
    ["casper-engelsk-please", "sorry"],
    ["casper-engelsk-thank-you", "hello"],
    ["casper-engelsk-your-name", "hva gjør du"],
    ["casper-naturfag-aarstid-etter-vinter", "høst"],
    ["casper-naturfag-sans-hore", "øynene"],
    ["casper-naturfag-regn-skyer", "bakken"],
    ["casper-samfunn-samene-urfolk", "nordmenn"],
    ["casper-samfunn-barns-rett-skole", "nei"]
  ];

  for (const [id, answer] of wrongAnswers) {
    assert.equal(api.evaluateSitterAnswer(cards.get(id), answer).grade, "again", `wrong answer rejected: ${id}`);
  }
});

test("standard package stays default without the pakke param", () => {
  const { api, elements } = loadSitterApp({ search: "" });
  assert.equal(api.SITTER_PACKAGE, "standard");
  assert.equal(api.SITTER_GRADE_LEVEL, 4);
  assert.equal(api.SITTER_STORAGE_KEY, "sitter-mvp-v1");
  assert.equal(elements.get("#sitterGradeLabel").textContent, "4. klasse");
  const state = api.getState();
  assert.ok(state.data.cards.every((card) => !card.id.startsWith("casper-")));
});

test("pakke=casper selects the Casper package with isolated storage", () => {
  const { api, casperCurriculum, elements, storage } = loadSitterApp({ search: "?pakke=casper" });
  assert.equal(api.SITTER_PACKAGE, "casper");
  assert.equal(api.SITTER_GRADE_LEVEL, 3);
  assert.equal(api.SITTER_STORAGE_KEY, "sitter-casper-v3");
  assert.equal(elements.get("#sitterGradeLabel").textContent, "3. klasse");
  assert.equal(elements.get("#followupGradeLabel").textContent, "3. klasse");
  assert.match(elements.get("#followupSourceNote").textContent, /3\. trinn-nivå/);
  assert.equal(elements.get("#subjectPickerTitle").textContent, "Casper sin pakke · 60 spørsmål");
  assert.equal(elements.get("#subjectPickerHelp").textContent, "Velg ett fag eller alle.");
  assert.equal(elements.get("#homeReadyPill").textContent, "60 oppgaver nå");

  const state = api.getState();
  assert.equal(state.data.settings.gradeLevel, 3);
  assert.equal(state.data.cards.length, casperCurriculum.cards.length);
  assert.ok(state.data.cards.every((card) => card.id.startsWith("casper-")));
  assert.equal(storage.has("sitter-mvp-v1"), false);

  const marioCard = casperCurriculum.cards.find((card) => card.id === "casper-matte-mario-mynter");
  assert.equal(api.evaluateSitterAnswer(marioCard, "12").grade, "good");
  assert.equal(api.evaluateSitterAnswer(marioCard, "13").grade, "again");
  for (const card of casperCurriculum.cards) {
    assert.equal(
      api.evaluateSitterAnswer(card, card.acceptedAnswers[0]).grade,
      "good",
      `first accepted answer works: ${card.id}`
    );
  }
});

test("Casper can switch subjects with one tap and starts only that queue", () => {
  const { api, elements } = loadSitterApp({ search: "?pakke=casper" });

  api.toggleSitterSubject("Matte");
  assert.deepEqual(Array.from(api.getState().data.settings.activeDecks), ["Matte"]);
  assert.equal(elements.get("#homeReadyPill").textContent, "12 oppgaver nå");
  assert.equal(elements.get("#homeStartTitle").textContent, "Matematikk.");

  api.toggleSitterSubject("Norsk");
  assert.deepEqual(Array.from(api.getState().data.settings.activeDecks), ["Norsk"]);
  assert.equal(elements.get("#homeReadyPill").textContent, "12 oppgaver nå");
  assert.match(elements.get("#homeSubjects").innerHTML, /subject-earmark is-selected[^>]+data-subject-select="Norsk"[^>]+aria-pressed="true"/);
  assert.equal(elements.get("#homeSubjects").innerHTML.includes('is-selected" type="button" data-subject-select="Matte"'), false);

  api.startSitterSession();
  const state = api.getState();
  const sessionCards = state.session.cardIds.map((id) => state.data.cards.find((card) => card.id === id));
  assert.equal(sessionCards.length, 5);
  assert.ok(sessionCards.every((card) => card.deck === "Norsk" && card.id.startsWith("casper-")));
});

test("Casper subject choice replaces an unfinished queue before the CTA starts", () => {
  const { api, elements } = loadSitterApp({ search: "?pakke=casper" });

  api.startSitterSession();
  assert.deepEqual(Array.from(api.getState().session.selectedSubjectIds), ["Alle"]);

  api.toggleSitterSubject("Engelsk");
  assert.equal(api.getState().session, null);
  assert.equal(api.getState().pendingResult, null);
  assert.equal(elements.get("#startSitterSession").textContent, "Start økt →");

  api.startSitterSession();
  const state = api.getState();
  const sessionCards = state.session.cardIds.map((id) => state.data.cards.find((card) => card.id === id));
  assert.deepEqual(Array.from(state.session.selectedSubjectIds), ["Engelsk"]);
  assert.equal(sessionCards.length, 5);
  assert.ok(sessionCards.every((card) => card.deck === "Engelsk" && card.id.startsWith("casper-")));
});

test("Casper can return to all 60 questions and reveals the selected ear", () => {
  const { api, elements } = loadSitterApp({ search: "?pakke=casper" });
  const rail = elements.get("#homeSubjects");
  const allEar = { dataset: { subjectSelect: "Alle" }, offsetLeft: 310, offsetWidth: 90 };
  let scrollOptions = null;
  rail.clientWidth = 180;
  rail.scrollLeft = 0;
  rail.querySelectorAll = () => [allEar];
  rail.scrollTo = (options) => { scrollOptions = options; };

  api.toggleSitterSubject("Matte");
  api.toggleSitterSubject("Alle");

  assert.deepEqual(Array.from(api.getState().data.settings.activeDecks), ["Alle"]);
  assert.equal(elements.get("#homeReadyPill").textContent, "60 oppgaver nå");
  assert.equal(api.getState().data.cards.length, 60);
  assert.ok(api.getState().data.cards.every((card) => card.id.startsWith("casper-")));
  assert.equal(scrollOptions.left, 232);
  assert.equal(scrollOptions.behavior, "smooth");
});

test("Casper v3 starts fresh without deleting the previous pilot progress", () => {
  const first = loadSitterApp({ search: "?pakke=casper" });
  const saved = first.api.getState().data;
  const tomorrow = Date.now() + 86_400_000;
  saved.curriculumVersion = 2;
  saved.cards = saved.cards.slice(0, 30).map((card) => ({ ...card, dueAt: tomorrow }));
  saved.cards[0].stage = 2;
  first.storage.set("sitter-casper-v2", JSON.stringify(saved));
  first.storage.set("sitter-mvp-v1", JSON.stringify({ ...saved, createdAt: 1, cards: [] }));

  const reloaded = loadSitterApp({
    search: "?pakke=casper",
    initialStorage: first.storage
  });

  assert.equal(reloaded.api.getState().data.cards[0].stage, 0);
  assert.equal(reloaded.api.getState().data.cards.length, 60);
  assert.equal(reloaded.api.getState().data.curriculumVersion, 3);
  assert.equal(reloaded.elements.get("#homeReadyPill").textContent, "60 oppgaver nå");
  assert.ok(reloaded.api.getState().data.cards.every((card) => card.stage === 0 && card.dueAt <= Date.now()));
  assert.equal(reloaded.storage.get("sitter-casper-v2"), first.storage.get("sitter-casper-v2"));
  assert.equal(reloaded.api.SITTER_STORAGE_KEY, "sitter-casper-v3");
  assert.notEqual(reloaded.api.getState().data.createdAt, 1);
  assert.equal(reloaded.storage.get("sitter-mvp-v1"), first.storage.get("sitter-mvp-v1"));
});

test("pakke=casper falls back to standard when the Casper pack is missing", () => {
  const { api } = loadSitterApp({ search: "?pakke=casper", includeCasper: false });
  assert.equal(api.SITTER_PACKAGE, "standard");
  assert.equal(api.SITTER_STORAGE_KEY, "sitter-mvp-v1");
});
