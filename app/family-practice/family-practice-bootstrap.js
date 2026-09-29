/*
 * Entry for family-practice.html: fetches the practice pack and its learning
 * essentials from content/, adapts them with FamilyPracticeContent, builds
 * FamilyGameCore for that content, then loads the shared Family Game UI.
 * Any failure is shown on the card instead of leaving a blank page.
 */
(async function startFamilyPractice() {
  function fail(message) {
    const face = document.getElementById("cardFace");
    if (!face) return;
    face.innerHTML = '<div class="card-content"><p class="eyebrow">Kunne ikke åpne practice-settet</p><h1></h1></div>';
    face.querySelector("h1").textContent = message;
  }

  try {
    // fetch() resolves against the page URL, so content/ is found from the site root.
    const [packResponse, essentialsResponse] = await Promise.all([
      fetch("content/packs/no/grade-4/casper-family-practice-v1.json"),
      fetch("content/essentials/no/grade-4/family-practice-v1.json")
    ]);
    if (!packResponse.ok || !essentialsResponse.ok) throw new Error("Innholdet kunne ikke lastes.");
    const [pack, collection] = await Promise.all([packResponse.json(), essentialsResponse.json()]);
    if (!window.FamilyPracticeContent) throw new Error("Practice-adapteren mangler.");
    // Both globals must exist before the UI loads: family-game-app.js reads them once at start.
    window.FAMILY_GAME_CONTENT = window.FamilyPracticeContent.createContent(pack, collection);
    if (typeof window.createFamilyGameCore !== "function") throw new Error("Spillmotoren mangler.");
    window.FamilyGameCore = window.createFamilyGameCore(window.FAMILY_GAME_CONTENT);
    // import() in a classic script resolves against this script's URL (app/family-practice/),
    // not the page URL, so the path steps up to app/family-game/.
    await import("../family-game/family-game-app.js?v=2");
  } catch (error) {
    fail(error.message || "Ukjent feil.");
  }
})();
