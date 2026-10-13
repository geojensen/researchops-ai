import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://researchops.ai";

function deployedPages() {
  const listing = execFileSync("git", ["ls-files", "index.html", "*/index.html"], {
    cwd: root,
    encoding: "utf8",
  });
  return listing.split("\n").filter(Boolean);
}

function isIndexable(relativePath) {
  const page = fs.readFileSync(path.join(root, relativePath), "utf8");
  const robots = page.match(/<meta name="robots" content="([^"]*)">/);
  return !robots || !/noindex/.test(robots[1]);
}

function routeFor(relativePath) {
  const directory = path.dirname(relativePath);
  return directory === "." ? `${origin}/` : `${origin}/${directory}/`;
}

function sitemapLocations() {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location);
}

test("lists exactly the deployed pages that allow indexing", () => {
  const expected = deployedPages().filter(isIndexable).map(routeFor).sort();
  const actual = sitemapLocations().sort();

  assert.deepEqual(actual, expected);
});

test("points crawlers at the sitemap from robots.txt", () => {
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");

  assert.match(robots, /^User-agent: \*\nAllow: \/\n/);
  assert.match(robots, /^Sitemap: https:\/\/researchops\.ai\/sitemap\.xml$/m);
});
