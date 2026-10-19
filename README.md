# Bright Harbor Games website

Static site for https://playbrightharbor.com, hosted on GitHub Pages.

## Test pages (rebuilt automatically)

The hidden test pages (`wordglow-test/`, `sumburst-test.html`, `color-rivers-test.html`, `whenly-test/`) are built from each game repo's `src/game.html` by `scripts/build-test-pages.mjs`. Don't edit them by hand: change the game repo, and the page follows.

Every morning `.github/workflows/refresh-test-pages.yml` rebuilds them and, if anything changed, opens or updates one **Refresh test pages** PR. Merging it puts the new pages live. You can also run it any time from the Actions tab (Refresh test pages > Run workflow).

One-time setup:
1. **Make a read-only token.** GitHub > your picture > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token. Name it "Test page rebuild", pick an expiration (1 year), Repository access: "Only select repositories" and choose spellburst, number-blast, color-rivers and whenly. Permissions: Repository permissions > Contents > **Read-only**. Generate, then copy the token.
2. **Add it to this repo.** playbrightharbor-site > Settings > Secrets and variables > Actions > New repository secret. Name `GAME_REPOS_TOKEN`, paste the token, Add secret.
3. **Let the workflow open PRs.** playbrightharbor-site > Settings > Actions > General > Workflow permissions: tick "Allow GitHub Actions to create and approve pull requests", Save.

To rebuild by hand: put the four game repos side by side in one folder, then run `node scripts/build-test-pages.mjs <that folder>` from this repo.
