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
const systemsPath = path.join(root, "how-research-systems-work", "index.html");
const interpretationArticlePath = path.join(
  root,
  "system-around-human-interpretation",
  "index.html",
);
const listeningArticlePath = path.join(
  root,
  "deep-learning-needs-deeper-listening",
  "index.html",
);
const indiArticlePath = path.join(root, "my-work-with-indi-young", "index.html");
const disneyPath = path.join(root, "disney", "index.html");
const externalLinkIconPath = path.join(root, "img", "external-link.svg");
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
  assert.match(
    page,
    /Download agent manifest \(\.md\)<\/a>\s+\|\s+<a href="\/qualitative-concept-analysis\/">How this manifest is used →<\/a>/,
  );

  const markdown = readPage(manifestDownloadPath);
  assert.equal(markdown, renderManifestMarkdown(page));

  const pageRules = [...page.matchAll(
    /<li\s+data-rule-id="([^"]+)">([\s\S]*?)<\/li>/g,
  )].map((match) => ({
    id: match[1],
    code: match[2].match(/<b>([^<]+)<\/b>/)[1],
    instruction: match[2].match(/<span>([^<]+)<\/span>/)[1],
  }));

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

test("publishes the complete words-to-try palettes on the page and in the download", () => {
  const published = [
    readPage(manifestPath).replace(/<[^>]+>/g, ""),
    readPage(manifestDownloadPath),
  ];
  const palettes = [
    "accept, acknowledge, adopt, agree, anticipate, assume, avoid, choose, decide, deliberate, ensure, figure out, forgive, justify, make sure, plan, ponder, promise, realize, recognize, struggle, suspect, think, weigh, wonder",
    "adore, appreciate, crack up, cry out, distrust, enjoy, envy, fear, hope, light up, marvel, panic, reel, tear up, worry",
    "Surprised — startled, confused, amazed, excited, shocked, dismayed, disillusioned, perplexed",
    "about, after, although, as if, at, because, before, besides, beyond, by, despite, due to, even though, except, from, if, including, instead of, like, past, since, so that, that, through, when, whereas, while, who",
    "Vague — communicate, consider, deal with, do, expect, manage, organize, plan on, use",
    "Passive — be, discover, experience, find, get, have, hear, know, let, need, observe, read",
    "Exterior — approve, believe, explain, feel like, feel that, hate, judge, like, love, prefer, want",
    "Session mode — compare, complain, critique, remember",
  ];

  for (const output of published) {
    for (const palette of palettes) {
      assert.equal(output.includes(palette), true);
    }
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

test("states the practice before asking anything of the reader", () => {
  const homepage = readPage(homepagePath);
  const practicePosition = homepage.indexOf("<h1>");
  const formPosition = homepage.indexOf("<form");

  assert.match(homepage, /<title>George Jensen — Research Systems \| ResearchOps\.ai<\/title>/);
  assert.match(homepage, /<meta name="description"/);
  assert.match(homepage, /<h1>I design and deploy research systems\.<\/h1>/);
  assert.ok(practicePosition > -1);
  assert.ok(formPosition > -1);
  assert.ok(practicePosition < formPosition);
});

test("shares the type system published on the rest of the site", () => {
  const homepage = readPage(homepagePath);

  assert.match(homepage, /<link rel="stylesheet" href="css\/criteria\.css">/);
  assert.match(homepage, /<link rel="stylesheet" href="css\/home\.css">/);
  assert.equal(fs.existsSync(path.join(root, "css", "home.css")), true);
  assert.equal(fs.existsSync(path.join(root, "css", "index.css")), false);
});

test("publishes the work a reader can inspect without asking", () => {
  const homepage = readPage(homepagePath);

  assert.match(
    homepage,
    /<a class="external-link" href="https:\/\/www\.theresearchopsreview\.com\/p\/what-ais-history-suggests-about-building-agentic-research-systems" target="_blank" rel="external noopener noreferrer"><span>Calibration Matters More Than Automation<\/span>&nbsp;<img class="external-icon" src="\/img\/external-link\.svg" alt="Opens in new tab" width="14" height="14"><\/a>/,
  );
  assert.match(
    homepage,
    /<a class="external-link" href="https:\/\/researchops\.md\/" target="_blank" rel="external noopener noreferrer"><span>ResearchOps\.md<\/span>&nbsp;<img class="external-icon" src="\/img\/external-link\.svg" alt="Opens in new tab" width="14" height="14"><\/a>/,
  );
  assert.equal(fs.existsSync(externalLinkIconPath), true);
  assert.match(
    readPage(path.join(root, "css", "home.css")),
    /\.external-icon\s*\{[^}]*width:\s*0?\.875rem;[^}]*height:\s*0?\.875rem;[^}]*object-fit:\s*contain;/s,
  );
  assert.match(homepage, /Calibration Matters More Than Automation/);
});

test("describes the practice without requiring the reader to know the vocabulary", () => {
  const homepage = readPage(homepagePath);
  const practice = homepage.slice(homepage.indexOf('<section class="practice"'));
  const section = practice.slice(0, practice.indexOf("</section>"));

  for (const jargon of [
    "deterministic",
    "trace schema",
    "evaluation fixture",
    "versioned contract",
    "review gate",
    "bounded evidence",
  ]) {
    assert.equal(section.toLowerCase().includes(jargon), false, `homepage still leads with "${jargon}"`);
  }

  assert.match(section, /href="\/how-research-systems-work\/">How these systems work/);
  assert.match(
    section,
    /Before research operations was a thing, I spent more than two decades in deep technology — cloud infrastructure, distributed delivery, data platforms, and data science, beginning in educational broadcasting and distance learning\. The throughline has been the same question: how an institution holds onto what it knows\./,
  );
  assert.doesNotMatch(section, /IHETS|1999/);
});

test("explains the vocabulary on a page of its own", () => {
  assert.equal(fs.existsSync(systemsPath), true);

  const page = readPage(systemsPath);

  assert.match(
    page,
    /<link rel="canonical" href="https:\/\/researchops\.ai\/how-research-systems-work\/">/,
  );
  assert.match(page, /<title>How Research Systems Work \| ResearchOps\.ai<\/title>/);
  assert.match(page, /<h2>Why several agents instead of one\?<\/h2>/);
  assert.match(page, /<h2>What does deterministic mean here\?<\/h2>/);
  assert.match(page, /<h2>What is a trace\?<\/h2>/);
  assert.match(page, /<h2>What is a review gate\?<\/h2>/);
  assert.match(page, /<h2>What breaks without this\?<\/h2>/);
});

test("defines each term where the reader meets it", () => {
  const page = readPage(systemsPath);

  for (const term of [
    "agent",
    "deterministic",
    "trace",
    "review gate",
    "provenance",
  ]) {
    assert.match(page, new RegExp(`<dt>[^<]*${term}[^<]*</dt>`, "i"));
  }

  assert.match(page, /<a class="brand" href="\/"/);
});

test("publishes the two completed articles as homepage subpages", () => {
  const homepage = readPage(homepagePath);
  const published = homepage.slice(homepage.indexOf('<section class="work"'));
  const section = published.slice(0, published.indexOf("</section>"));

  assert.equal(fs.existsSync(interpretationArticlePath), true);
  assert.equal(fs.existsSync(listeningArticlePath), true);
  assert.match(
    section,
    /href="\/system-around-human-interpretation\/">The System Around Human Interpretation<\/a>/,
  );
  assert.match(
    section,
    /href="\/deep-learning-needs-deeper-listening\/">Deep Learning Needs Deeper Listening: A Case for Progressive Agency<\/a>/,
  );

  const listeningPosition = section.indexOf("Deep Learning Needs Deeper Listening");
  const calibrationPosition = section.indexOf("Calibration Matters More Than Automation");
  const manifestPosition = section.indexOf("Qualitative Analysis Agent Manifest");
  const researchOpsPosition = section.indexOf("ResearchOps.md");
  const interpretationPosition = section.indexOf("The System Around Human Interpretation");

  assert.ok(listeningPosition < calibrationPosition);
  assert.ok(calibrationPosition < manifestPosition);
  assert.ok(manifestPosition < researchOpsPosition);
  assert.ok(researchOpsPosition < interpretationPosition);
});

test("speaks in the first person on the unlisted detail page", () => {
  const page = readPage(disneyPath);
  const headings = [...page.matchAll(/<h2>([^<]+)<\/h2>/g)].map(([, heading]) => heading);

  assert.match(page, /<h1>Research operations systems in practice<\/h1>/);
  assert.match(
    page,
    /<p class="standfirst">Four things my resume can only name in a single line\. What I built, how it holds together, and where I am still required\.<\/p>/,
  );
  assert.deepEqual(headings, [
    "How I built an analysis pipeline that renders its own board",
    "Why I keep the rejected grouping on the board",
    "What a year of method practice taught me",
    "Where I keep the evidence after a study ends",
  ]);
  assert.doesNotMatch(page, /\u2014/);
});

test("publishes the Indi Young essay as a homepage subpage", () => {
  const homepage = readPage(homepagePath);
  const published = homepage.slice(homepage.indexOf('<section class="work"'));
  const section = published.slice(0, published.indexOf("</section>"));
  const page = readPage(indiArticlePath);

  assert.match(section, /href="\/my-work-with-indi-young\/">My Work with Indi Young<\/a>/);
  assert.match(
    page,
    /<link rel="canonical" href="https:\/\/researchops\.ai\/my-work-with-indi-young\/">/,
  );
  assert.match(page, /<h1>My Work with Indi Young<\/h1>/);
  assert.match(
    page,
    /<p class="standfirst">Learning the method, challenging its boundaries, and carrying it toward enterprise qualitative AI\.<\/p>/,
  );
  assert.match(page, /<h2>The day Indi asked why I was quiet<\/h2>/);
  assert.match(page, /<h2>Building agents that do not erase the method<\/h2>/);
  assert.match(page, /<h2>The work I did not leave<\/h2>/);
  assert.match(page, /Evangelism without critique becomes branding\./);
  assert.match(
    page,
    /<a href="https:\/\/indiyoung\.com" target="_blank" rel="external noopener noreferrer">/,
  );
});

test("publishes each article in full at its canonical route", () => {
  const interpretation = readPage(interpretationArticlePath);
  const listening = readPage(listeningArticlePath);

  assert.match(
    interpretation,
    /<link rel="canonical" href="https:\/\/researchops\.ai\/system-around-human-interpretation\/">/,
  );
  assert.match(interpretation, /<h1>The System Around Human Interpretation<\/h1>/);
  assert.match(interpretation, /<h2>Why thinking styles feel timely<\/h2>/);
  assert.match(interpretation, /<h2>What cannot be automated away<\/h2>/);
  assert.match(interpretation, /The infrastructure is still there\./);

  assert.match(
    listening,
    /<link rel="canonical" href="https:\/\/researchops\.ai\/deep-learning-needs-deeper-listening\/">/,
  );
  assert.match(
    listening,
    /<h1>Deep Learning Needs Deeper Listening: A Case for Progressive Agency<\/h1>/,
  );
  assert.match(
    listening,
    /The machine(?:'|&#x27;)s achievement is scale\. The listener(?:'|&#x27;)s achievement is restraint\./,
  );
  assert.match(listening, /<h2>Source notes<\/h2>/);
  assert.match(listening, /href="https:\/\/openai\.com\/index\/chatgpt\/"/);
  assert.doesNotMatch(listening, /google\.com\/url|\[next article\]/);
});

test("introduces only the writing that is not published yet", () => {
  const homepage = readPage(homepagePath);
  const workPosition = homepage.indexOf('<section class="work"');
  const writingPosition = homepage.indexOf('<section class="writing"');
  const writing = homepage.slice(writingPosition);
  const section = writing.slice(0, writing.indexOf("</section>"));

  assert.ok(workPosition > -1);
  assert.ok(writingPosition > workPosition);
  assert.match(section, /Enterprise Research Systems in the Age of Work AI and GraphRAG/);
  assert.doesNotMatch(section, /Deep Learning Needs Deeper Listening/);
  assert.doesNotMatch(section, /From Kubernetes Clusters to Thinking Styles/);
});

test("marks unpublished writing as unlinked so no reader hits a dead end", () => {
  const homepage = readPage(homepagePath);
  const writing = homepage.slice(homepage.indexOf('<section class="writing"'));
  const section = writing.slice(0, writing.indexOf("</section>"));

  assert.doesNotMatch(section, /<a\s/);
  assert.match(section, /<p class="section-note">/);

  const styles = readPage(path.join(root, "css", "home.css"));

  assert.match(styles, /\.home-main \.section-note \{[^}]*margin-top: -14px;/s);
  assert.match(styles, /^\.section-note \{[^}]*margin-top: 16px;/ms);
});

test("keeps the mailing list beside the work rather than in front of it", () => {
  const homepage = readPage(homepagePath);
  const asidePosition = homepage.indexOf('<aside class="mailing-list"');
  const formPosition = homepage.indexOf("<form");

  assert.ok(asidePosition > -1);
  assert.ok(asidePosition < formPosition);
  assert.match(homepage, /name="contact-form"/);
  assert.match(homepage, /name="Full Name"/);
  assert.match(homepage, /name="Email"/);
  assert.match(homepage, /<script src="js\/script\.js"><\/script>/);
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
  assert.match(
    page,
    /It is not intended as a shortcut around qualitative research or researcher judgment\./,
  );
  assert.match(
    readPage(manifestDownloadPath),
    /It is not intended as a shortcut around qualitative research or researcher judgment\./,
  );
  assert.doesNotMatch(page, /\bprompts?\b|operational checklist/i);
});

test("links to Indi Young and directs readers to training", () => {
  const page = readPage(manifestPath);
  const markdown = readPage(manifestDownloadPath);

  assert.match(
    page,
    /<a href="https:\/\/indiyoung\.com" target="_blank" rel="noopener noreferrer">Indi Young’s<\/a>/,
  );
  assert.match(
    page,
    /To learn Thinking Styles from its source, explore training with Indi Young\./,
  );
  assert.match(
    markdown,
    /To learn Thinking Styles from its source, explore training with Indi Young\./,
  );
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
