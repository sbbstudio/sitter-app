# Sitter content source

This directory is the machine-readable source of truth for versioned Sitter learning content.
Generated compatibility files are outputs; question wording must be reviewed here first.

## Current candidate

`content/packs/no/grade-4/casper-family-practice-v1.json` is the review candidate
**Er du smartere enn barnet ditt?** It contains 30 oral question families, six in each of
five subjects. Every family has four related variants:

- `child_core`: a short, one-step fourth-grade question for Casper.
- `adult_challenge`: a harder application of the same fourth-grade learning essential.
- `help`: three choices and immediate corrective feedback for Casper.
- `comeback`: a fresh child-level question after help or a miss.

The 30 child/adult pairs yield 60 core questions. The title is only a playful hook: feedback
never labels anyone smart or dumb, the adult cannot write to Casper's learner memory, and
steal answers must be locked before the answer is revealed.

The related learning essentials live in
`content/essentials/no/grade-4/family-practice-v1.json`. Curriculum references use the
versions applicable in the 2026/27 school year. MAT01-06, NOR01-08, ENG01-06 and NAT01-05
are marked valid from 2026-08-01; SAF01-04 remains the applicable social-studies plan.

## Validation

Run:

```sh
npm run content:validate
npm test
```

The validator fails on orphaned essentials, missing official source evidence, ambiguous
answer rubrics, invalid help choices, adult grade drift, unsafe memory ownership, missing
steal-before-reveal protection, or subject/count drift.

## Release boundary

The pack is `review`, not production-active. A human content/pedagogy review and the
separate Family Game design gate remain required before release. Match score, Casper's SRS
memory, and family celebration are separate state domains.
