import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(directory, "index.html");
const downloadPath = path.join(directory, "qualitative-analysis-agent-manifest.md");

function decodeText(markup) {
  const entities = new Map([
    ["&amp;", "&"],
    ["&quot;", '"'],
    ["&#39;", "'"],
    ["&lt;", "<"],
    ["&gt;", ">"],
  ]);

  return markup
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|quot|#39|lt|gt);/g, (entity) => entities.get(entity))
    .replace(/\s+/g, " ")
    .trim();
}

function findMarkup(source, pattern, name) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Cannot build manifest download: ${name} is missing`);
  }
  return match[1];
}

function findRuleGroups(page) {
  return [...page.matchAll(/<section class="rule-group"[^>]*>([\s\S]*?)<\/section>/g)].map(
    ([, section]) => {
      const header = findMarkup(section, /<header>([\s\S]*?)<\/header>/, "rule group header");
      const rules = [...section.matchAll(
        /<li\s+data-rule-id="([^"]+)"><b>([^<]+)<\/b><span>([^<]+)<\/span><\/li>/g,
      )].map(([, id, code, instruction]) => ({
        id,
        code: decodeText(code),
        instruction: decodeText(instruction),
      }));

      return {
        title: decodeText(findMarkup(header, /<h2>([\s\S]*?)<\/h2>/, "rule group title")),
        description: decodeText(findMarkup(header, /<div>[\s\S]*?<p>([\s\S]*?)<\/p>/, "rule group description")),
        rules,
      };
    },
  );
}

export function renderManifestMarkdown(page) {
  const pageHeader = findMarkup(
    page,
    /<header class="page-header">([\s\S]*?)<\/header>/,
    "page header",
  );
  const title = decodeText(findMarkup(pageHeader, /<h1>([\s\S]*?)<\/h1>/, "title"));
  const standfirst = decodeText(
    findMarkup(pageHeader, /<p class="standfirst">([\s\S]*?)<\/p>/, "summary"),
  );
  const introduction = decodeText(
    findMarkup(pageHeader, /<p>(This manifest governs[\s\S]*?)<\/p>/, "introduction"),
  );
  const scope = findMarkup(
    pageHeader,
    /<section class="scope-boundary"[^>]*>([\s\S]*?)<\/section>/,
    "scope",
  );
  const purpose = decodeText(
    findMarkup(scope, /<h2>What it does<\/h2>\s*<p>([\s\S]*?)<\/p>/, "purpose"),
  );
  const exclusions = [...findMarkup(
    scope,
    /<h2>What it does not govern<\/h2>\s*<ul>([\s\S]*?)<\/ul>/,
    "scope exclusions",
  ).matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, exclusion]) => decodeText(exclusion));
  const attribution = decodeText(
    findMarkup(pageHeader, /<p>(George Jensen[\s\S]*?)<\/p>/, "attribution"),
  );
  const groups = findRuleGroups(page);
  const ruleCount = groups.reduce((count, group) => count + group.rules.length, 0);

  if (groups.length !== 5 || ruleCount !== 62) {
    throw new Error(
      `Cannot build manifest download: expected 5 groups and 62 rules, found ${groups.length} groups and ${ruleCount} rules`,
    );
  }

  const lines = [
    `# ${title}`,
    "",
    standfirst,
    "",
    introduction,
    "",
    "## Scope",
    "",
    "### What it does",
    "",
    purpose,
    "",
    "### What it does not govern",
    "",
    ...exclusions.map((exclusion) => `- ${exclusion}`),
    "",
    attribution,
    "",
    "## Rules",
  ];

  for (const group of groups) {
    lines.push("", `### ${group.title}`, "", group.description, "");
    lines.push(
      ...group.rules.map(
        (rule) => `- **${rule.code}** (${rule.id}): ${rule.instruction}`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function writeManifestDownload() {
  const page = fs.readFileSync(pagePath, "utf8");
  fs.writeFileSync(downloadPath, renderManifestMarkdown(page));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeManifestDownload();
}
