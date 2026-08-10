import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";

import {renderManifestMarkdown} from "../qualitative-analysis-agent-manifest/download.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const homepagePath = path.join(root, "index.html");
const manifestPath = path.join(root, "qualitative-analysis-agent-manifest", "index.html");
const manifestDownloadPath = path.join(
  root,
  "qualitative-analysis-agent-manifest",
  "qualitative-analysis-agent-manifest.md",
);
const legacyManifestPath = path.join(root, "dstl-method-criteria", "index.php");
const legacyManifestHtmlPath = path.join(root, "dstl-method-criteria", "index.html");
const approachPath = path.join(root, "qualitative-concept-analysis", "index.html");
const trackerPath = path.join(root, "analytics", "record.php");
const dashboardPath = path.join(root, "analytics", "index.php");
const analyticsPath = path.join(root, "analytics", "analytics.php");
const analyticsScriptPath = path.join(root, "js", "analytics.js");
const analyticsSetupPath = path.join(root, "analytics", "configure.php");

function readPage(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function findRuleIds(page) {
  return [...page.matchAll(/<li\s+data-rule-id="([^"]+)"/g)].map((match) => match[1]);
}

test("publishes the manifest at its unbranded route", () => {
  assert.equal(fs.existsSync(manifestPath), true);
  assert.match(
    readPage(manifestPath),
    /<link rel="canonical" href="https:\/\/researchops\.ai\/qualitative-analysis-agent-manifest\/">/,
  );
});

test("offers the complete agent manifest as a Markdown download", () => {
  assert.equal(fs.existsSync(manifestDownloadPath), true);

  const page = readPage(manifestPath);
  assert.match(
    page,
    /<a href="\.\/qualitative-analysis-agent-manifest\.md" download>Download agent manifest \(\.md\)<\/a>/,
  );

  const markdown = readPage(manifestDownloadPath);
  assert.equal(markdown, renderManifestMarkdown(page));

  const pageRules = [...page.matchAll(
    /<li\s+data-rule-id="([^"]+)"><b>([^<]+)<\/b><span>([^<]+)<\/span><\/li>/g,
  )].map((match) => ({id: match[1], code: match[2], instruction: match[3]}));

  assert.match(markdown, /^# Qualitative transcript concept rules$/m);
  assert.match(markdown, /^## Scope$/m);
  assert.equal(pageRules.length, 62);
  for (const rule of pageRules) {
    assert.equal(
      markdown.includes(`- **${rule.code}** (${rule.id}): ${rule.instruction}\n`),
      true,
    );
  }
});

test("redirects the branded legacy route without retaining a duplicate page", () => {
  assert.equal(fs.existsSync(legacyManifestPath), true);
  assert.equal(fs.existsSync(legacyManifestHtmlPath), false);

  const redirect = readPage(legacyManifestPath);
  assert.match(redirect, /header\([^;]+true, 301\)/);
  assert.match(redirect, /Location: https:\/\/researchops\.ai\/qualitative-analysis-agent-manifest\//);
  assert.doesNotMatch(redirect, /data-rule-id/);
});

test("publishes the approach at a stable subpage", () => {
  assert.equal(fs.existsSync(approachPath), true);
});

test("links to the manifest from the public homepage", () => {
  const homepage = readPage(homepagePath);

  assert.match(homepage, /href="\/qualitative-analysis-agent-manifest\/"/);
  assert.match(homepage, /Qualitative Analysis Agent Manifest/);
});

test("links the manifest and its approach in both directions", () => {
  const manifest = readPage(manifestPath);
  const approach = readPage(approachPath);

  assert.match(manifest, /href="\/qualitative-concept-analysis\/">How this manifest is used/);
  assert.match(
    approach,
    /href="\/qualitative-analysis-agent-manifest\/">View the 62-rule agent manifest/,
  );
});

test("answers the five quote-to-concept questions", () => {
  const page = readPage(approachPath);

  assert.match(page, /<h1>How the quote-to-concept manifest is used<\/h1>/);
  assert.match(page, /<h2>What does it govern\?<\/h2>/);
  assert.match(page, /<h2>What does it produce\?<\/h2>/);
  assert.match(page, /<h2>What happens next\?<\/h2>/);
  assert.match(page, /<h2>Who decides\?<\/h2>/);
  assert.match(page, /<h2>Who created it\?<\/h2>/);
});

test("states the quote-to-concept operation, handoff, governance, and authorship", () => {
  const page = readPage(approachPath);

  assert.match(page, /governs the quote-to-concept stage/);
  assert.match(page, /one verb-forward concept summary/);
  assert.match(page, /Keeping the interpretation beside its evidence does not eliminate interpretation or bias/);
  assert.match(page, /separately approved manifests/);
  assert.match(page, /Manifest approval authorizes the analytical instructions—not the resulting records or findings/);
  assert.match(page, /George Jensen created and maintains the current manifest configuration/);
  assert.match(page, /does not represent Indi Young’s method or imply her endorsement/);
});

test("introduces the manifest to people who were not in the room", () => {
  const page = readPage(manifestPath);

  assert.match(
    page,
    /<title>Qualitative Transcript Concept Rules — Agent Manifest \| ResearchOps\.ai<\/title>/,
  );
  assert.match(page, /<meta name="viewport"/);
  assert.match(page, /<p class="eyebrow">Agent manifest configuration<\/p>/);
  assert.match(page, /<h1>Qualitative transcript concept rules<\/h1>/);
  assert.match(
    page,
    /Sixty-two rules for turning interview quotations into verb-forward, participant-centered concept records that remain tied to exact transcript evidence\./,
  );
  assert.match(page, /This manifest governs one stage of qualitative analysis/);
  assert.doesNotMatch(page, /\bprompts?\b|operational checklist/i);
});

test("states the manifest scope before presenting the rules", () => {
  const page = readPage(manifestPath);
  const scopePosition = page.indexOf('<section class="scope-boundary" id="scope"');
  const rulesPosition = page.indexOf('<nav class="group-index"');

  assert.ok(scopePosition > -1);
  assert.ok(scopePosition < rulesPosition);
  assert.match(page, /Turn transcript quotations into verb-forward, participant-centered, evidence-linked concept records for researcher review\./);
  assert.match(page, /Cross-participant grouping/);
  assert.doesNotMatch(page, /Thinking Style formation/);
  assert.doesNotMatch(page, /Mental Model Skyline towers/);
  assert.match(page, /Themes or research findings/);
  assert.match(page, /Product requirements/);
  assert.match(page, /Recommendations/);
});

test("describes the list as configuration rather than a human checklist", () => {
  const manifest = readPage(manifestPath);
  const approach = readPage(approachPath);

  assert.match(manifest, /It configures how an agent handles boundaries/);
  assert.match(approach, /manifest configuration/);
  assert.doesNotMatch(approach, /operational checklist|review prompts/i);
});

test("leaves contact promotion out until its placement is resolved", () => {
  const publishedPages = [readPage(manifestPath), readPage(approachPath)].join("\n");

  assert.doesNotMatch(publishedPages, /profile-contact|linkedin\.com|linkedin\.png/i);
  assert.doesNotMatch(publishedPages, /geo\s*@|Copy email address|Email George/i);
  assert.equal(fs.existsSync(path.join(root, "img", "linkedin.png")), false);
  assert.equal(fs.existsSync(path.join(root, "js", "contact.js")), false);
});

test("has a server-side analytics endpoint, dashboard, and safe setup command", () => {
  assert.equal(fs.existsSync(trackerPath), true);
  assert.equal(fs.existsSync(dashboardPath), true);
  assert.equal(fs.existsSync(analyticsPath), true);
  assert.equal(fs.existsSync(analyticsSetupPath), true);

  const setup = readPage(analyticsSetupPath);
  assert.match(setup, /Confirm analytics password/);
  assert.match(setup, /stty -echo/);
  assert.doesNotMatch(setup, /\$argv\[1\]/);
});

test("tracks only the agent manifest page", () => {
  assert.match(readPage(manifestPath), /<script src="\/js\/analytics\.js" defer><\/script>/);
  assert.doesNotMatch(readPage(homepagePath), /analytics\.js/);
  assert.doesNotMatch(readPage(approachPath), /analytics\.js/);

  const script = readPage(analyticsScriptPath);
  assert.match(script, /\/qualitative-analysis-agent-manifest\//);
  assert.doesNotMatch(script, /\/dstl-method-criteria\//);
  assert.doesNotMatch(script, /localStorage|visitor[_-]id/i);
});

test("excludes a browser from tracking after its administrator signs in", () => {
  const dashboard = readPage(dashboardPath);
  const tracker = readPage(trackerPath);

  assert.match(dashboard, /setcookie\('researchops_analytics_exclude', '1'/);
  assert.match(tracker, /\$_COOKIE\['researchops_analytics_exclude'\]/);
});

test("requires server secrets without shipping a fallback password", () => {
  const analytics = readPage(analyticsPath);
  const backend = `${analytics}\n${readPage(dashboardPath)}\n${readPage(trackerPath)}`;

  assert.match(backend, /ANALYTICS_PASSWORD_HASH/);
  assert.match(backend, /ANALYTICS_HASH_KEY/);
  assert.match(analytics, /findAnalyticsEnvironmentPaths/);
  assert.match(analytics, /normalizeAnalyticsSetting/);
  assert.doesNotMatch(backend, /password[^\n]{0,40}(default|fallback)/i);
});

test("leaves the branded path only in its redirect", () => {
  const activePages = [
    homepagePath,
    manifestPath,
    approachPath,
    analyticsScriptPath,
    trackerPath,
    dashboardPath,
  ].map(readPage).join("\n");

  assert.doesNotMatch(activePages, /\/dstl-method-criteria\//);
});

test("keeps analytics data and deployment secrets out of git", () => {
  const ignore = readPage(path.join(root, ".gitignore"));

  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /^analytics\/\.analytics-data\.php/m);
  assert.match(ignore, /^analytics\/\.analytics-data\.php\.lock$/m);
});

test("publishes all 62 rules once", () => {
  const ids = findRuleIds(readPage(manifestPath));

  assert.equal(ids.length, 62);
  assert.equal(new Set(ids).size, 62);
});

test("preserves the five current group counts", () => {
  const ids = findRuleIds(readPage(manifestPath));
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
  const page = readPage(manifestPath);

  assert.doesNotMatch(page, /commonplace2026|raw\/courses|FTS lesson|handout TS_/i);
});
