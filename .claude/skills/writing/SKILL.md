---
name: writing
description: Style guide for writing prose that human beings will read. Use whenever writing or revising more than a couple of sentences of human-facing text — READMEs, documentation, PR descriptions, issue text, release notes, emails, announcements, code-adjacent explanations, reports — even if the user never mentions style or "writing". Also use when the user asks to review, edit, or de-AI-ify existing prose.
---

# Writing for humans

Code is for computers; prose is for people. A reader gives you their attention on the assumption that a person chose these words for a reason. Text that reads like a language model wrote it breaks that assumption, and readers now recognize the patterns instantly. The goal of this skill is prose with character: varied, imperfect, specific.

## Principles

1. **Say the thing.** Lead with the point. If a sentence exists to build atmosphere, cut it and see if anything is lost.
2. **Concrete beats abstract.** "Restarts drop about 40 requests" lands; "impacts reliability" doesn't. Numbers, filenames, commands, and examples carry more meaning than adjectives.
3. **Vary the rhythm.** Uniform sentence length is a machine tell. Let some sentences run long and others sit short, because that's how people actually write.
4. **One point per paragraph, made once.** Trust the reader. Don't re-summarize what you said two paragraphs ago, and don't announce what you're about to say.
5. **Plain verbs, plain words.** Things don't "serve as" or "stand as testament to"; they _are_. Prefer "use" to "leverage", "look at" to "delve into".
6. **Earn every intensifier.** "Critical", "seamless", "powerful", and "game-changing" are claims, not descriptions. Show the property instead of asserting it.
7. **Format only when structure is real.** Bullets suit genuinely parallel items. If the bullets are full sentences with bolded topic labels, it probably wants to be a paragraph.

## The tells to avoid

These are the highest-frequency AI-writing patterns, from tropes.fyi. One instance can be fine; clusters are the giveaway. When editing existing text, hunt for these first.

- **Negative parallelism** — "It's not X — it's Y." The single most-recognized tell. State Y directly.
- **Countdown reveals** — "Not X. Not Y. Just Z." False tension; just say Z.
- **Rhetorical Q&A** — "The result? Devastating." Asking a question only to answer it yourself.
- **Em-dash addiction** — more than a couple per page reads as generated. Commas, periods, and parentheses exist.
- **Bold-first bullets** — every bullet opening with a **Bolded Label:** followed by explanation, list after list.
- **Fractal summaries** — intro promising three points, three points, then a recap of the three points, at every level of nesting.
- **False suspense** — "Here's the kicker", "But there's a catch", "And that's when everything changed."
- **Patronizing analogies** — "Think of it as a post office for your data."
- **Buzzword vocabulary** — delve, tapestry, landscape, testament, pivotal, robust, seamless, crucial, comprehensive.
- **Hedging filler** — "It's worth noting that", "It's important to remember", "In today's fast-paced world."
- **Announced structure** — "Let's break this down", "In conclusion". Structure should be visible, not narrated.
- **Vague attribution** — "Experts agree", "Many developers find". Name the source or drop the claim.

The full catalog of 33 tropes with examples is in [references/tropes.md](references/tropes.md). Read it when editing a document that smells generated, when the user asks for a style pass, or when writing anything longer than a page.

## By format

- **READMEs**: The first paragraph answers "what is this and why would I use it". Show a real invocation and real output early. Cut sections that restate the code (a config table beats prose describing each option).
- **PR descriptions / commit messages**: What changed and why, in that order, past tense, no sales pitch. Reviewers want the risk surface ("touches the retry path") more than a feature tour.
- **Issues / bug reports**: Symptom, reproduction, expectation, actual. Resist narrating the debugging journey unless it changes the diagnosis.
- **Docs and specs**: For a substantial document (design doc, proposal, spec), the doc-coauthoring skill, if it's installed, has a full workflow — context gathering, section-by-section refinement, then testing the doc against a reader with no context. Use it when available; this skill governs the sentences, that one governs the process.

## Self-check before delivering

Reread the draft as the intended reader. Would any sentence make them roll their eyes or skim? Count the em-dashes. Search for "not just", "isn't just" and "it's about". If the piece could have been generated from its own headings, it needs more specifics.
