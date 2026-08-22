import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUBJECTS = ["Matematikk", "Norsk", "Engelsk", "Naturfag", "Samfunnsfag"];
const ROLE_KEYS = ["child_core", "adult_challenge", "help", "comeback"];
const ESSENTIAL_ID = /^no-[a-z]+-g4-[a-z0-9-]+$/;
const UNSAFE_FEEDBACK = /\b(smart(?:ere)?|dum(?:mere)?|flinkere|dårligere|tapte mot|vant over)\b/i;
const EXPECTED_VALID_FROM = {
  "MAT01-06": "2026-08-01",
  "NOR01-08": "2026-08-01",
  "ENG01-06": "2026-08-01",
  "NAT01-05": "2026-08-01",
  "SAF01-04": "2020-08-01"
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sameSet(left, right) {
  return left.length === right.length && left.every((item) => right.includes(item));
}

function duplicates(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

function validateAnswerVariant(variant, label, errors) {
  if (!variant || typeof variant !== "object") {
    errors.push(`${label}: missing variant`);
    return;
  }
  if (!isNonEmptyString(variant.id)) errors.push(`${label}: missing question id`);
  if (!isNonEmptyString(variant.prompt)) errors.push(`${label}: missing prompt`);
  if (!isNonEmptyString(variant.feedback)) errors.push(`${label}: missing corrective feedback`);
  if (!String(variant.answerMode || "").startsWith("oral")) {
    errors.push(`${label}: answerMode must be oral`);
  }
  if (!Array.isArray(variant.acceptedAnswers) || variant.acceptedAnswers.length === 0) {
    errors.push(`${label}: acceptedAnswers must be non-empty`);
  } else if (variant.acceptedAnswers.some((answer) => !isNonEmptyString(answer))) {
    errors.push(`${label}: acceptedAnswers cannot contain empty answers`);
  }
  if (UNSAFE_FEEDBACK.test(variant.feedback || "")) {
    errors.push(`${label}: feedback judges intelligence or compares people`);
  }
}

export function validateContent({ essentials, pack }) {
  const errors = [];

  if (!essentials || typeof essentials !== "object") return ["essentials: missing document"];
  if (!pack || typeof pack !== "object") return ["pack: missing document"];

  if (essentials.collectionId !== pack.essentialCollection) {
    errors.push("pack: essentialCollection does not match the essentials collectionId");
  }
  if (essentials.targetGrade !== 4 || pack.targetGrade !== 4) {
    errors.push("content: targetGrade must be 4");
  }
  if (pack.schoolYear !== "2026-2027" || pack.validFrom !== "2026-08-01") {
    errors.push("pack: schoolYear/validFrom must target the 2026-2027 school year");
  }
  if (pack.releaseStatus !== "review") {
    errors.push("pack: releaseStatus must remain review until human approval");
  }

  const essentialList = Array.isArray(essentials.essentials) ? essentials.essentials : [];
  if (essentialList.length !== 30) errors.push("essentials: expected exactly 30 learning essentials");
  const essentialIds = essentialList.map((essential) => essential.essentialId);
  if (duplicates(essentialIds).length) errors.push("essentials: duplicate essentialId");

  const essentialsById = new Map();
  const essentialSubjectCounts = Object.fromEntries(SUBJECTS.map((subject) => [subject, 0]));
  for (const [index, essential] of essentialList.entries()) {
    const label = `essentials[${index}]`;
    if (!ESSENTIAL_ID.test(essential.essentialId || "")) {
      errors.push(`${label}: essentialId must be a fourth-grade Norwegian id`);
    }
    if (!SUBJECTS.includes(essential.subject)) {
      errors.push(`${label}: unsupported subject`);
    } else {
      essentialSubjectCounts[essential.subject] += 1;
    }
    if (!isNonEmptyString(essential.statement)) errors.push(`${label}: missing statement`);
    if (essential.selectionLayer !== "curriculum_core") {
      errors.push(`${label}: selectionLayer must be curriculum_core`);
    }
    if (!['candidate', 'expert_review', 'approved'].includes(essential.status)) {
      errors.push(`${label}: invalid review status`);
    }

    const source = essential.sourceEvidence || {};
    if (source.jurisdiction !== "NO") errors.push(`${label}: source jurisdiction must be NO`);
    if (source.sourceGradeBand !== "4. trinn") errors.push(`${label}: sourceGradeBand must be 4. trinn`);
    if (!isNonEmptyString(source.objectiveRef)) errors.push(`${label}: missing objectiveRef`);
    if (!isNonEmptyString(source.checkedAt)) errors.push(`${label}: missing source checkedAt`);
    const expectedValidFrom = EXPECTED_VALID_FROM[source.curriculumVersion];
    if (!expectedValidFrom) {
      errors.push(`${label}: unsupported curriculumVersion`);
    } else if (source.validFrom !== expectedValidFrom) {
      errors.push(`${label}: wrong validFrom for ${source.curriculumVersion}`);
    }
    try {
      const sourceUrl = new URL(source.officialSourceUrl);
      if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "www.udir.no" || !sourceUrl.pathname.startsWith("/lk20/")) {
        errors.push(`${label}: officialSourceUrl must be an HTTPS Udir LK20 page`);
      }
    } catch {
      errors.push(`${label}: officialSourceUrl is invalid`);
    }
    essentialsById.set(essential.essentialId, essential);
  }
  for (const subject of SUBJECTS) {
    if (essentialSubjectCounts[subject] !== 6) {
      errors.push(`essentials: ${subject} must have exactly 6 essentials`);
    }
  }

  const packEssentialIds = Array.isArray(pack.essentialIds) ? pack.essentialIds : [];
  if (duplicates(packEssentialIds).length) errors.push("pack: duplicate essentialIds");
  if (!sameSet(packEssentialIds, essentialIds)) {
    errors.push("pack: essentialIds must match the essentials collection exactly");
  }
  if (!sameSet(pack.subjects || [], SUBJECTS)) errors.push("pack: subjects must contain all five subjects exactly once");
  if (pack.contentCounts?.families !== 30 || pack.contentCounts?.coreQuestions !== 60 || pack.contentCounts?.familiesPerSubject !== 6) {
    errors.push("pack: contentCounts must declare 30 families, 60 core questions and 6 per subject");
  }

  if (pack.memoryPolicy?.learnerOwner !== "casper") errors.push("pack: Casper must be the learner-memory owner");
  for (const flag of [
    "adultWritesLearnerMemory",
    "stealWritesLearnerMemory",
    "rawAnswersStored",
    "audioStored",
    "transcriptsStored",
    "disputedAnswerWritesLearnerMemory"
  ]) {
    if (pack.memoryPolicy?.[flag] !== false) errors.push(`pack: memoryPolicy.${flag} must be false`);
  }
  if (pack.stealPolicy?.lockBothAnswersBeforeReveal !== true || pack.stealPolicy?.revealAfterBothLocked !== true) {
    errors.push("pack: both answers must be locked before steal reveal");
  }
  if (pack.stealPolicy?.childMayPass !== true) errors.push("pack: child must be allowed to pass a steal");
  if (pack.safetyPolicy?.hintAndPassAlwaysAvailable !== true) errors.push("pack: hint and pass must always be available");
  if (pack.safetyPolicy?.intelligenceJudgmentInFeedback !== false) errors.push("pack: intelligence judgments must be disabled");
  if (pack.scoringPolicy?.negativePoints !== false || pack.scoringPolicy?.timeBonus !== false) {
    errors.push("pack: negative points and time bonuses must be disabled");
  }
  if (
    pack.scoringPolicy?.childUnaidedCorrect !== 3 ||
    pack.scoringPolicy?.adultCorrect !== 3 ||
    pack.scoringPolicy?.successfulSteal !== 2 ||
    pack.scoringPolicy?.childComebackAfterHelpCorrect !== 2 ||
    pack.scoringPolicy?.childComebackAfterMissCorrect !== 3
  ) {
    errors.push("pack: scoring must preserve the reviewed 3/3/2 and comeback policy");
  }
  if (pack.srsPolicy?.comebackCorrect?.intervalCap !== "1h") {
    errors.push("pack: a correct comeback must be capped at a 1h interval");
  }
  if (pack.difficultyTargets?.childExpectedSuccess?.min !== 0.7 || pack.difficultyTargets?.childExpectedSuccess?.max !== 0.85) {
    errors.push("pack: child success hypothesis must remain 0.70-0.85 until pilot data");
  }
  if (pack.pedagogyReview?.status !== "reviewed_for_pilot" || pack.pedagogyReview?.humanPilotStillRequired !== true) {
    errors.push("pack: Finnish-lens review must be recorded without skipping the human pilot");
  }

  const families = Array.isArray(pack.questionFamilies) ? pack.questionFamilies : [];
  if (families.length !== 30) errors.push("pack: expected exactly 30 question families");
  const familyIds = families.map((family) => family.familyId);
  if (duplicates(familyIds).length) errors.push("pack: duplicate familyId");
  const familyEssentialIds = families.map((family) => family.essentialId);
  if (duplicates(familyEssentialIds).length) errors.push("pack: each essentialId must occur in exactly one family");
  if (!sameSet(familyEssentialIds, essentialIds)) errors.push("pack: question families must cover every essential exactly once");

  const familySubjectCounts = Object.fromEntries(SUBJECTS.map((subject) => [subject, 0]));
  const questionIds = [];
  let coreQuestionCount = 0;
  for (const [index, family] of families.entries()) {
    const label = `questionFamilies[${index}]`;
    const essential = essentialsById.get(family.essentialId);
    if (!essential) errors.push(`${label}: orphaned essentialId ${family.essentialId}`);
    if (essential && family.subject !== essential.subject) errors.push(`${label}: subject differs from its learning essential`);
    if (SUBJECTS.includes(family.subject)) familySubjectCounts[family.subject] += 1;

    const variants = family.variants || {};
    for (const role of ROLE_KEYS) {
      if (!variants[role]) errors.push(`${label}: missing ${role}`);
    }
    const child = variants.child_core;
    const adult = variants.adult_challenge;
    const help = variants.help;
    const comeback = variants.comeback;

    if (child) {
      validateAnswerVariant(child, `${label}.child_core`, errors);
      coreQuestionCount += 1;
      if (child.role !== "child_core" || child.memoryOwner !== "casper") {
        errors.push(`${label}.child_core: Casper must own child learner memory`);
      }
      if (child.difficulty?.grade !== 4 || child.difficulty?.band !== "easy") {
        errors.push(`${label}.child_core: must be an easy fourth-grade variant`);
      }
      questionIds.push(child.id);
    }
    if (adult) {
      validateAnswerVariant(adult, `${label}.adult_challenge`, errors);
      coreQuestionCount += 1;
      if (adult.role !== "adult_challenge" || adult.memoryOwner !== null) {
        errors.push(`${label}.adult_challenge: adult memoryOwner must be null`);
      }
      if (
        adult.difficulty?.grade !== 4 ||
        adult.difficulty?.band !== "hard" ||
        adult.difficulty?.sameGrade !== true ||
        adult.difficulty?.childStealable !== true
      ) {
        errors.push(`${label}.adult_challenge: must be hard within grade 4 and child-stealable`);
      }
      questionIds.push(adult.id);
    }
    if (help) {
      if (!isNonEmptyString(help.id) || !isNonEmptyString(help.prompt) || !isNonEmptyString(help.feedback)) {
        errors.push(`${label}.help: id, prompt and feedback are required`);
      }
      if (help.role !== "help" || help.memoryOwner !== "casper" || help.answerMode !== "oral_choice") {
        errors.push(`${label}.help: invalid role, owner or answerMode`);
      }
      if (!Array.isArray(help.choices) || help.choices.length !== 3) {
        errors.push(`${label}.help: exactly three choices are required`);
      } else {
        if (help.choices.filter((choice) => choice.isCorrect === true).length !== 1) {
          errors.push(`${label}.help: exactly one choice must be correct`);
        }
        if (help.choices.some((choice) => !isNonEmptyString(choice.label))) {
          errors.push(`${label}.help: choice labels cannot be empty`);
        }
        if (duplicates(help.choices.map((choice) => choice.label.toLocaleLowerCase("nb-NO"))).length) {
          errors.push(`${label}.help: choice labels must be unique`);
        }
      }
      if (UNSAFE_FEEDBACK.test(help.feedback || "")) errors.push(`${label}.help: unsafe comparative feedback`);
      questionIds.push(help.id);
    }
    if (comeback) {
      validateAnswerVariant(comeback, `${label}.comeback`, errors);
      if (comeback.role !== "comeback" || comeback.memoryOwner !== "casper") {
        errors.push(`${label}.comeback: Casper must own comeback learner memory`);
      }
      if (comeback.difficulty?.grade !== 4 || comeback.difficulty?.band !== "easy") {
        errors.push(`${label}.comeback: must remain an easy fourth-grade variant`);
      }
      questionIds.push(comeback.id);
    }
  }
  if (coreQuestionCount !== 60) errors.push("pack: expected exactly 60 child/adult core questions");
  if (duplicates(questionIds).length) errors.push("pack: duplicate question id");
  for (const subject of SUBJECTS) {
    if (familySubjectCounts[subject] !== 6) errors.push(`pack: ${subject} must have exactly 6 families`);
  }

  return errors;
}

export function assertValidContent(content) {
  const errors = validateContent(content);
  if (errors.length) throw new Error(errors.join("\n"));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const root = path.resolve(path.dirname(currentFile), "..");
  const essentialsPath = path.join(root, "content/essentials/no/grade-4/family-practice-v1.json");
  const packPath = path.join(root, "content/packs/no/grade-4/casper-family-practice-v1.json");
  const errors = validateContent({ essentials: readJson(essentialsPath), pack: readJson(packPath) });
  if (errors.length) {
    console.error(`Sitter content validation failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Sitter content validation passed: 30 families, 60 core questions, 5 subjects.");
  }
}
