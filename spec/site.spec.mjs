import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const homepagePath = path.join(root, "index.html");
const criteriaPath = path.join(root, "dstl-method-criteria", "index.html");
const approachPath = path.join(root, "qualitative-concept-analysis", "index.html");
const trackerPath = path.join(root, "analytics", "record.php");
const dashboardPath = path.join(root, "analytics", "index.php");
const analyticsPath = path.join(root, "analytics", "analytics.php");
const analyticsScriptPath = path.join(root, "js", "analytics.js");

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

test("links to the manifest from the public homepage", () => {
  const homepage = readPage(homepagePath);

  assert.match(homepage, /href="\/dstl-method-criteria\/"/);
  assert.match(homepage, /Qualitative Analysis Agent Manifest/);
});

test("links the manifest and its approach in both directions", () => {
  const manifest = readPage(criteriaPath);
  const approach = readPage(approachPath);

  assert.match(manifest, /href="\/qualitative-concept-analysis\/">How this manifest is used/);
  assert.match(approach, /href="\/dstl-method-criteria\/">View the 62-rule agent manifest/);
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
  assert.match(page, /configured agent proposes separations/);
  assert.match(page, /reviewable collection of evidence-linked concept proposals/);
  assert.match(page, /named researchers review the proposals and decide what is accepted/);
  assert.match(page, /manifest’s current formulation was created by George Jensen/);
  assert.match(page, /does not represent her method or imply her endorsement/);
});

test("introduces the manifest to people who were not in the room", () => {
  const page = readPage(criteriaPath);

  assert.match(
    page,
    /<title>Qualitative Transcript Concept Rules — Agent Manifest \| ResearchOps\.ai<\/title>/,
  );
  assert.match(page, /<meta name="viewport"/);
  assert.match(page, /<p class="eyebrow">Agent manifest configuration<\/p>/);
  assert.match(page, /<h1>Qualitative transcript concept rules<\/h1>/);
  assert.match(
    page,
    /Sixty-two configuration rules governing how an analysis agent turns qualitative interview transcripts into evidence-linked concept proposals\./,
  );
  assert.match(page, /named researchers review them and decide what is accepted/);
  assert.doesNotMatch(page, /\bprompts?\b|operational checklist/i);
});

test("describes the list as configuration rather than a human checklist", () => {
  const manifest = readPage(criteriaPath);
  const approach = readPage(approachPath);

  assert.match(manifest, /This manifest configures how an analysis agent/);
  assert.match(approach, /manifest configuration/);
  assert.doesNotMatch(approach, /operational checklist|review prompts/i);
});

test("has a server-side analytics endpoint and dashboard", () => {
  assert.equal(fs.existsSync(trackerPath), true);
  assert.equal(fs.existsSync(dashboardPath), true);
  assert.equal(fs.existsSync(analyticsPath), true);
});

test("tracks only the agent manifest page", () => {
  assert.match(readPage(criteriaPath), /<script src="\/js\/analytics\.js" defer><\/script>/);
  assert.doesNotMatch(readPage(homepagePath), /analytics\.js/);
  assert.doesNotMatch(readPage(approachPath), /analytics\.js/);

  const script = readPage(analyticsScriptPath);
  assert.match(script, /\/dstl-method-criteria\//);
  assert.doesNotMatch(script, /localStorage|visitor[_-]id/i);
});

test("requires server secrets without shipping a fallback password", () => {
  const analytics = readPage(analyticsPath);
  const backend = `${analytics}\n${readPage(dashboardPath)}\n${readPage(trackerPath)}`;

  assert.match(backend, /ANALYTICS_PASSWORD_HASH/);
  assert.match(backend, /ANALYTICS_HASH_KEY/);
  assert.match(analytics, /dirname\(__DIR__, 2\) \. '\/\.env'/);
  assert.doesNotMatch(backend, /password[^\n]{0,40}(default|fallback)/i);
});

test("keeps analytics data and deployment secrets out of git", () => {
  const ignore = readPage(path.join(root, ".gitignore"));

  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^analytics\/\.analytics-data\.php/m);
  assert.match(ignore, /^analytics\/\.analytics-data\.php\.lock$/m);
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
