const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { before, test } = require("node:test");

let validateContent;

before(async () => {
  ({ validateContent } = await import("../scripts/validate-sitter-content.mjs"));
});

const root = path.resolve(__dirname, "..");
const essentialsPath = path.join(root, "content/essentials/no/grade-4/family-practice-v1.json");
const packPath = path.join(root, "content/packs/no/grade-4/casper-family-practice-v1.json");

function loadContent() {
  return {
    essentials: JSON.parse(fs.readFileSync(essentialsPath, "utf8")),
    pack: JSON.parse(fs.readFileSync(packPath, "utf8"))
  };
}

function expectInvalid(content, fragment) {
  const errors = validateContent(content);
  assert.ok(errors.some((error) => error.includes(fragment)), `Expected an error containing '${fragment}', got:\n${errors.join("\n")}`);
}

test("family practice pack passes the full content contract", () => {
  const content = loadContent();
  assert.deepEqual(validateContent(content), []);
  assert.equal(content.pack.questionFamilies.length, 30);
  assert.equal(content.pack.questionFamilies.length * 2, 60);
  assert.equal(content.essentials.essentials.length, 30);
});

test("pack has six paired learning essentials per subject", () => {
  const { pack } = loadContent();
  const counts = Object.groupBy(pack.questionFamilies, (family) => family.subject);
  for (const families of Object.values(counts)) assert.equal(families.length, 6);
  for (const family of pack.questionFamilies) {
    assert.equal(family.variants.child_core.difficulty.grade, family.variants.adult_challenge.difficulty.grade);
    assert.equal(family.variants.adult_challenge.difficulty.sameGrade, true);
    assert.equal(family.variants.adult_challenge.difficulty.childStealable, true);
  }
});

test("adult and steal answers cannot write to Casper learner memory", () => {
  const content = loadContent();
  content.pack.questionFamilies[0].variants.adult_challenge.memoryOwner = "casper";
  expectInvalid(content, "adult memoryOwner must be null");

  const stealMutation = loadContent();
  stealMutation.pack.memoryPolicy.stealWritesLearnerMemory = true;
  expectInvalid(stealMutation, "memoryPolicy.stealWritesLearnerMemory must be false");
});

test("validator rejects grade drift in an adult challenge", () => {
  const content = loadContent();
  content.pack.questionFamilies[0].variants.adult_challenge.difficulty.grade = 5;
  expectInvalid(content, "must be hard within grade 4 and child-stealable");
});

test("validator rejects reveal before both steal answers are locked", () => {
  const content = loadContent();
  content.pack.stealPolicy.lockBothAnswersBeforeReveal = false;
  expectInvalid(content, "both answers must be locked before steal reveal");
});

test("validator rejects ambiguous help choices", () => {
  const content = loadContent();
  content.pack.questionFamilies[0].variants.help.choices[1].isCorrect = true;
  expectInvalid(content, "exactly one choice must be correct");
});

test("validator rejects missing and non-official curriculum evidence", () => {
  const content = loadContent();
  content.essentials.essentials[0].sourceEvidence.officialSourceUrl = "https://example.com/grade-4";
  expectInvalid(content, "officialSourceUrl must be an HTTPS Udir LK20 page");

  const missingObjective = loadContent();
  missingObjective.essentials.essentials[0].sourceEvidence.objectiveRef = "";
  expectInvalid(missingObjective, "missing objectiveRef");
});

test("validator rejects orphaned essentials and coverage drift", () => {
  const content = loadContent();
  content.pack.questionFamilies[0].essentialId = "no-mat-g4-finnes-ikke";
  expectInvalid(content, "orphaned essentialId");
  expectInvalid(content, "question families must cover every essential exactly once");
});

test("pack remains a review artifact and uses no writing task", () => {
  const { pack } = loadContent();
  assert.equal(pack.releaseStatus, "review");
  for (const family of pack.questionFamilies) {
    for (const role of ["child_core", "adult_challenge", "help", "comeback"]) {
      assert.match(family.variants[role].answerMode, /^oral/);
    }
  }
});
