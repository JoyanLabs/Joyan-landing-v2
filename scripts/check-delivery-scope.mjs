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
  for (const component of ['Hero', 'SectionFilm', 'MotionFigure', 'MagiParticleCanvas',
    'AgentNetworkDiagram', 'Wordmark', 'JournalEntryRow']) {
    test(`allow ${component}`, () => assert.equal(accepted(fixture('M', `src/components/joyan/${component}.astro`)), true));
  }
  for (const path of [
    'src/lib/i18n/es.ts', 'src/lib/i18n/new label.ts', 'src/config.yaml',
    'src/pages/terms.md', 'src/pages/new.astro', 'src/data/journal/en/new.md',
    'content/story.mdx', 'scripts/motion-src/story.markdown',
    'src/components/joyan/NewFigure.astro', 'src/components/joyan/Hero .astro',
    'src/components/joyan/Hero.astro\n', 'public/assets/dither-other/a.png',
    'scripts/check-iteration-4.mjs', 'package.json', '.gitignore',
  ]) test(`block ${path}`, () => assert.equal(accepted(fixture('M', path)), false));
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
  ...['Hero', 'DitherScene', 'SectionFilm', 'MotionFigure', 'MagiParticleCanvas',
    'AgentNetworkDiagram', 'Wordmark', 'JournalEntryRow']
    .map((name) => `src/components/joyan/${name}.astro`),
]);
const prefixes = ['public/assets/dither/', 'public/assets/brand/', 'public/assets/motion/',
  'scripts/dither-src/', 'scripts/motion-src/', 'docs/', 'odd/tasks/'];

function pathReason(path, status) {
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
