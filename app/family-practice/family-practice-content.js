(function initFamilyPracticeContent(root, factory) {
  const runtime = factory();
  if (typeof module === "object" && module.exports) module.exports = runtime;
  root.FamilyPracticeContent = runtime;
})(typeof globalThis !== "undefined" ? globalThis : window, function createFamilyPracticeContentRuntime() {
  const ROLE_ORDER = ["child_core", "adult_challenge", "help", "comeback"];

  function toVariant(source, family, role) {
    const choices = source.choices || [];
    const correctChoice = choices.find((choice) => choice.isCorrect);
    const acceptedAnswers = source.acceptedAnswers || (correctChoice ? [correctChoice.label] : []);
    if (!acceptedAnswers.length) throw new Error(`Mangler fasit for ${source.id}`);
    return {
      acceptedAnswers,
      answerMode: source.answerMode,
      canonicalAnswer: acceptedAnswers[0],
      cooldownExposures: 2,
      essentialId: family.essentialId,
      explanation: source.feedback || acceptedAnswers[0],
      helpOptions: choices.map((choice, index) => ({
        correct: Boolean(choice.isCorrect),
        id: String.fromCharCode(65 + index),
        label: choice.label
      })),
      instanceKey: source.id,
      mustDifferFromPriorPrompt: role === "comeback",
      noRepeatWithinMatch: true,
      prompt: source.prompt,
      promptFingerprint: `pf.practice.v1.${source.id}`,
      rejectionRules: "Svar som ikke uttrykker den kanoniske meningen, avvises.",
      representationType: source.answerMode === "oral_choice" ? "choice" : "oral_recall",
      rubric: Array.isArray(source.rubric) ? source.rubric : [],
      rotationGroup: family.essentialId,
      shuffleOptions: role === "help",
      subject: family.subject,
      variantId: source.id,
      variantRole: role
    };
  }

  function createContent(pack, collection) {
    const essentials = new Map(collection.essentials.map((essential) => [essential.essentialId, essential]));
    const families = pack.questionFamilies.map((family) => ({
      essentialId: family.essentialId,
      gradeLevel: pack.targetGrade,
      statement: essentials.get(family.essentialId)?.statement || "",
      subject: family.subject,
      variants: ROLE_ORDER.map((role) => toVariant(family.variants[role], family, role))
    }));
    return {
      contractVersion: "family-practice-runtime-v1",
      experienceName: pack.experienceName,
      families,
      matchSize: 4,
      memoryPolicy: pack.memoryPolicy,
      packId: pack.packId,
      pedagogyReview: pack.pedagogyReview,
      releaseStatus: pack.releaseStatus,
      ROLE_ORDER,
      scoringPolicy: pack.scoringPolicy,
      stealPolicy: pack.stealPolicy,
      storeKey: "sitter-casper-family-practice-v1",
      subjects: pack.subjects,
      targetGrade: pack.targetGrade,
      ui: {
        eyebrow: "Practice-sett · Review",
        gradeLabel: `${pack.targetGrade}. trinn`,
        lede: "Casper og en voksen får samme læringsmål på hver sin måte.",
        packageLabel: "30 voksen–barn-par · muntlig pilot",
        resetConfirm: "Nullstille Practice-spillet på denne enheten?",
        roundCopy: "Sitter trekker fire læringsmål fra valgt fag.",
        safetyLine: "Dette måler ikke hvem som er smartest. Målet er å forklare, prøve og lære sammen.",
        title: pack.title
      },
      variants: families.flatMap((family) => family.variants)
    };
  }

  return { createContent, ROLE_ORDER, toVariant };
});
