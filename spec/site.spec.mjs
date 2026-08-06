import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const homepagePath = path.join(root, "index.html");
const criteriaPath = path.join(root, "dstl-method-criteria", "index.html");
const approachPath = path.join(root, "qualitative-concept-analysis", "index.html");

function readPage(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function findRuleIds(page) {
  return [...page.matchAll(/<li\s+data-rule-id="([^"]+)"/g)].map((match) => match[1]);
}

test("publishes the criteria at a stable subpage", () => {
  assert.equal(fs.existsSync(criteriaPath), true);
});

test("publishes the approach at a stable subpage", () => {
  assert.equal(fs.existsSync(approachPath), true);
});

test("links to the criteria from the public homepage", () => {
  assert.match(readPage(homepagePath), /href="\/dstl-method-criteria\/"/);
});

test("links the checklist and its approach in both directions", () => {
  assert.match(readPage(criteriaPath), /href="\/qualitative-concept-analysis\/"/);
  assert.match(readPage(approachPath), /href="\/dstl-method-criteria\/"/);
});

test("answers the four orienting questions", () => {
  const page = readPage(approachPath);

  assert.match(page, /<h1>Evidence-linked qualitative concept analysis<\/h1>/);
  assert.match(page, /<h2>What method is this\?<\/h2>/);
  assert.match(page, /<h2>What do people get out of it\?<\/h2>/);
  assert.match(page, /<h2>What role does George Jensen play\?<\/h2>/);
  assert.match(page, /<h2>Who created it\?<\/h2>/);
});

test("states the operation, output, governance, and authorship", () => {
  const page = readPage(approachPath);

  assert.match(page, /qualitative interview transcripts/);
  assert.match(page, /reviewable collection of concept records/);
  assert.match(page, /AI can propose records and reasoning, but named researchers decide what is accepted/);
  assert.match(page, /current formulation was created by George Jensen/);
  assert.match(page, /does not represent her method or imply her endorsement/);
});

test("introduces the page to people who were not in the room", () => {
  const page = readPage(criteriaPath);

  assert.match(page, /<title>DStL Method Criteria — Quick Reference \| ResearchOps\.ai<\/title>/);
  assert.match(page, /<meta name="viewport"/);
  assert.match(page, /review prompts/i);
  assert.match(
    page,
    /support researcher judgment when turning qualitative interview transcripts into concept records and summaries/,
  );
  assert.match(page, /not automatic verdicts/i);
  assert.match(page, /<p class="eyebrow">Operational checklist<\/p>/);
  assert.match(
    page,
    /This is an operational checklist informed by study of Indi Young’s methods—not course material or a substitute for those methods\./,
  );
  assert.doesNotMatch(page, /DStL’s public operational checklist/);
});

test("publishes all 62 rules once", () => {
  const ids = findRuleIds(readPage(criteriaPath));

  assert.equal(ids.length, 62);
  assert.equal(new Set(ids).size, 62);
});

test("preserves the five current group counts", () => {
  const ids = findRuleIds(readPage(criteriaPath));
  const count = (family) => ids.filter((id) => id.startsWith(`IY-EDS-${family}-`)).length;

  assert.deepEqual(
    {
      QS: count("QS"),
      WP: count("WP"),
      TC: count("TC"),
      JC: count("JC"),
      FC: count("FC"),
    },
    {QS: 14, WP: 5, TC: 16, JC: 17, FC: 10},
  );
});

test("keeps private source locations and course citations off the public page", () => {
  const page = readPage(criteriaPath);

  assert.doesNotMatch(page, /commonplace2026|raw\/courses|FTS lesson|handout TS_/i);
});
