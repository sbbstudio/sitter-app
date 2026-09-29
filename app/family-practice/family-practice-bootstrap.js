(async function startFamilyPractice() {
  function fail(message) {
    const face = document.getElementById("cardFace");
    if (!face) return;
    face.innerHTML = '<div class="card-content"><p class="eyebrow">Kunne ikke åpne practice-settet</p><h1></h1></div>';
    face.querySelector("h1").textContent = message;
  }

  try {
    const [packResponse, essentialsResponse] = await Promise.all([
      fetch("content/packs/no/grade-4/casper-family-practice-v1.json"),
      fetch("content/essentials/no/grade-4/family-practice-v1.json")
    ]);
    if (!packResponse.ok || !essentialsResponse.ok) throw new Error("Innholdet kunne ikke lastes.");
    const [pack, collection] = await Promise.all([packResponse.json(), essentialsResponse.json()]);
    if (!window.FamilyPracticeContent) throw new Error("Practice-adapteren mangler.");
    window.FAMILY_GAME_CONTENT = window.FamilyPracticeContent.createContent(pack, collection);
    if (typeof window.createFamilyGameCore !== "function") throw new Error("Spillmotoren mangler.");
    window.FamilyGameCore = window.createFamilyGameCore(window.FAMILY_GAME_CONTENT);
    await import("./family-game-app.js?v=2");
  } catch (error) {
    fail(error.message || "Ukjent feil.");
  }
})();
