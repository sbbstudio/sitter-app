(function initFamilyGameContent(root, factory) {
  const content = factory();
  if (typeof module === "object" && module.exports) module.exports = content;
  root.FAMILY_GAME_CONTENT = content;
})(typeof globalThis !== "undefined" ? globalThis : window, function createFamilyGameContent() {
  const ROLE_ORDER = ["child_core", "adult_challenge", "help", "comeback"];

  function variant(essentialId, role, instanceKey, prompt, canonicalAnswer, extra = {}) {
    return {
      acceptedAnswers: extra.acceptedAnswers || [canonicalAnswer],
      answerMode: "oral",
      canonicalAnswer,
      cooldownExposures: 2,
      essentialId,
      explanation: extra.explanation || "",
      helpOptions: extra.helpOptions || [],
      instanceKey,
      mustDifferFromPriorPrompt: role === "comeback",
      noRepeatWithinMatch: true,
      prompt,
      promptFingerprint: `pf.v1.${essentialId}.${role}.${instanceKey}`,
      rejectionRules: extra.rejectionRules || "Svar som ikke uttrykker den kanoniske meningen, avvises.",
      representationType: extra.representationType || "oral_recall",
      rotationGroup: essentialId,
      shuffleOptions: role === "help",
      variantId: `${essentialId}:${role}:v1`,
      variantRole: role,
      ...extra
    };
  }

  const families = [
    {
      essentialId: "no-mat-g3-posisjonssystem-tiere-enere",
      gradeLevel: 3,
      statement: "Forstå at sifrenes plass viser tiere og enere i tosifrede tall.",
      subject: "Matematikk",
      variants: [
        variant("no-mat-g3-posisjonssystem-tiere-enere", "child_core", "47", "I tallet 47, hvor mange tiere og enere er det?", "4 tiere og 7 enere", { acceptedAnswers: ["4 tiere og 7 enere", "fire tiere og sju enere", "40 + 7"], representationType: "direct_decomposition" }),
        variant("no-mat-g3-posisjonssystem-tiere-enere", "adult_challenge", "8t3e", "Et tall har 8 tiere og 3 enere. Hvilket tall er det?", "83", { acceptedAnswers: ["83", "åttitre"], representationType: "reverse_composition" }),
        variant("no-mat-g3-posisjonssystem-tiere-enere", "help", "62", "I tallet 62, hvor mange tiere og enere er det?", "6 tiere og 2 enere", { explanation: "6 står på tierplassen og 2 på enerplassen.", helpOptions: [{ id: "A", label: "6 tiere og 2 enere", correct: true }, { id: "B", label: "2 tiere og 6 enere" }, { id: "C", label: "62 tiere og 0 enere" }], representationType: "choice" }),
        variant("no-mat-g3-posisjonssystem-tiere-enere", "comeback", "5t9e", "Hvilket tall blir 5 tiere og 9 enere til sammen?", "59", { acceptedAnswers: ["59", "femtini"], representationType: "reverse_composition" })
      ]
    },
    {
      essentialId: "no-mat-g3-like-grupper-multiplikasjon",
      gradeLevel: 3,
      statement: "Forstå multiplikasjon som gjentatt addisjon av like grupper.",
      subject: "Matematikk",
      variants: [
        variant("no-mat-g3-like-grupper-multiplikasjon", "child_core", "3x4-epler", "Tre poser har 4 epler hver. Hvor mange epler er det til sammen?", "12", { acceptedAnswers: ["12", "tolv", "3 ganger 4 er 12"], representationType: "equal_group_scenario" }),
        variant("no-mat-g3-like-grupper-multiplikasjon", "adult_challenge", "6x4-poeng", "Seks lag får 4 poeng hver. Hvor mange poeng er det til sammen?", "24", { acceptedAnswers: ["24", "tjuefire", "6 ganger 4 er 24"], representationType: "equal_group_scenario" }),
        variant("no-mat-g3-like-grupper-multiplikasjon", "help", "5x3-glass", "Fem brett har 3 glass hver. Hvor mange glass er det til sammen?", "15", { explanation: "Fem like grupper med tre er 3 + 3 + 3 + 3 + 3 = 15.", helpOptions: [{ id: "A", label: "15", correct: true }, { id: "B", label: "8" }, { id: "C", label: "10" }], representationType: "choice" }),
        variant("no-mat-g3-like-grupper-multiplikasjon", "comeback", "5x4-hopp", "Du hopper 4 steg om gangen, 5 ganger. Hvor mange steg hopper du?", "20", { acceptedAnswers: ["20", "tjue", "5 ganger 4 er 20"], representationType: "movement_transfer" })
      ]
    },
    {
      essentialId: "no-nor-g3-lydsyntese-bokstavlyder",
      gradeLevel: 3,
      statement: "Trekke bokstavlyder sammen til korte ord.",
      subject: "Norsk",
      variants: [
        variant("no-nor-g3-lydsyntese-bokstavlyder", "child_core", "s-o-l", "Hvilket ord blir lydene s–o–l?", "sol", { representationType: "phoneme_blend" }),
        variant("no-nor-g3-lydsyntese-bokstavlyder", "adult_challenge", "f-i-s-k", "Trekk sammen lydene f–i–s–k. Hvilket ord blir det?", "fisk", { representationType: "phoneme_blend" }),
        variant("no-nor-g3-lydsyntese-bokstavlyder", "help", "m-a-t", "Hvilket ord blir lydene m–a–t?", "mat", { explanation: "Når m, a og t trekkes sammen, blir ordet mat.", helpOptions: [{ id: "A", label: "mat", correct: true }, { id: "B", label: "met" }, { id: "C", label: "tam" }], representationType: "choice" }),
        variant("no-nor-g3-lydsyntese-bokstavlyder", "comeback", "b-i-l", "Hvilket ord hører du når du setter sammen b–i–l?", "bil", { representationType: "phoneme_blend" })
      ]
    },
    {
      essentialId: "no-nor-g3-sluttegn-setningstype",
      gradeLevel: 3,
      statement: "Velge sluttegn ut fra om en setning spør eller forteller.",
      subject: "Norsk",
      variants: [
        variant("no-nor-g3-sluttegn-setningstype", "child_core", "hvor-er-sekken", "Hvilket tegn skal stå til slutt: «Hvor er sekken min»?", "spørsmålstegn", { acceptedAnswers: ["spørsmålstegn"], displayAliasGlyph: "?", representationType: "sentence_discrimination" }),
        variant("no-nor-g3-sluttegn-setningstype", "adult_challenge", "kommer-du-du-kommer", "Setning A er «Kommer du». Setning B er «Du kommer». Hvilket sluttegn skal A og B ha?", "A: spørsmålstegn; B: punktum", { acceptedAnswers: ["A spørsmålstegn og B punktum", "spørsmålstegn på A og punktum på B"], representationType: "contrast_pair" }),
        variant("no-nor-g3-sluttegn-setningstype", "help", "hvor-bor-du", "Hvilket sluttegn passer: «Hvor bor du»?", "spørsmålstegn", { acceptedAnswers: ["spørsmålstegn"], displayAliasGlyph: "?", explanation: "Setningen spør om noe, derfor bruker vi spørsmålstegn.", helpOptions: [{ id: "A", label: "spørsmålstegn (?)", correct: true }, { id: "B", label: "punktum (.)" }, { id: "C", label: "utropstegn (!)" }], representationType: "choice" }),
        variant("no-nor-g3-sluttegn-setningstype", "comeback", "mina-gaar-hjem", "Hvilket sluttegn skal stå etter «Mina går hjem»?", "punktum", { acceptedAnswers: ["punktum"], displayAliasGlyph: ".", representationType: "sentence_discrimination" })
      ]
    },
    {
      essentialId: "no-eng-g3-hoflighetsord-please",
      gradeLevel: 3,
      statement: "Bruke høflighetsordet please i enkle engelske forespørsler.",
      subject: "Engelsk",
      variants: [
        variant("no-eng-g3-hoflighetsord-please", "child_core", "vaer-saa-snill", "Hvilket engelsk ord betyr «vær så snill»?", "please", { representationType: "direct_meaning" }),
        variant("no-eng-g3-hoflighetsord-please", "adult_challenge", "water-request", "Fyll inn ordet: «Can I have some water, ___?»", "please", { representationType: "cloze_request" }),
        variant("no-eng-g3-hoflighetsord-please", "help", "door-request", "Hvilket ord gjør «Open the door, ___» til en høflig forespørsel?", "please", { explanation: "Please bruker vi når vi ber høflig om noe.", helpOptions: [{ id: "A", label: "please", correct: true }, { id: "B", label: "thank you" }, { id: "C", label: "sorry" }], representationType: "choice" }),
        variant("no-eng-g3-hoflighetsord-please", "comeback", "pencil-request", "Du ber om en blyant på engelsk. Hvilket ord legger du til for å spørre høflig?", "please", { representationType: "social_transfer" })
      ]
    },
    {
      essentialId: "no-eng-g3-sporsmal-what-is-your-name",
      gradeLevel: 3,
      statement: "Forstå og svare på spørsmålet What is your name?",
      subject: "Engelsk",
      variants: [
        variant("no-eng-g3-sporsmal-what-is-your-name", "child_core", "translate-name-question", "Hva betyr spørsmålet «What is your name?»", "Hva heter du?", { acceptedAnswers: ["Hva heter du", "Hva er navnet ditt"], representationType: "meaning_recognition" }),
        variant("no-eng-g3-sporsmal-what-is-your-name", "adult_challenge", "answer-own-name", "Svar på engelsk: «What is your name?»", "My name is {activePlayerProfile.displayName}.", { answerBinding: "activePlayerProfile.displayName", answerRuleId: "profile-display-name-v1", representationType: "dialogue_production" }),
        variant("no-eng-g3-sporsmal-what-is-your-name", "help", "meaning-choice", "Hva spør «What is your name?» om?", "hva du heter", { explanation: "Name betyr navn, så spørsmålet betyr «Hva heter du?»", helpOptions: [{ id: "A", label: "hva du heter", correct: true }, { id: "B", label: "hvor gammel du er" }, { id: "C", label: "hvor du bor" }], representationType: "choice" }),
        variant("no-eng-g3-sporsmal-what-is-your-name", "comeback", "respond-new-speaker", "Noen spør «What is your name?». Gi et passende engelsk svar.", "My name is {activePlayerProfile.displayName}.", { answerBinding: "activePlayerProfile.displayName", answerRuleId: "profile-display-name-v1", representationType: "dialogue_transfer" })
      ]
    },
    {
      essentialId: "no-nat-g3-arstider-rekkefolge",
      gradeLevel: 3,
      statement: "Kjenne rekkefølgen på årstidene.",
      subject: "Naturfag",
      variants: [
        variant("no-nat-g3-arstider-rekkefolge", "child_core", "after-vinter", "Hvilken årstid kommer etter vinter?", "vår", { acceptedAnswers: ["vår", "våren"], representationType: "next_in_sequence" }),
        variant("no-nat-g3-arstider-rekkefolge", "adult_challenge", "between-sommer-vinter", "Hvilken årstid ligger mellom sommer og vinter?", "høst", { acceptedAnswers: ["høst", "høsten"], representationType: "between_anchors" }),
        variant("no-nat-g3-arstider-rekkefolge", "help", "after-vaar", "Hvilken årstid kommer etter vår?", "sommer", { explanation: "Rekkefølgen er vår, sommer, høst, vinter.", helpOptions: [{ id: "A", label: "sommer", correct: true }, { id: "B", label: "høst" }, { id: "C", label: "vinter" }], representationType: "choice" }),
        variant("no-nat-g3-arstider-rekkefolge", "comeback", "before-vaar", "Hvilken årstid kommer rett før vår?", "vinter", { acceptedAnswers: ["vinter", "vinteren"], representationType: "previous_in_sequence" })
      ]
    },
    {
      essentialId: "no-nat-g3-sanser-horsel",
      gradeLevel: 3,
      statement: "Knytte hørsel til lyd og ørene.",
      subject: "Naturfag",
      variants: [
        variant("no-nat-g3-sanser-horsel", "child_core", "music", "Hvilken sans bruker du når du hører musikk?", "hørsel", { acceptedAnswers: ["hørsel", "hørselen", "høresansen"], representationType: "sense_recognition" }),
        variant("no-nat-g3-sanser-horsel", "adult_challenge", "alarm", "Du hører en alarm uten å se den. Hvilken sans og hvilken kroppsdel gir deg informasjonen?", "hørselen og ørene", { acceptedAnswers: ["hørselen og ørene", "høresansen og ørene"], representationType: "sense_organ_transfer" }),
        variant("no-nat-g3-sanser-horsel", "help", "organ-hearing", "Hvilken kroppsdel bruker du mest for å høre?", "ørene", { explanation: "Ørene fanger opp lyd, og hørselen gir oss informasjon.", helpOptions: [{ id: "A", label: "ørene", correct: true }, { id: "B", label: "øynene" }, { id: "C", label: "nesen" }], representationType: "choice" }),
        variant("no-nat-g3-sanser-horsel", "comeback", "thunder", "Torden lager lyd. Hvilken sans fanger den opp?", "hørsel", { acceptedAnswers: ["hørsel", "hørselen", "høresansen"], representationType: "natural_event_transfer" })
      ]
    },
    {
      essentialId: "no-sam-g3-barns-rett-til-utdanning",
      gradeLevel: 3,
      statement: "Forstå at alle barn har rett til utdanning.",
      subject: "Samfunnsfag",
      variants: [
        variant("no-sam-g3-barns-rett-til-utdanning", "child_core", "school-learning", "Hvilken rett har alle barn som handler om skole og læring?", "rett til utdanning", { acceptedAnswers: ["rett til utdanning", "rett til skole", "rett til skolegang"], representationType: "direct_right_recall" }),
        variant("no-sam-g3-barns-rett-til-utdanning", "adult_challenge", "denied-school", "Et barn får ikke lov til å gå på skole. Hvilken barnerett blir brutt?", "retten til utdanning", { acceptedAnswers: ["retten til utdanning", "rett til skole", "rett til skolegang"], representationType: "rights_violation_scenario" }),
        variant("no-sam-g3-barns-rett-til-utdanning", "help", "right-choice", "Hvilken av disse er en rett alle barn har?", "å gå på skole og få utdanning", { explanation: "Alle barn har rett til utdanning og mulighet til å lære.", helpOptions: [{ id: "A", label: "å gå på skole og få utdanning", correct: true }, { id: "B", label: "å velge læreren sin" }, { id: "C", label: "å bestemme alle fag selv" }], representationType: "choice" }),
        variant("no-sam-g3-barns-rett-til-utdanning", "comeback", "education-means", "Fullfør meningen: «Barns rett til utdanning betyr at barn skal få mulighet til å …»", "gå på skole og lære", { acceptedAnswers: ["gå på skole", "gå på skole og lære", "få utdanning", "få opplæring"], representationType: "meaning_completion" })
      ]
    },
    {
      essentialId: "no-sam-g3-samene-urfolk",
      gradeLevel: 3,
      statement: "Vite at samene er urfolk i Norge.",
      subject: "Samfunnsfag",
      variants: [
        variant("no-sam-g3-samene-urfolk", "child_core", "sami-to-category", "Samene er hvilket folk i Norge?", "urfolk", { acceptedAnswers: ["urfolk", "et urfolk", "Norges urfolk"], representationType: "category_recall" }),
        variant("no-sam-g3-samene-urfolk", "adult_challenge", "category-to-sami", "Hvilken folkegruppe er urfolk i Norge?", "samene", { acceptedAnswers: ["samene", "det samiske folket", "samisk urfolk"], representationType: "reverse_entity_recall" }),
        variant("no-sam-g3-samene-urfolk", "help", "indigenous-choice", "Hvem er urfolk i Norge?", "samene", { explanation: "Samene er urfolk i Norge.", helpOptions: [{ id: "A", label: "samene", correct: true }, { id: "B", label: "kvenene" }, { id: "C", label: "vikingene" }], representationType: "choice" }),
        variant("no-sam-g3-samene-urfolk", "comeback", "sami-category-cloze", "Fullfør: «Samene er ___ i Norge.»", "urfolk", { acceptedAnswers: ["urfolk", "et urfolk", "Norges urfolk"], representationType: "fact_completion" })
      ]
    }
  ];

  const variants = families.flatMap((family) => family.variants);
  return {
    contractVersion: "family-game-variants-v0.2",
    families,
    ROLE_ORDER,
    subjects: ["Matematikk", "Norsk", "Engelsk", "Naturfag", "Samfunnsfag"],
    variants
  };
});
