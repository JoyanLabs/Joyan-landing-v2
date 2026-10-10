# Dither iteration

## Objective and scope

Integrate original baked halftone assets on `test/motion-graphics`, preserving the five existing argument films and adding no client JavaScript. Detailed rationale and historical evidence: `docs/PLAN-ITERACION-DITHER.md`. The completed spike remains in `odd/tasks/dither-look-spike.md`.

## Constraints

- RDD is disabled for this clone by explicit user decision; do not enable it.
- No provider/model configuration changes are authorized or needed.
- Local scoped work-unit commits are authorized by the live session standing permission. No push, PR or merge as part of this closure; preserve repository remote-confirmation policy.
- Preserve F1 as the live hero film; the poster is not normally visible during playback.
- Brand amber remains reserved for gates/live states.
- Playwright is a local external toolchain, not a project/CI dependency.
- Definitive narrative copy is excluded from eventual visual delivery pending branding review. The local committed-path scope gate enforces that boundary when run; the experimental branch still contains historic narrative, so a whole-branch delivery is rejected. This is not CI enforcement, a semantic branding review or a copy-free delivery branch.

## Tasks and evidence

- [x] WU2 — Importable renderer and determinism gate. Commit `9535e04`; J1 order checks pass and historical MP4 hash unchanged.
- [x] WU11 — F1/F5 seek purity. Commit `19b0d7c`; all five films pass; encoded identity evidence is limited to blur-1 H.264.
- [x] WU4 — Documentation reconciliation. Commit `39201b5`; citation audit and project checks pass.
- [x] WU5 — Measure displayed density using actual browser boxes. Commits `0dd68f3`, `b89fd54`; choose displayed pitch, not one universal source cell size.
- [x] WU6 — Tone hero poster and isolated local builder. Commits `1f95d7d`, `a702ef0`; 1600×900, 11916 bytes, cell 7; project checks do not overwrite it.
- [x] WU9 — **Verified for reduced-motion poster:** shared proportional ring/block+gate composition and localized reduced-motion-only scrim aperture; independent framing/recognition/content-clearance GREEN for 12 Chromium contexts (ES/EN × 390/768/1440 × JS/no-JS). Normal F1 CSS/attributes and client chunks unchanged. Local work-unit commit `bed795f` includes behavior, regression checker and WU9 documentation. Coverage is not universal loading/codec fallback acceptance.
- [x] WU8 — **Verified:** independent static OG1 and committed tone input; browser-free `pnpm generate:dither` remains sole final OG writer. OG1200×628,6571bytes,cell16,64neutral/amber colors; existing JOYAN mask preserved48187BONEpixels. Builder and generator repeat hashes identical; independent generator/budget/checker/meta/preservation GREEN. Local work-unit commit `1aab883` includes OG generator/builder/input, regression checks and WU8 documentation. Future-input chroma/opacity validation gap is documented, not a current-asset defect.
- [x] WU7 — **Verified and committed `7a802eb`:** removed unused journal field/img and importer-free component; fourteen controls reject retired API/key presence. RED483/3, partial485/1, independent GREEN486/0. Build/check323/0+486/0, 11localizedrows/sixdetails,47protectedfiles/10encodes/fivechunks unchanged. External-link runtime unexercised (no seeds), browser/movie tests N/A static removal.
- [ ] WU10 — **Local closure verified; actual main integration pending:** scope gate and historical experiment closure are complete, with independent final build/check/browser verification. Do not check off the original integration condition until main delivery/branding review is real. Local scope-gate work-unit commit `e9c5f34` includes the CLI, self-tests and experiment-closure documentation.

## WU9 acceptance and checks

- Baseline poster amber bounds: x=1086..1202, y=365..502 in 1600×900; center-cover mobile window approximately x=612..988 at a 390×936 actual hero box. Amber is absent on mobile and partially clipped on tablet.
- Rebuild with `node scripts/motion-src/render-poster.mjs`; retain 1600×900 and ≤80 KiB.
- Add an applicable local deterministic regression check: observe failure on the old composition, then pass after the correction. Measure complete amber pixels/bounds rather than gate center alone; include flare-time evidence if animation changes.
- Inspect actual Chromium page at viewport 390×844 (hero box measured, historically 390×936), 768×1024, and 1440×900; include reduced-motion poster, copy/scrim, and CTA context.
- Run J1 determinism checks; if J1 animation source changes, rerender/probe and report fresh evidence, not the historical hash/oracle as current proof.
- Run `pnpm check` and verify poster hash is unchanged by checks.
- Save ignored screenshots under `dist-motion-verify/wu9/` and show visual results in the conversation.

## Current transition

Final independent local-closure PASS at `7a802eb`: scope gate81/0; build13pages; Astro152files0errors0warnings26hints/ESLintPASS; iteration-2 323/0, iteration-3 486/0. Latest framing `dist-motion-verify/wu9/wu10-final-framing/`: twelve ES/EN Chromium reduced-motion contexts with/without JS, errors0/pageErrors0/protected-content delta0, guarded separation63px; six screenshots inspected for recognition. NormalF1sixviews/fivechunks109818Bgzip unchanged; OG6571bytes/64colors/48187BONEpixels and meta13pages PASS; journal11rows/sixdetails PASS;47protectedfiles/tenencodes PASS. Hero, OG, tone and tracked baseline hashes unchanged.

Preserved final non-product failures: old WU8 preservation helper exits1 only at authorized changed ODD hash; later assertions were not reached, and baseline was not reset. Separate current asset/normal/DOM checks pass. Original wu10 framing output was rejected by existing WU9-only guard before capture; authorized wu9 output passed. No fresh full native animation/encode was run. Existing coverage limits below remain. No push, PR, merge or provider changes.

WU7 independent full build/check GREEN: Astro151files0errors0warnings26hints; iteration-2 323/0, iteration-3 486/0. Parent applied precisely reviewed component deletion after worker deletion-policy refusal, reconciled partial docs, and committed `7a802eb`. All protected47files/10encodes/fivechunks preserved. Continue WU10 local-only path gate, historical docs/spike closure, final checks; main integration condition remains pending.

User authorized continuing all remaining planned units without routine pauses; live YOLO standing permission permits local scoped commits, not overriding remote restrictions. WU9 committed as `bed795f` (478 changed text lines) and WU8 as `1aab883` (472 changed text lines). Both slightly exceed the usual400-line review guideline; retained tests/docs rather than code-golfing and kept surfaces separate. No PR/push. WU9 shared docs were staged from preserved exact pre-WU8 snapshots using index-only blobs; worktree/current WU8 docs were never reverted. WU7 and the local mechanical copy-exclusion gate are now implemented and independently verified. Scout's claimed untracked `.artifacts/iteration-2-client-js.json` and spike document were corrected by `git ls-files`: both are tracked and must not be changed or added blindly. Existing visual commits16ac030/1bea6ce touch i18n as well; prefer a fail-closed visual-delivery scope gate over discarding narrative or rewriting history. main integration remains unperformed.

WU8 completed after user confirmed Codex availability; original profiles unchanged. Old two-color OG observed RED before implementation; writer then observed builder repeat/fresh-load identity, generator repeat identity, budget/palette/dimension/wordmark controls GREEN. `pnpm build`13pages and `pnpm check` Astro0errors/0warnings/26hints, iteration-2 323/0, iteration-3 469/0. Independent verifier reran generator PASS, negative budget expectedexit1/hashunchanged, iteration-2 323/0, inspect/meta/preserve PASS. All13HTMLsocialmeta1200×628 correct, no in-page OG; public/dist output equal; WU9/films/clientchunks unchanged. Full build/check and browser builder were writer-executed, not independently rerun.

Final OG sha256 `a49aabb8334ae756eb207996dc3e83fe343676fcac0400e9e32358886961921e`; private toneinput60861bytes sha256 `f5b0ece46d31d9501dcf26a3a406a1fb0eb01cccd2f1f85c4cabb56019630c39`. Amber raster x402..477/y67..156,2636pixels;48187 exactBONEwordmarkpixels, no central texture interference. Native/social600/400 inspected. Evidence `dist-motion-verify/wu8/EVIDENCE.md`; isolated patch and previews there. Independent synthetic read-only probe confirms off-brand red/teal/purple can remap to compliant greys/ink; source chroma/opacity guard not implemented. Documented future-input limitation, no current-asset defect. Yellow-to-amber structural only. Existing fontconfig/librsvg portability caveat remains. Static card intentionally has no movie oracle.

Resumed after the user restored Codex quota. User explicitly approved generated fonts/Astro outputs, OG regeneration, and narrow `Hero.astro` adjustment plus fresh build outputs. No provider changes or publishing. Worker timeout after entering compaction was inspected before resuming; partial edits were preserved and subsequently verified.

WU9 observed RED: original amber cropping, then four desktop recognition failures; intermediate matched-compositor/scroll-control failures were retained and corrected, not weakened. Final GREEN independently reproduced with `node scripts/motion-src/check-poster-framing.mjs --out dist-motion-verify/wu9/independent-final --require-page-clear`: 12 contexts, errors0/pageErrors0, protected visible-content delta0. Whole touched stencil-cell bounds replace unsupported half-cell padding; guarded separation63px. Verifier visually inspected six views and recognized agent body/block and gate.

Final poster1600×900, cell7,38colors,11407bytes, sha256 `b9c1ad1b6bb68ba8dc813fb329e0e25b67fbf393d4ad5e8c3aa2ad9d9041ec18`. Poster and OG hashes survived writer project checks. Fresh build13pages; `pnpm check` Astro0errors/0warnings/26hints, iteration-2 309/0 and iteration-3 469/0. Fresh determinism PASS; native blur-1 oracle accepted carry0.83/CV0.66/stillness69.3%/seam0. Independent `check-normal.mjs after` confirmed six normal-F1 CSS/attribute snapshots and five client chunks unchanged (109818 bytes gzip); `verify-evidence.mjs` confirmed public/dist pixel/hash equality and native seam PNG equality. Full suite, native render/oracle, and determinism were writer-executed, not independently repeated.

Coverage limits: GREEN is top-of-page Chromium reduced-motion with/without JS; no-JS alone does not force a poster. No new encoded/delivered-halftone animation proof, Firefox/Safari, intermediate widths, scrolled states, loading/codec fallback recognition, LCP/CLS, or universal accessibility proof. `dist-motion-verify/wu9/EVIDENCE.md` retains all attempts and final screenshots. Provider quota duration and unlimited opencode-go usage were not established.

## Next step

The independently verified WU10 gate/docs are committed as `e9c5f34`. Local implementation and experimental verification are finished; preserve this document and its synchronized mirror/todo for the future delivery boundary. Main integration remains pending branding/review and explicit delivery policy; do not merge this experiment wholesale. The positive local unit slice is not a deployable main-based branch or production approval. No further source changes or remote operations are required for this local closure.
