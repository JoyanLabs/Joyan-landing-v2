#!/usr/bin/env node
// Local path-scope proof only; not branding approval or delivery authority.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const report = (value) => console.log(JSON.stringify(value));

// Behavior contract is defined before the classifier implementation.
function selfTest() {
  const failures = [];
  let passed = 0;
  const test = (name, run) => {
    try { run(); passed++; }
    catch (error) { failures.push({ name, error: error.message }); }
  };
  const fixture = (...tokens) => tokens.join('\0') + '\0';
  const accepted = (raw) => assess(parseDiff(raw)).blocked.length === 0;
  for (const path of [
    'public/assets/dither/hero-dither.png', 'public/assets/brand/og-default.png',
    'public/assets/motion/action-gates.mp4', 'scripts/dither-src/og-tone.png',
    'scripts/motion-src/scenes/J1.js', 'scripts/generate-dither.mjs',
    'scripts/check-iteration-2.mjs', 'scripts/check-iteration-3.mjs',
    'scripts/check-delivery-scope.mjs', 'src/content.config.ts',
    'src/assets/styles/tailwind.css', 'docs/PLAN-ITERACION-DITHER.md',
    'odd/tasks/dither-look-spike.md', 'docs/spaces and\nM\tforged.md',
    'public/assets/dither/space ü\tquote".png',
  ]) test(`allow ${path}`, () => assert.equal(accepted(fixture('M', path)), true));
  // WU20: most of these components MOVED to archive/, so an edit (M) on them is
  // no longer in contract — DitherScene stays as the live example of an allowed
  // edit, and the movers are asserted in the WU20 move block below.
  for (const component of ['DitherScene']) {
    test(`allow ${component}`, () => assert.equal(accepted(fixture('M', `src/components/joyan/${component}.astro`)), true));
  }
  for (const path of [
    'src/lib/i18n/es.ts', 'src/lib/i18n/new label.ts', 'src/config.yaml',
    'src/pages/terms.md', 'src/pages/new.astro', 'src/data/journal/en/new.md',
    'content/story.mdx', 'scripts/motion-src/story.markdown',
    'src/components/joyan/NewFigure.astro', 'src/components/joyan/Hero .astro',
    'src/components/joyan/Hero.astro\n', 'public/assets/dither-other/a.png',
    'scripts/check-iteration-4.mjs', 'package.json', '.gitignore',
    // WU20 keeps failing closed around the new contract: the archive folder is
    // not a general dumping ground, an edit to a moved file is not a move, and
    // the two landing pages may be edited but never deleted or added.
    'archive/src/pages/whatever.astro', 'archive/notes.md',
    'src/components/joyan/SiteFooter2.astro',
  ]) test(`block ${path}`, () => assert.equal(accepted(fixture('M', path)), false));
  // WU27 — the real sequence, Michroma and a slower warp. The new lab route,
  // its component and its runtime are ADD-ONLY: an edit (M), deletion (D) or
  // type change (T) on a file this unit created fails closed. The self-hosted
  // font files under public/fonts/ are add-only too. An unknown lab route still
  // fails, and the fonts folder is not a general asset dumping ground.
  for (const path of ['src/lib/public-sequence.ts', 'scripts/check-public-sequence.mjs']) {
    // WU29: add-or-edit; D/T stay blocked.
    for (const status of ['A', 'M']) test(`WU29 allow ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), true));
    for (const status of ['D', 'T']) test(`WU29 reject ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), false));
  }
  for (const path of ['src/pages/lab/sequence.astro', 'src/components/joyan/SequenceLab.astro',
    'src/lib/sequence-runtime.ts']) {
    // WU28: the committed WU27 files are now add-or-edit; D/T stay blocked.
    for (const status of ['A', 'M']) test(`WU27 allow ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), true));
    for (const status of ['D', 'T']) test(`WU27 reject ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), false));
  }
  for (const path of ['public/fonts/michroma-400.woff2', 'public/fonts/vt323-400.woff2', 'public/fonts/OFL-NOTICE.txt']) {
    test(`WU27 allow A ${path}`, () => assert.equal(accepted(fixture('A', path)), true));
    for (const status of ['M', 'D', 'T']) test(`WU27 reject ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), false));
  }
  for (const path of ['public/fonts/not-a-font.png', 'public/fonts/sub/dir/x.woff2']) {
    test(`WU27 reject unknown fonts asset ${path}`, () => assert.equal(accepted(fixture('A', path)), false));
  }
  test('WU27 an unknown lab route still fails closed', () => {
    assert.equal(accepted(fixture('A', 'src/pages/lab/sequence2.astro')), false);
    assert.equal(accepted(fixture('A', 'src/pages/lab/other.astro')), false);
  });
  for (const path of ['scripts/check-scene-engine.mjs', 'scripts/check-image-pipeline.mjs',
    'scripts/check-ascii-runtime.mjs', 'scripts/check-sequence-lab.mjs']) {
    for (const status of ['A', 'M']) test(`WU27 allow ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), true));
    test(`WU27 reject T ${path}`, () => assert.equal(accepted(fixture('T', path)), false));
  }
  test('WU27 the budget-repinned lab copy pages stay edit-only (M)', () => {
    assert.equal(accepted(fixture('M', 'src/pages/lab/ascii.astro')), true);
    assert.equal(accepted(fixture('M', 'src/pages/lab/shapes.astro')), true);
    assert.equal(accepted(fixture('M', 'src/pages/lab/image.astro')), true);
    for (const status of ['A', 'D', 'T']) {
      assert.equal(accepted(fixture(status, 'src/pages/lab/ascii.astro')), false);
    }
  });
  for (const path of ['src/pages/index.astro', 'src/pages/en/index.astro', 'src/pages/lab/image.astro']) {
    test(`WU20 allow M ${path}`, () => assert.equal(accepted(fixture('M', path)), true));
    for (const status of ['A', 'D', 'T']) test(`WU20 reject ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), false));
  }
  test('WU20 allow the hero component as an add', () => {
    const path = 'src/components/joyan/JoyanComingHero.astro';
    assert.equal(accepted(fixture('A', path)), true);
    assert.equal(accepted(fixture('M', path)), true);
    assert.equal(accepted(fixture('D', path)), false);
  });
  for (const path of ['src/components/joyan/ImageLab.astro', 'src/lib/scene-runtime.ts']) {
    test(`WU20 allow M ${path}`, () => assert.equal(accepted(fixture('M', path)), true));
    for (const status of ['A', 'D', 'T']) test(`WU20 reject ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), false));
  }
  for (const oldPath of ['src/pages/bitacora.astro', 'src/pages/en/log/[slug].astro', 'src/components/joyan/Hero.astro']) {
    test(`WU20 allow D move ${oldPath}`, () => assert.equal(accepted(fixture('D', oldPath)), true));
    test(`WU20 allow R move ${oldPath}`, () => assert.equal(accepted(fixture('R100', oldPath, oldPath.replace(/^src\//, 'archive/src/'))), true));
    test(`WU20 reject M ${oldPath}`, () => assert.equal(accepted(fixture('M', oldPath)), false));
    test(`WU20 reject R elsewhere ${oldPath}`, () => assert.equal(accepted(fixture('R100', oldPath, 'somewhere/else.astro')), false));
  }
  for (const dest of ['archive/src/pages/bitacora.astro', 'archive/src/components/joyan/Hero.astro']) {
    test(`WU20 allow A archive copy ${dest}`, () => assert.equal(accepted(fixture('A', dest)), true));
    test(`WU20 reject M archive copy ${dest}`, () => assert.equal(accepted(fixture('M', dest)), false));
    test(`WU20 reject A unknown archive path ${dest.replace(/\.astro$/, '.bak')}`, () => assert.equal(accepted(fixture('A', dest.replace(/\.astro$/, '.bak'))), false));
  }
  test('WU22 allows the re-measured lab pages, WU20 still rejects the rest', () => {
    assert.equal(accepted(fixture('M', 'src/pages/lab/ascii.astro')), true);
    assert.equal(accepted(fixture('M', 'src/pages/lab/shapes.astro')), true);
    assert.equal(accepted(fixture('D', 'src/pages/lab/ascii.astro')), false);
    assert.equal(accepted(fixture('A', 'src/pages/lab/other.astro')), false);
  });
  for (const path of [
    'src/components/joyan/DitherScene.astro',
    'scripts/motion-src/render-dither-scene.mjs',
    'scripts/motion-src/check-dither-scene.mjs',
    'public/assets/motion/harness-tones-dither.mp4',
    'public/assets/dither/scene-dither.png',
  ]) {
    for (const status of ['A', 'M']) test(`WU12 allow ${status} ${path}`, () => assert.equal(accepted(fixture(status, path)), true));
    test(`WU12 reject type change ${path}`, () => assert.equal(accepted(fixture('T', path)), false));
  }
  for (const path of ['src/components/joyan/DitherScene2.astro', 'src/components/joyan/DitherScene.astro.bak']) {
    test(`WU12 reject unknown ${path}`, () => assert.equal(accepted(fixture('A', path)), false));
  }
  test('DitherFigure deletion only', () => {
    const path = 'src/components/joyan/DitherFigure.astro';
    assert.equal(accepted(fixture('D', path)), true);
    for (const status of ['A', 'M', 'T']) assert.equal(accepted(fixture(status, path)), false);
  });
  for (const status of ['R100', 'C075']) {
    test(`${status} visual pair`, () => assert.equal(accepted(fixture(status, 'docs/old name.md', 'docs/new\nname.md')), true));
    for (const pair of [
      ['src/lib/i18n/es.ts', 'docs/new.md'], ['docs/old.md', 'src/lib/i18n/es.ts'],
      ['unknown.txt', 'docs/new.md'], ['docs/old.md', 'unknown.txt'],
      ['src/components/joyan/DitherFigure.astro', 'docs/new.md'],
    ]) test(`${status} block both sides ${pair.join(' -> ')}`, () => assert.equal(accepted(fixture(status, ...pair)), false));
  }
  for (const raw of ['', 'M\0docs/a.md', 'R100\0docs/old.md\0',
    'C075\0\0docs/new.md\0', 'R101\0docs/a.md\0docs/b.md\0',
    'R\0docs/a.md\0docs/b.md\0', 'Q\0docs/a.md\0', 'M\0docs/a.md\0\0',
    'M\0docs/../src/config.yaml\0', 'M\0/docs/a.md\0']) {
    test(`malformed ${JSON.stringify(raw)}`, () => assert.throws(() => parseDiff(raw)));
  }
  test('default args', () => assert.deepEqual(parseArgs([]), { base: 'main', head: 'HEAD' }));
  test('explicit args', () => assert.deepEqual(parseArgs(['--head', 'HEAD~1', '--base', 'main']), { base: 'main', head: 'HEAD~1' }));
  for (const args of [['--wat'], ['--base'], ['--base', '--help'], ['--base', ''],
    ['--head=HEAD'], ['--base', 'main', '--base', 'HEAD'], ['HEAD'],
    ['--self-test', '--base', 'main'], ['--help', '--head', 'HEAD'],
    ['--base', '-x'], ['--base', 'main..HEAD'], ['--base', 'HEAD;echo bad'],
    ['--base', 'HEAD\n'], ['--base', 'HEAD:package.json']]) {
    test(`invalid args ${JSON.stringify(args)}`, () => assert.throws(() => parseArgs(args)));
  }
  for (const ref of ['wu10-ref-that-does-not-exist', 'HEAD:package.json']) {
    test(`invalid commit ${ref}`, () => assert.throws(() => resolveCommit(ref)));
  }
  test('blob is not a commit', () => assert.throws(() => resolveCommit(git(['rev-parse', 'HEAD:package.json']).trim())));
  test('empty HEAD range', () => {
    const child = spawnSync(process.execPath, [script, '--base', 'HEAD', '--head', 'HEAD'], { cwd: root, encoding: 'utf8' });
    assert.equal(child.status, 1);
    assert.match(JSON.parse(child.stdout).error, /empty/i);
  });
  test('escaped output roundtrip', () => {
    const result = assess(parseDiff(fixture('M', 'docs/a\n"blocked":false.md')));
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  });
  report({ mode: 'self-test', passed, failed: failures.length, failures });
  return failures.length ? 1 : 0;
}

function validateRef(ref) {
  if (!/^[A-Za-z0-9_][A-Za-z0-9_./-]*(?:[~^][0-9]*)*$/.test(ref) || ref.includes('..')) {
    throw new Error(`Invalid single commit revision: ${JSON.stringify(ref)}`);
  }
  return ref;
}

function parseArgs(args) {
  if (args.length === 1 && ['--help', '--self-test'].includes(args[0])) return { mode: args[0] };
  const options = { base: 'main', head: 'HEAD' };
  const seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!['--base', '--head'].includes(flag) || seen.has(flag) || i + 1 >= args.length) {
      throw new Error(`Unknown, duplicate or incomplete option: ${JSON.stringify(flag)}`);
    }
    seen.add(flag);
    options[flag.slice(2)] = validateRef(args[i + 1]);
  }
  return options;
}

function git(args, encoding = 'utf8') {
  return execFileSync('git', ['--no-replace-objects', ...args], {
    cwd: root, encoding, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveCommit(ref) {
  validateRef(ref);
  try {
    const commit = git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)) throw new Error('Invalid commit ID');
    return commit;
  } catch {
    throw new Error(`Unresolvable or non-commit revision: ${JSON.stringify(ref)}`);
  }
}

function parseDiff(raw) {
  if (!raw) throw new Error('Empty change range is not a candidate');
  if (!raw.endsWith('\0')) throw new Error('Malformed name-status stream: missing terminal NUL');
  const tokens = raw.slice(0, -1).split('\0');
  const records = [];
  for (let i = 0; i < tokens.length;) {
    const status = tokens[i++];
    const pair = /^[RC](?:100|0[0-9]{2})$/.test(status);
    if (!pair && !/^[AMDT]$/.test(status)) throw new Error(`Unsupported status: ${JSON.stringify(status)}`);
    const paths = tokens.slice(i, i + (pair ? 2 : 1));
    i += pair ? 2 : 1;
    if (paths.length !== (pair ? 2 : 1) || paths.some((path) =>
      !path || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..'))) {
      throw new Error('Malformed name-status path record');
    }
    records.push({ status, paths });
  }
  return records;
}

const exactPaths = new Set([
  'scripts/generate-dither.mjs', 'scripts/check-iteration-2.mjs',
  'scripts/check-iteration-3.mjs', 'scripts/check-delivery-scope.mjs',
  'src/content.config.ts', 'src/assets/styles/tailwind.css',
  // WU20: only DitherScene stays live; the other seven components moved to
  // `archive/src/**` and are covered by WU20_MOVED below.
  'src/components/joyan/DitherScene.astro',
  // WU27 — the touched checkers join the exact set (edit-only: a type change
  // still fails); the new sequence checker is add-or-edit.
  'scripts/check-scene-engine.mjs', 'scripts/check-image-pipeline.mjs',
  'scripts/check-ascii-runtime.mjs', 'scripts/check-sequence-lab.mjs',
]);
// WU29 — the public sequence: the hero's own runtime and its checker are new
// files (add-or-edit; D/T fail closed), like the WU27 set before them.
const WU29_ADDS = new Map([
  ['src/lib/public-sequence.ts', ['A', 'M']],
  ['scripts/check-public-sequence.mjs', ['A', 'M']],
]);
// WU27 — the real sequence, Michroma and a slower warp. New files were
// ADD-ONLY when created; WU28 committed them (b3320be) and now edits them, so
// the statuses grow to A+M — deletion (D) and type change (T) still fail
// closed. The budget re-pin may also touch the three existing lab pages'
// measured cost numbers (M via WU22/WU20 above) and the global stylesheet
// (M, in exactPaths above as the unique global CSS).
const WU27_ADDS = new Map([
  ['src/pages/lab/sequence.astro', ['A', 'M']],
  ['src/components/joyan/SequenceLab.astro', ['A', 'M']],
  ['src/lib/sequence-runtime.ts', ['A', 'M']],
]);
// WU27 — self-hosted fonts. Only the two OFL faces this unit ships and its
// licence notice may be ADDED; every other path under the folder (and every
// edit to the shipped ones) fails closed.
const WU27_FONT_ADDS = new Set([
  'public/fonts/michroma-400.woff2', 'public/fonts/vt323-400.woff2', 'public/fonts/OFL-NOTICE.txt',
]);
// WU20 — the single coming-soon page. The paths this unit is allowed to EDIT
// (statuses listed per path) and the old routes it is allowed to MOVE into
// `archive/`. Everything else keeps failing closed. The archive destinations
// are enumerated one by one: a generic `archive/` prefix would let an unrelated
// new file in through the back door.
// WU22 — the full-page dither round also re-measured the laboratory pages'
// copy and the shape laboratory component; the engine's own source now lives
// in scripts/scene-src/ (covered by the prefixes below).
const WU22_EDITS = new Map([
  ['src/pages/lab/ascii.astro', ['M']],
  ['src/pages/lab/shapes.astro', ['M']],
  ['src/components/joyan/ShapeLab.astro', ['M']],
]);
const WU20_EDITS = new Map([
  ['src/pages/index.astro', ['M']],
  ['src/pages/en/index.astro', ['M']],
  ['src/pages/lab/image.astro', ['M']],
  ['src/components/joyan/JoyanComingHero.astro', ['A', 'M']],
  ['src/components/joyan/ImageLab.astro', ['M']],
  ['src/lib/scene-runtime.ts', ['M']],
]);
const WU20_MOVED = new Set([
  'src/pages/404.astro', 'src/pages/privacy.md', 'src/pages/terms.md',
  'src/pages/rss.xml.ts',
  'src/pages/bitacora.astro', 'src/pages/bitacora/[slug].astro',
  'src/pages/en/log.astro', 'src/pages/en/log/[slug].astro',
  ...['Hero', 'SiteHeader', 'SiteFooter', 'Wordmark', 'LanguageToggle',
    'AgentsSection', 'MagiSection', 'HardwareSection', 'EcosystemSection',
    'JournalSection', 'JournalEntryRow', 'JournalDetailPage',
    'JournalDisclosureList', 'SectionHeader', 'SectionFilm', 'MotionFigure',
    'MagiParticleCanvas', 'AgentNetworkDiagram', 'TerminalBlock']
    .map((name) => `src/components/joyan/${name}.astro`),
]);
const WU20_ARCHIVE_DEST = new Set([
  ...[...WU20_MOVED].map((path) => path.replace(/^src\//, 'archive/src/')),
]);
const prefixes = ['public/assets/dither/', 'public/assets/brand/', 'public/assets/motion/',
  'scripts/dither-src/', 'scripts/motion-src/', 'scripts/scene-src/', 'docs/', 'odd/tasks/'];

function pathReason(path, status) {
  if (WU29_ADDS.has(path)) {
    const statuses = WU29_ADDS.get(path);
    return statuses.includes(status) ? null : `wu29-status-${status}`;
  }
  if (WU27_ADDS.has(path)) {
    const statuses = WU27_ADDS.get(path);
    return statuses.includes(status) ? null : `wu27-status-${status}`;
  }
  if (path.startsWith('public/fonts/')) {
    return status === 'A' && WU27_FONT_ADDS.has(path) ? null : `wu27-font-${status}`;
  }
  if (WU22_EDITS.has(path)) {
    const statuses = WU22_EDITS.get(path);
    return statuses.includes(status) ? null : `wu22-status-${status}`;
  }
  if (WU20_EDITS.has(path)) {
    const statuses = WU20_EDITS.get(path);
    return statuses.includes(status) ? null : `wu20-status-${status}`;
  }
  if (WU20_MOVED.has(path)) {
    // A moved route may be deleted, renamed away or (when git records it as a
    // copy) copied out; any other change (an edit that pretends the old
    // landing still exists) is out of contract.
    return /^(?:D|[RC])/.test(status) ? null : `wu20-move-status-${status}`;
  }
  if (WU20_ARCHIVE_DEST.has(path)) {
    // The archive copy arrives either as the new side of a rename/copy (R/C)
    // or, when git does not detect the pair, as an add next to the deletion (A).
    return status === 'A' || /^[RC]/.test(status) ? null : `wu20-archive-status-${status}`;
  }
  if (path.startsWith('archive/')) return 'unknown-path';
  const documentation = path.startsWith('docs/') || path.startsWith('odd/tasks/');
  if (path === 'src/config.yaml' || ['src/lib/i18n/', 'src/pages/', 'src/data/journal/']
    .some((prefix) => path.startsWith(prefix)) ||
    (!documentation && /\.(?:md|mdx|markdown|mdown)$/i.test(path))) return 'authored-copy';
  if (status === 'T') return 'type-change';
  if (path === 'src/components/joyan/DitherFigure.astro') {
    return status === 'D' ? null : 'deletion-only';
  }
  return exactPaths.has(path) || prefixes.some((prefix) => path.startsWith(prefix)) ? null : 'unknown-path';
}

function assess(records) {
  const accepted = [];
  const blocked = [];
  for (const { status, paths } of records) {
    paths.forEach((path, index) => {
      const reason = pathReason(path, status);
      const entry = { status, side: paths.length === 1 ? 'path' : index === 0 ? 'old' : 'new', path };
      if (reason) blocked.push({ ...entry, reason });
      else accepted.push(entry);
    });
  }
  return { accepted, blocked };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.mode === '--self-test') return selfTest();
  if (options.mode === '--help') {
    report({ usage: 'node scripts/check-delivery-scope.mjs [--base <rev>] [--head <rev>] | --self-test | --help',
      defaults: { base: 'main', head: 'HEAD' }, scope: 'Local committed path proof only; no branding, CI or publishing authority' });
    return 0;
  }
  const base = { input: options.base, commit: resolveCommit(options.base) };
  const head = { input: options.head, commit: resolveCommit(options.head) };
  try {
    const raw = git(['diff', '--no-ext-diff', '--no-textconv', '--name-status', '-z',
      '-M', '-C', '--find-copies-harder', base.commit, head.commit, '--'], null);
    const records = parseDiff(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    const result = assess(records);
    report({ base, head, ok: result.blocked.length === 0, ...result });
    return result.blocked.length ? 1 : 0;
  } catch (error) {
    report({ base, head, ok: false, error: error.message });
    return 1;
  }
}

try { process.exitCode = main(); }
catch (error) { report({ ok: false, error: error.message }); process.exitCode = 1; }
