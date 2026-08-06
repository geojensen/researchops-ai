import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const homepagePath = path.join(root, "index.html");
const criteriaPath = path.join(root, "dstl-method-criteria", "index.html");

function readPage(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function findRuleIds(page) {
  return [...page.matchAll(/<li\s+data-rule-id="([^"]+)"/g)].map((match) => match[1]);
}

test("publishes the criteria at a stable subpage", () => {
  assert.equal(fs.existsSync(criteriaPath), true);
});

test("links to the criteria from the public homepage", () => {
  assert.match(readPage(homepagePath), /href="\/dstl-method-criteria\/"/);
});

test("introduces the page to people who were not in the room", () => {
  const page = readPage(criteriaPath);

  assert.match(page, /<title>DStL Method Criteria — Quick Reference \| ResearchOps\.ai<\/title>/);
  assert.match(page, /<meta name="viewport"/);
  assert.match(page, /review prompts/i);
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
