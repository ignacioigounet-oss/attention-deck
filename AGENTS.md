# ATTENTION DECK — AGENT INSTRUCTIONS

Read `00_PRODUCT_VISION.md` first.

Before modifying code:

1. read relevant specification files;
2. inspect the existing implementation;
3. preserve the product hierarchy;
4. prefer small, testable changes;
5. never silently add features.

The product is science-informed, not clinical.
The production model is OpenAI.
Fable 5.1 is the development agent, not the runtime model.

Never expose secrets.
Never let the LLM directly write to the DB.
Never let the browser perform privileged operations.
Never treat “Ugly Start” as a UI feature.

Always run tests/typecheck/lint/build at the end of a phase.
