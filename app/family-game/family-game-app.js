(function startFamilyGame() {
  const Core = window.FamilyGameCore;
  const Content = window.FAMILY_GAME_CONTENT;
  if (!Core || !Content) throw new Error("Family Game dependencies are missing");

  const config = {
    eyebrow: Content.ui?.eyebrow || "Er du smartere enn barnet ditt?",
    gradeLabel: Content.ui?.gradeLabel || "3. trinn",
    lede: Content.ui?.lede || "To spillere. Én telefon. Casper lærer mens dere spiller.",
    matchSize: Content.matchSize || 4,
    packageLabel: Content.ui?.packageLabel || "Casper-pakken · godkjent pilot",
    resetConfirm: Content.ui?.resetConfirm || "Nullstille Family Game på denne enheten?",
    roundCopy: Content.ui?.roundCopy || "Ingen antallsvelger. Sitter trekker en kort runde fra valgt fag.",
    safetyLine: Content.ui?.safetyLine || "Poengene viser kampen, ikke hvem som er smartest.",
    title: Content.ui?.title || "Gjør dere klare."
  };
  const storage = Core.createGameStorage({ storage: window.localStorage, storeKey: Content.storeKey || Core.STORE_KEY });
  const params = new URLSearchParams(window.location.search);
  let state = params.get("reset") === "1" ? storage.reset() : storage.load().state;
  let setup = {
    adjudicationMode: "consensus",
    challengerProfileId: "profile-rune",
    gradeLevel: Content.targetGrade || 3,
    matchSize: config.matchSize,
    subject: "Alle fag"
  };
  let activeView = "setup";

  const app = document.getElementById("gameApp");
  const cardFace = document.getElementById("cardFace");
  const gameMenu = document.getElementById("gameMenu");
  const intro = document.getElementById("intro");
  const playerEarmarks = document.getElementById("playerEarmarks");
  const saveStatus = document.getElementById("saveStatus");
  const scorebar = document.getElementById("scorebar");
  const solidCard = document.getElementById("solidCard");
  const stateEyebrow = document.getElementById("stateEyebrow");
  const stateLede = document.getElementById("stateLede");
  const stateTitle = document.getElementById("stateTitle");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
  }

  function profile(profileId) {
    return Core.getProfile(state, profileId);
  }

  function activeMatch() {
    return Core.getMatch(state);
  }

  function persist(nextState) {
    const result = storage.save(nextState);
    if (!result.ok) {
      saveStatus.textContent = "Kunne ikke lagre lokalt. Ingen delvis læringsendring ble skrevet.";
      throw result.error;
    }
    state = result.state;
    saveStatus.textContent = "Lagret på denne enheten";
    window.setTimeout(() => { saveStatus.textContent = ""; }, 1400);
  }

  function setIntro(eyebrow, title, lede, gameplay = false) {
    app.classList.toggle("is-gameplay", gameplay);
    intro.hidden = gameplay;
    stateEyebrow.textContent = eyebrow;
    stateTitle.textContent = title;
    stateLede.textContent = lede;
  }

  function player(name, initial, score, color, isActive) {
    return `<div class="score-player ${isActive ? "is-active" : ""}" style="--player:${color}"><b>${escapeHtml(initial)}</b><span>${escapeHtml(name)}</span><strong>${score}</strong></div>`;
  }

  function earmark(name, role, color, isActive) {
    return `<div class="player-ear ${isActive ? "is-active" : ""}" style="--player:${color}"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(role)}</small></div>`;
  }

  function renderPlayers(activeProfileId = null) {
    const match = activeMatch();
    const learner = profile(match?.learnerProfileId || "profile-casper");
    const challenger = profile(match?.players.find((item) => item.profileId !== learner.profileId)?.profileId || setup.challengerProfileId);
    const learnerScore = match?.players.find((item) => item.profileId === learner.profileId)?.score || 0;
    const challengerScore = match?.players.find((item) => item.profileId === challenger.profileId)?.score || 0;
    const learnerActive = !activeProfileId || activeProfileId === learner.profileId;
    const challengerActive = !activeProfileId || activeProfileId === challenger.profileId;
    scorebar.innerHTML = player(learner.displayName, learner.displayName[0], learnerScore, "var(--green)", learnerActive)
      + '<span class="score-divider">mot</span>'
      + player(challenger.displayName, challenger.displayName[0], challengerScore, "var(--blue)", challengerActive);
    playerEarmarks.innerHTML = earmark(learner.displayName, "barn", "var(--green)", learnerActive)
      + earmark(challenger.displayName, "voksen", "var(--blue)", challengerActive);
  }

  function setCard(tone, body) {
    solidCard.className = "solid-card";
    solidCard.style.removeProperty("--card-color");
    if (tone === "setup") solidCard.classList.add("setup-card");
    else if (tone === "earned") solidCard.classList.add("earned-card");
    else if (tone === "result") solidCard.classList.add("result-card");
    else if (tone === "empty") solidCard.classList.add("empty-card");
    else {
      const colors = { blue: "var(--blue)", green: "var(--green)", magenta: "var(--magenta)" };
      solidCard.style.setProperty("--card-color", colors[tone] || "var(--green)");
    }
    cardFace.innerHTML = body;
    app.classList.remove("state-enter");
    requestAnimationFrame(() => app.classList.add("state-enter"));
  }

  function subjectLabel(subject) {
    return subject === "Alle fag" ? "Alle fag" : subject;
  }

  function renderSetup() {
    activeView = "setup";
    setIntro(config.eyebrow, config.title, config.lede);
    renderPlayers();
    const existing = activeMatch();
    const challengers = ["profile-rune", "profile-dag"].map((profileId) => {
      const opponent = profile(profileId);
      return `<button class="segment ${setup.challengerProfileId === profileId ? "is-selected" : ""}" style="--segment-color:var(--blue)" data-opponent="${profileId}" type="button"><strong>${escapeHtml(opponent.displayName)}</strong><small>voksen utfordrer</small></button>`;
    }).join("");
    const modes = [
      ["consensus", "Enige sammen", "Begge bekrefter dommen"],
      ["game_master", "Voksen bestemmer", "Kan velge «Usikker»"]
    ].map(([mode, title, note]) => `<button class="segment ${setup.adjudicationMode === mode ? "is-selected" : ""}" data-mode="${mode}" type="button"><strong>${title}</strong><small>${note}</small></button>`).join("");
    const subjects = ["Alle fag", ...Content.subjects].map((subject) => {
      const available = Core.eligibleFamilies(state, { gradeLevel: setup.gradeLevel, learnerProfileId: "profile-casper", subject }).length;
      return `<button class="subject-chip ${setup.subject === subject ? "is-selected" : ""}" data-subject="${escapeHtml(subject)}" type="button">${escapeHtml(subjectLabel(subject))} · ${available}</button>`;
    }).join("");
    const available = Core.eligibleFamilies(state, { ...setup, learnerProfileId: "profile-casper" }).length;
    const primary = existing?.status === "in_progress"
      ? '<button class="button dark" id="continueMatch" type="button">Fortsett kampen →</button><button class="button setup-secondary" id="abandonMatch" type="button">Avslutt og start på nytt</button>'
      : `<button class="button dark" id="startMatch" type="button" ${available ? "" : "disabled"}>${available ? "Start kampen →" : "Ingen spørsmål klare"}</button>`;
    setCard("setup", `
      <div class="card-content">
        <div class="card-kicker"><span>2 spillere</span><span>${escapeHtml(config.gradeLabel)} · uten skriving</span></div>
        <div class="setup-controls">
          <label class="setup-control"><span>Hvem utfordrer Casper?</span><div class="segment-grid">${challengers}</div></label>
          <label class="setup-control"><span>Hvem dømmer?</span><div class="segment-grid">${modes}</div></label>
          <label class="setup-control"><span>Klassetrinn</span><button class="segment is-selected grade-lock" type="button" aria-pressed="true"><strong>${escapeHtml(config.gradeLabel)}</strong><small>${escapeHtml(config.packageLabel)}</small></button></label>
          <label class="setup-control"><span>Fag</span><div class="subject-rail">${subjects}</div></label>
          <div class="setup-summary"><span>${escapeHtml(config.roundCopy)}</span><strong>${Math.min(available, config.matchSize)} av ${available} læringsmål i denne runden</strong></div>
          <p class="setup-safety">${escapeHtml(config.safetyLine)}</p>
        </div>
      </div>
      <div class="card-actions button-row">${primary}</div>`);
    document.querySelectorAll("[data-opponent]").forEach((button) => button.addEventListener("click", () => { setup.challengerProfileId = button.dataset.opponent; renderSetup(); }));
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { setup.adjudicationMode = button.dataset.mode; renderSetup(); }));
    document.querySelectorAll("[data-subject]").forEach((button) => button.addEventListener("click", () => { setup.subject = button.dataset.subject; renderSetup(); }));
    document.getElementById("startMatch")?.addEventListener("click", startNewMatch);
    document.getElementById("continueMatch")?.addEventListener("click", renderQuestion);
    document.getElementById("abandonMatch")?.addEventListener("click", () => { persist(Core.abandonMatch(state)); renderSetup(); });
  }

  function startNewMatch() {
    try {
      const started = Core.startMatch(state, setup);
      persist(started.state);
      renderQuestion();
    } catch (error) {
      saveStatus.textContent = error.message === "NO_DUE_ESSENTIALS" ? "Ingen spørsmål er klare i dette faget ennå." : "Kampen kunne ikke startes.";
    }
  }

  function turnCopy(turn) {
    const match = activeMatch();
    const actor = profile(turn.actorProfileId);
    if (turn.role === "adult_challenge") return { kicker: "Voksenutfordring", note: `Samme læringsmål, litt vanskeligere. ${profile(match.learnerProfileId).displayName} kan stjele.`, title: `${actor.displayName} sin tur` };
    if (turn.role === "comeback") return { kicker: "Comeback", note: "Ny formulering. Hent svaret frem uten hjelp.", title: `${actor.displayName} får den igjen` };
    return { kicker: "Svar høyt", note: `${profile(match.players.find((item) => item.profileId !== match.learnerProfileId).profileId).displayName} viser fasiten etterpå.`, title: `${actor.displayName} sin tur` };
  }

  function renderQuestion() {
    const match = activeMatch();
    if (!match) return renderSetup();
    if (match.status === "completed") return renderResult();
    const turn = Core.getCurrentTurn(state);
    if (!turn) {
      persist(Core.completeTurn(state, "noop"));
      return renderResult();
    }
    activeView = "question";
    const variant = Content.variants.find((item) => item.variantId === turn.variantId);
    const actor = profile(turn.actorProfileId);
    const copy = turnCopy(turn);
    const matchTotal = match.turnPlan.length + match.queue.filter((item) => !item.consumed).length;
    setIntro("", "", "", true);
    renderPlayers(actor.profileId);
    const canUseHelp = actor.profileId === match.learnerProfileId && turn.role !== "comeback";
    setCard(actor.profileId === match.learnerProfileId ? "green" : "blue", `
      <div class="card-content">
        <div class="card-kicker"><span class="turn-pill">${escapeHtml(copy.kicker)}</span><span>${match.completedTurnCount + 1} av ${matchTotal}</span></div>
        <p class="turn-progress">${escapeHtml(variant.subject || Content.families.find((family) => family.essentialId === turn.essentialId)?.subject)} · samme læringsmål</p>
        <h2 class="card-question">${escapeHtml(variant.prompt)}</h2>
        <div class="oral-lock"><b>◌</b><div><strong>Si svaret høyt</strong><small>Ingen skriving. Tenk ferdig i eget tempo.</small></div></div>
      </div>
      <div class="card-actions button-row">
        <button class="button primary" id="answerSpoken" type="button">Jeg har svart →</button>
        ${canUseHelp ? '<button class="button" id="askForHelp" type="button">Hjelp meg</button>' : ""}
        ${turn.role === "comeback" ? '<button class="button" id="showComeback" type="button">Vis meg</button>' : ""}
      </div>`);
    document.getElementById("answerSpoken").addEventListener("click", () => {
      const context = { actorProfileId: actor.profileId, attemptKind: "turn", helpStatus: "open", turn, variant };
      if (turn.role === "adult_challenge") renderAdultStealLock(context);
      else renderReveal(context);
    });
    document.getElementById("askForHelp")?.addEventListener("click", () => renderHelp(turn));
    document.getElementById("showComeback")?.addEventListener("click", () => applyJudgement({ actorProfileId: actor.profileId, attemptKind: "turn", helpStatus: "revealed", turn, variant }, "incorrect"));
  }

  function renderAdultStealLock(context) {
    activeView = "steal-lock";
    const match = activeMatch();
    const learner = profile(match.learnerProfileId);
    setIntro("", "", "", true);
    renderPlayers(learner.profileId);
    setCard("magenta", `
      <div class="card-content">
        <div class="card-kicker"><span class="turn-pill">Lås før fasit</span><span>Frivillig</span></div>
        <h2 class="card-question">${escapeHtml(learner.displayName)}, har du et annet svar?</h2>
        <div class="steal-banner"><b>↗</b><div><strong>Si svaret høyt nå</strong><small>Den voksnes svar er låst. Fasiten vises først etter at du har valgt.</small></div></div>
      </div>
      <div class="card-actions button-row"><button class="button primary" id="lockSteal" type="button">Jeg låser et svar →</button><button class="button" id="skipSteal" type="button">Stå over</button></div>`);
    document.getElementById("lockSteal").addEventListener("click", () => renderReveal({ ...context, stealLocked: true }));
    document.getElementById("skipSteal").addEventListener("click", () => renderReveal({ ...context, stealLocked: false }));
  }

  function renderHelp(turn) {
    activeView = "help";
    const match = activeMatch();
    const variant = Core.variantFor(turn.essentialId, "help");
    const actor = profile(match.learnerProfileId);
    setIntro("", "", "", true);
    renderPlayers(actor.profileId);
    setCard("green", `
      <div class="card-content">
        <div class="card-kicker"><span class="turn-pill">Hjelpetrinn 1</span><span>Nivået står</span></div>
        <h2 class="card-question">${escapeHtml(variant.prompt)}</h2>
        <div class="choice-list">${variant.helpOptions.map((option) => `<button class="choice" data-option="${option.id}" type="button"><b>${option.id}</b><span>${escapeHtml(option.label)}</span></button>`).join("")}</div>
      </div>
      <div class="card-actions button-row"><button class="button primary" id="revealHelp" type="button">Vis meg · prøv igjen senere</button></div>`);
    document.querySelectorAll("[data-option]").forEach((button) => button.addEventListener("click", () => {
      const selectedOption = variant.helpOptions.find((option) => option.id === button.dataset.option);
      renderReveal({ actorProfileId: actor.profileId, attemptKind: "turn", helpStatus: "aided", selectedOption, turn, variant });
    }));
    document.getElementById("revealHelp").addEventListener("click", () => applyJudgement({ actorProfileId: actor.profileId, attemptKind: "turn", helpStatus: "revealed", turn, variant }, "incorrect"));
  }

  function renderReveal(context) {
    activeView = "reveal";
    const match = activeMatch();
    const actor = profile(context.actorProfileId);
    const learnerAttempt = actor.profileId === match.learnerProfileId;
    const answer = Core.resolveCanonicalAnswer(context.variant, actor);
    const correctLabel = match.adjudicationMode === "consensus" ? "Begge: riktig" : "Riktig";
    const uncertainLabel = match.adjudicationMode === "consensus" ? "Uavklart" : "Usikker";
    const rubric = context.variant.rubric?.length
      ? `<div class="answer-rubric"><span>Vurder etter</span><ul>${context.variant.rubric.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
      : "";
    setIntro("", "", "", true);
    renderPlayers(actor.profileId);
    setCard(context.isSteal ? "magenta" : learnerAttempt ? "green" : "blue", `
      <div class="card-content">
        <div class="card-kicker"><span class="turn-pill">Sjekk sammen</span><span>${match.adjudicationMode === "consensus" ? "Begge bekrefter" : `${escapeHtml(profile(match.gameMasterProfileId)?.displayName)} dømmer`}</span></div>
        <h2 class="card-question">${escapeHtml(answer)}</h2>
        <div class="answer-panel"><span>Kanonisk fasit</span><strong>${escapeHtml(context.variant.explanation || answer)}</strong></div>
        ${rubric}
        ${context.selectedOption ? `<p class="answer-selected">Valgt svar: ${escapeHtml(context.selectedOption.label)}</p>` : ""}
        <div class="write-lanes">
          <div class="write-lane"><span>Kamppoeng</span><strong>Dommen teller</strong></div>
          <div class="write-lane"><span>Caspers minne</span><strong>${learnerAttempt ? "Kun ubestridt" : "Røres ikke av voksensvaret"}</strong></div>
        </div>
      </div>
      <div class="card-actions">
        <div class="judgement-grid"><button class="button primary" data-verdict="correct" type="button">${correctLabel} →</button></div>
        <div class="judgement-secondary"><button class="button" data-verdict="incorrect" type="button">Ikke ennå</button><button class="button" data-verdict="${match.adjudicationMode === "consensus" ? "disputed" : "unsure"}" type="button">${uncertainLabel}</button></div>
      </div>`);
    document.querySelectorAll("[data-verdict]").forEach((button) => button.addEventListener("click", () => applyJudgement(context, button.dataset.verdict)));
  }

  function applyJudgement(context, verdict) {
    const match = activeMatch();
    const isAdultOwnTurn = context.turn.role === "adult_challenge" && !context.isSteal;
    const attempt = {
      actorProfileId: context.actorProfileId,
      attemptId: `attempt:${match.matchId}:${context.turn.turnId}:${context.attemptKind}:${context.helpStatus}:${context.variant.variantId}`,
      attemptKind: context.attemptKind,
      essentialId: context.turn.essentialId,
      helpStatus: context.helpStatus,
      matchId: match.matchId,
      priorAttemptId: context.priorAttemptId || context.turn.priorAttemptId || null,
      priorOutcome: context.turn.priorOutcome || null,
      turnId: context.turn.turnId,
      variantId: context.variant.variantId,
      variantRole: context.turn.role === "comeback" ? "comeback" : context.variant.variantRole,
      verdict,
      wasDue: context.turn.wasDue
    };
    const applied = Core.applyAttempt(state, attempt);
    persist(applied.state);
    if (isAdultOwnTurn && context.stealLocked && verdict === "incorrect") return renderStealJudgement(context, applied);
    const completed = Core.completeTurn(state, context.turn.turnId);
    persist(completed);
    renderFeedback(applied, { turn: context.turn, verdict });
  }

  function renderStealJudgement(context, adultApplied) {
    activeView = "steal-judgement";
    const match = activeMatch();
    const learner = profile(match.learnerProfileId);
    const answer = Core.resolveCanonicalAnswer(context.variant, learner);
    const correctLabel = match.adjudicationMode === "consensus" ? "Begge: riktig" : "Riktig";
    const uncertainLabel = match.adjudicationMode === "consensus" ? "Uavklart" : "Usikker";
    const rubric = context.variant.rubric?.length
      ? `<div class="answer-rubric"><span>Vurder etter</span><ul>${context.variant.rubric.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
      : "";
    setIntro("", "", "", true);
    renderPlayers(learner.profileId);
    setCard("magenta", `
      <div class="card-content">
        <div class="card-kicker"><span class="turn-pill">Stjel sjansen</span><span>+2 kamppoeng</span></div>
        <h2 class="card-question">Traff ${escapeHtml(learner.displayName)} sitt låste svar?</h2>
        <div class="answer-panel"><span>Kanonisk fasit</span><strong>${escapeHtml(context.variant.explanation || answer)}</strong></div>
        ${rubric}
      </div>
      <div class="card-actions">
        <div class="judgement-grid"><button class="button primary" data-steal-verdict="correct" type="button">${correctLabel} →</button></div>
        <div class="judgement-secondary"><button class="button" data-steal-verdict="incorrect" type="button">Ikke ennå</button><button class="button" data-steal-verdict="${match.adjudicationMode === "consensus" ? "disputed" : "unsure"}" type="button">${uncertainLabel}</button></div>
      </div>`);
    document.querySelectorAll("[data-steal-verdict]").forEach((button) => button.addEventListener("click", () => {
      applyJudgement({
        actorProfileId: learner.profileId,
        attemptKind: "steal",
        helpStatus: "open",
        isSteal: true,
        priorAttemptId: adultApplied.attemptEvent.attemptId,
        stealLocked: false,
        turn: context.turn,
        variant: context.variant
      }, button.dataset.stealVerdict);
    }));
  }

  function renderFeedback(applied, context) {
    activeView = "feedback";
    const match = activeMatch();
    const summary = Core.matchSummary(state);
    const points = applied.scoreEvent.pointsDelta;
    const isComeback = [Core.SEMANTIC_OUTCOMES.RELEARNING_HOLD, Core.SEMANTIC_OUTCOMES.OPEN_CORRECT_COMEBACK_PROMOTE_ONE].includes(applied.semanticOutcome);
    const isSteal = applied.scoreEvent.reason === "steal";
    const promoted = applied.reviewEvent && applied.reviewEvent.stageAfter > applied.reviewEvent.stageBefore;
    const tone = isComeback && context.verdict === "correct" ? "earned" : isSteal ? "magenta" : "green";
    const memoryCopy = !applied.reviewEvent
      ? "Ingen læringsendring ble skrevet."
      : promoted
        ? `Flyttet fra steg ${applied.reviewEvent.stageBefore} til ${applied.reviewEvent.stageAfter}.`
        : applied.semanticOutcome === Core.SEMANTIC_OUTCOMES.RELEARNING_HOLD
          ? "Samme nivå. Ny framtidig henting er planlagt."
          : "Nivået står. Oppgaven kommer tilbake senere.";
    setIntro("", "", "", true);
    renderPlayers();
    setCard(tone, `
      <div class="card-content">
        <div class="card-kicker"><span>${isComeback ? "Opptjent comeback" : isSteal ? "Stjålet poeng" : context.verdict === "correct" ? "Riktig" : "Ikke ennå"}</span><span>${match.completedTurnCount} turer spilt</span></div>
        <div class="feedback-mark">${isComeback ? "↺" : context.verdict === "correct" ? "✓" : "↻"}</div>
        <h2 class="feedback-points">${points ? `+${points} poeng` : "Ny sjanse"}</h2>
        <p class="card-note">${isComeback ? "Kunnskapen ble hentet frem uten hjelp." : context.verdict === "correct" ? "Svaret satt." : "Det er helt greit å ikke kunne det ennå."}</p>
        <div class="feedback-detail"><div><span>Kamppoeng</span><strong>${escapeHtml(summary.learner.profile.displayName)} ${summary.learner.score} — ${summary.challenger.score} ${escapeHtml(summary.challenger.profile.displayName)}</strong></div><div><span>Caspers minne</span><strong>${memoryCopy}</strong></div></div>
      </div>
      <div class="card-actions"><button class="button primary" id="nextTurn" type="button">${match.status === "completed" ? "Se resultatet" : "Neste tur"} →</button></div>`);
    document.getElementById("nextTurn").addEventListener("click", renderQuestion);
  }

  function renderResult() {
    activeView = "result";
    const match = activeMatch();
    const summary = Core.matchSummary(state);
    const winner = summary.winnerProfileId ? profile(summary.winnerProfileId) : null;
    setIntro("", "", "", true);
    renderPlayers();
    setCard("result", `
      <div class="card-content">
        <div class="card-kicker"><span>Dette lærte Casper</span><span>${match.completedTurnCount} turer</span></div>
        <div class="result-score">Kamppoeng · ${escapeHtml(summary.learner.profile.displayName)} ${summary.learner.score} — ${summary.challenger.score} ${escapeHtml(summary.challenger.profile.displayName)}</div>
        <h2 class="result-learning-title">Dere fant ut hva dere kan forklare sammen.</h2>
        <p class="card-note">${winner ? `${escapeHtml(winner.displayName)} fikk flest kamppoeng denne gangen.` : "Dere fikk like mange kamppoeng denne gangen."}</p>
        <div class="result-list">
          <div><span>Hentet frem</span><strong>${summary.recalledWithoutHelp} svar uten hjelp</strong></div>
          <div><span>Comeback</span><strong>${summary.comebackCount} læringsøyeblikk</strong></div>
          <div><span>Flyttet videre</span><strong>${summary.promotedCount} læringsmål til neste trinn</strong></div>
        </div>
      </div>
      <div class="card-actions button-row"><button class="button primary" id="playAgain" type="button">Spill igjen →</button><button class="button" id="openSolo" type="button">Åpne Sitter Solo</button></div>`);
    document.getElementById("playAgain").addEventListener("click", renderSetup);
    document.getElementById("openSolo").addEventListener("click", () => { window.location.href = "sitter.html?pakke=casper"; });
  }

  function toggleMenu(open) {
    gameMenu.hidden = !open;
    document.getElementById("menuButton").setAttribute("aria-expanded", String(open));
  }

  document.getElementById("menuButton").addEventListener("click", () => toggleMenu(gameMenu.hidden));
  document.getElementById("closeMenu").addEventListener("click", () => toggleMenu(false));
  document.getElementById("resetFamilyGame").addEventListener("click", () => {
    if (!window.confirm(config.resetConfirm)) return;
    state = storage.reset();
    toggleMenu(false);
    renderSetup();
  });

  window.FamilyGameTest = {
    Core,
    getState: () => cloneForTest(state),
    renderSetup,
    storageKey: storage.storeKey
  };

  function cloneForTest(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const match = activeMatch();
  if (match?.status === "in_progress") renderQuestion();
  else if (match?.status === "completed") renderResult();
  else renderSetup();
})();
