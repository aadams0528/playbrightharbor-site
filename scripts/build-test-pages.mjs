// Rebuilds the hidden test pages from each game's master copy (src/game.html).
// Run by .github/workflows/refresh-test-pages.yml, or by hand:
//   node scripts/build-test-pages.mjs <folder holding the game repos>
// The folder must hold one checkout per game, named like the repo (spellburst, number-blast, ...).
// A game that fails to build keeps its old page; the others still update.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync, rmSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const SRC = process.argv[2];
if (!SRC) throw new Error("Usage: node scripts/build-test-pages.mjs <folder holding the game repos>");

// Sumburst testers' visits and track() events go to the site's Google Analytics.
const SUMBURST_GA = `<!-- Google Analytics (Firebase web app "Bright Harbor site"): counts visits and the game's track() events from testers. -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-WVY0M2MBJV"></script>
<script>
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());
gtag('config','G-WVY0M2MBJV',{page_title:'Sumburst test'});
</script>
`;

const GAMES = [
  { repo: "spellburst", name: "Wordglow", page: "wordglow-test/index.html", words: true,
    files: ["cloudsave.js", "defs.json", "rarity.txt", "WORDNET-LICENSE.txt", "sumburst-icon.png"] },
  { repo: "number-blast", name: "Sumburst", page: "sumburst-test.html", head: SUMBURST_GA },
  { repo: "color-rivers", name: "Color Rivers", page: "color-rivers-test.html" },
  { repo: "whenly", name: "Whenly", page: "whenly-test/index.html", dirs: ["art"] },
];

function build(g) {
  const src = join(SRC, g.repo, "src");
  let game = readFileSync(join(src, "game.html"), "utf8");
  if (/<!doctype|<html/i.test(game)) throw new Error("src/game.html already has its own <html> wrapper");
  // Test pages are beta builds: test ads and tester tools stay on.
  game = game.replace(/(["'])__BUILD__\1/g, "$1beta$1");
  if (g.words) {
    if (!game.includes("__WORDS__")) throw new Error("src/game.html is missing the __WORDS__ placeholder");
    game = game.replace("__WORDS__", readFileSync(join(src, "words.txt"), "utf8").trim());
  }
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<!-- Built from aadams0528/${g.repo} src/game.html (beta build) by scripts/build-test-pages.mjs. Unlisted test page: not linked from the site. Don't edit by hand; change the game repo instead. -->
<title>${g.name} (test version)</title>
${g.head || ""}</head>
<body>
${game.trimEnd()}

</body>
</html>
`;
  const out = g.page, dir = dirname(out);
  mkdirSync(dir, { recursive: true });
  writeFileSync(out, html);
  for (const f of g.files || []) copyFileSync(join(src, f), join(dir, f));
  for (const d of g.dirs || []) {
    if (!existsSync(join(src, d))) throw new Error(`src/${d}/ is missing`);
    rmSync(join(dir, d), { recursive: true, force: true }); // drop art the game no longer has
    cpSync(join(src, d), join(dir, d), { recursive: true });
  }
}

const failed = [];
for (const g of GAMES) {
  try { build(g); console.log(`${g.name}: rebuilt ${g.page}`); }
  catch (e) { failed.push(`${g.name}: ${e.message}`); console.error(`${g.name}: NOT rebuilt (${e.message})`); }
}
// The workflow puts this list in the PR and fails the run so a broken game gets noticed.
writeFileSync(join(process.env.RUNNER_TEMP || tmpdir(), "test-pages-failed.txt"), failed.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY && failed.length) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Not rebuilt:\n${failed.map(f => `- ${f}`).join("\n")}\n`);
