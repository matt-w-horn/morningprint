---
name: apps-script-deploy
description: Push-first deploy ritual for this repo's Google Apps Script deployment (clasp). Use whenever deploying, pushing, or verifying Apps Script code — "deploy this", "push to Apps Script", "clasp push" — and whenever the deployed Apps Script code looks stale, reverted, or doesn't match the local source.
---

# Apps Script deploy (push-first)

Local TypeScript is the source of truth: esbuild bundles `src/` into `dist/main.gs` and `clasp push` uploads it. The Apps Script web editor is never edited directly. The recurring failure mode (it has clobbered deploys twice) is a **stale editor browser tab**: an open editor session can silently save its old copy over a fresh push, and a cached tab can make a good deploy look stale during verification.

## The ritual

1. **Ask the user to close any open Apps Script editor tabs before pushing.** This is the step that prevents the silent-revert bug; don't skip it because the push "should" win.
2. **Build:** `npm run build` (tsc --noEmit + esbuild bundle). A failed build means nothing ships.
3. **Preview the push:** `npm run status` to list exactly which files would upload — expect only the bundle and `appsscript.json`.
4. **Push:** `npm run push` (wraps build + `clasp push`).
5. **Verify in a fresh tab:** `npx clasp open-script`, then confirm the change is present (spot-check a changed line or run the relevant entry point). Never verify in a tab that was already open — cached editors have shown stale code minutes after a successful push.

## If the remote looks stale or reverted

- Re-push once (`npm run push`) and re-verify in another fresh tab.
- If it reverts _again_, an editor session somewhere is saving over the push — find and close it (other machines and browser windows count), then push once more.
- To inspect what the remote actually holds, prefer `npm run status`; if you must `npm run pull`, remember it overwrites the local `dist/` copy — pull, diff against the built bundle, then rebuild to restore local truth.
- Never reconcile by editing in the web editor. Fix locally, rebuild, push.

## Repo specifics

`.clasp.json` is committed (scriptId only, no credentials). Entry points (`printDailyArt`, `testDailyArt`) must stay exported from `src/main.ts` and listed in `ENTRY_POINTS` in `build.js` — the existing time trigger references `printDailyArt` by name, so never rename it.
