#!/usr/bin/env node
/**
 * Deterministic Unit A checks for Joyan Landing iteration 2 (RED coverage).
 *
 * Verifies, against a fresh `astro build` output:
 *   1. Route contract — ES at `/`, EN at `/en` with no trailing slash
 *      (config sets `trailingSlash: "never"`; rejects `/en/` canonical,
 *      hreflang, and link targets in emitted HTML).
 *   2. Active locale markup (`lang`), canonical and hreflang emission.
 *   3. Language toggle — `data-alt` targets, anchor-hash preservation
 *      script, `aria-current="page"` on the active locale, `:focus-visible`
 *      ring in markup and compiled CSS, and an executable check that the
 *      shipped toggle script resolves the alternate locale plus the current
 *      hash (/#magi -> /en#magi, /en#agents -> /#agents) against a
 *      deterministic DOM stub.
 *   4. Strict ES/EN locale key parity, reporting the exact missing key.
 *   5. Copy prohibitions — banned phrase, vendor/tech names, screenshots,
 *      and unsupported pricing/enrollment/beta/hardware-delivery claims —
 *      across both locale modules, built visible text, and meta/alt values.
 *   6. Unit C L1 texture — shell-texture markup (aria-hidden, DOM order,
 *      Canvas-free, gradient-free, 64 Bayer dot opacities <= 0.10), opaque
 *      content shell (main/footer bg-ink-950), computed worst-case body
 *      contrast >= 4.5:1, and compiled CSS (fixed/inset/z-index/pointer-
 *      events, reduced-motion static).
 *   7. Unit C dither assets — every output PNG exists with exact intrinsic
 *      dimensions, stays within its byte budget, and keeps the two-color
 *      ink-950/bone-50 palette; the generator exits 1 over budget.
 *   8. Unit D MAGI motion — executed network model (7 nodes/6 edges/30
 *      particles on the diagram grid), canvas island wiring + a11y on both
 *      locales, compiled canvas chunk guards (DPR cap, 30fps, observers,
 *      reduced-motion, Astro navigation cleanup), opacity-only SVG edge
 *      pulses, reduced-motion CSS statics, and internal-only imports.
 *
 * Exit code 0 = all assertions pass; 1 = at least one failure. The checker
 * builds automatically when `dist/` is missing so `pnpm check` works from a
 * clean checkout. No runtime dependencies beyond project devDependencies.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = resolve(ROOT, 'dist');

// ---------------------------------------------------------------------------
// Build gate: the assertions run against real built output.
// ---------------------------------------------------------------------------
if (!existsSync(DIST) || !existsSync(resolve(DIST, 'index.html'))) {
  console.log('iteration-2: dist/ not built yet — running `npm run build`...');
  const built = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
  if (built.status !== 0) {
    console.error('iteration-2: build failed; cannot run route assertions.');
    process.exit(1);
  }
}

const failures = [];
const passed = [];
const fail = (message) => failures.push(message);
const pass = (message) => passed.push(message);

const read = (filePath) => readFileSync(filePath, 'utf8');

// ---------------------------------------------------------------------------
// Site base URL (source of truth: src/config.yaml).
// ---------------------------------------------------------------------------
const config = yaml.load(read(resolve(ROOT, 'src/config.yaml')));
const siteBase = String(config.site.site).replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// 1. Route contract: `/` and `/en`, never `/en/`.
//    Note: Astro emits `pages/en/index.astro` as `dist/en/index.html` even
//    with `trailingSlash: "never"` — the option normalizes routes and
//    generated URLs, not the directory-index file layout. The contract is
//    asserted at config level (the option must be set) and at output level
//    (no emitted `/en/` target anywhere).
// ---------------------------------------------------------------------------
const astroConfig = read(resolve(ROOT, 'astro.config.ts'));
if (/trailingSlash\s*:\s*["']never["']/.test(astroConfig)) {
  pass('route: astro.config.ts sets trailingSlash "never"');
} else {
  fail('route: astro.config.ts must set trailingSlash "never" (rejects /en/ routes)');
}

const esHtml = (() => {
  try {
    return read(resolve(DIST, 'index.html'));
  } catch {
    fail('route: ES page / must build to dist/index.html');
    return '';
  }
})();

let enHtml = '';
try {
  enHtml = read(resolve(DIST, 'en', 'index.html'));
  pass('route: EN page /en built (dist/en/index.html)');
} catch {
  fail('route: EN page must build at /en (dist/en/index.html)');
}

for (const [label, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  if (/href="\/en\//.test(html)) {
    fail(`route: ${label} page contains a link to /en/ (trailing slash target)`);
  } else {
    pass(`route: ${label} page has no /en/ link targets`);
  }
}

// ---------------------------------------------------------------------------
// 2. Canonical + hreflang emission (no trailing slash on EN targets).
// ---------------------------------------------------------------------------
const canonicalAssertions = [
  {
    label: 'ES canonical',
    html: esHtml,
    expected: `rel="canonical" href="${siteBase}"`,
    banned: `rel="canonical" href="${siteBase}/"`,
  },
  {
    label: 'EN canonical',
    html: enHtml,
    expected: `rel="canonical" href="${siteBase}/en"`,
    banned: `rel="canonical" href="${siteBase}/en/"`,
  },
];

for (const { label, html, expected, banned } of canonicalAssertions) {
  if (!html) continue;
  if (!html.includes(expected)) {
    fail(`canonical: ${label} must be <link ${expected}>`);
  } else {
    pass(`canonical: ${label} emitted as ${expected}`);
  }
  if (html.includes(banned)) {
    fail(`canonical: ${label} must not reference trailing-slash target ${banned}`);
  }
}

const hreflangRows = [
  { locale: 'es', href: siteBase },
  { locale: 'en', href: `${siteBase}/en` },
  { locale: 'x-default', href: siteBase },
];

for (const [page, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  for (const { locale, href } of hreflangRows) {
    const token = `rel="alternate" hreflang="${locale}" href="${href}"`;
    const bannedToken = `rel="alternate" hreflang="${locale}" href="${href}/"`;
    if (!html.includes(token)) {
      fail(`hreflang: ${page} page must emit <link ${token}>`);
    } else {
      pass(`hreflang: ${page} page emits ${locale} -> ${href}`);
    }
    if (html.includes(bannedToken)) {
      fail(`hreflang: ${page} page must not emit trailing-slash alternate target ${bannedToken}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Active locale markup and language toggle contract.
// ---------------------------------------------------------------------------
for (const [page, html, expectedLang] of [
  ['ES', esHtml, 'es'],
  ['EN', enHtml, 'en'],
]) {
  if (!html) continue;
  const langTag = `<html lang="${expectedLang}"`;
  if (html.includes(langTag)) {
    pass(`locale: ${page} page renders ${langTag}`);
  } else {
    fail(`locale: ${page} page must render ${langTag} (wrong active locale)`);
  }
}

const toggleRows = [
  { page: 'ES', html: esHtml, alt: '/en' },
  { page: 'EN', html: enHtml, alt: '/' },
];

for (const { page, html, alt } of toggleRows) {
  if (!html) continue;
  if (html.includes(`data-lang-toggle`)) {
    pass(`toggle: ${page} page renders the language toggle`);
  } else {
    fail(`toggle: ${page} page must render [data-lang-toggle]`);
  }
  if (html.includes(`data-alt="${alt}"`)) {
    pass(`toggle: ${page} page alternates to ${alt} without trailing slash`);
  } else {
    fail(`toggle: ${page} page must set data-alt="${alt}" (no /en/ target)`);
  }
  if (!/location\.hash/.test(html)) {
    fail(`toggle: ${page} page must preserve the anchor hash (script uses location.hash)`);
  } else {
    pass(`toggle: ${page} page hash-preservation script present`);
  }
  if (html.includes('aria-current="page"')) {
    pass(`toggle: ${page} page marks the active locale with aria-current="page"`);
  } else {
    fail(`toggle: ${page} page must mark the active locale with aria-current="page"`);
  }
}

// ---------------------------------------------------------------------------
// 3b. Toggle focus-visible styling: markup classes + compiled CSS rules.
// ---------------------------------------------------------------------------
const FOCUS_CLASSES = ['focus-visible:outline', 'focus-visible:outline-accent'];

for (const { page, html } of toggleRows) {
  if (!html) continue;
  const toggleTag = html.match(/<a[^>]*data-lang-toggle[^>]*>/)?.[0] ?? '';
  const classAttr = toggleTag.match(/class="([^"]*)"/)?.[1] ?? '';
  const classes = new Set(classAttr.split(/\s+/).filter(Boolean));
  for (const cls of FOCUS_CLASSES) {
    if (classes.has(cls)) {
      pass(`focus: ${page} toggle link carries ${cls}`);
    } else {
      fail(`focus: ${page} toggle link must carry ${cls} (focus-visible ring)`);
    }
  }
}

const cssDir = resolve(DIST, '_astro');
const cssFiles = existsSync(cssDir) ? readdirSync(cssDir).filter((file) => file.endsWith('.css')) : [];
const compiledCss = cssFiles.map((file) => read(resolve(cssDir, file))).join('\n');

if (cssFiles.length === 0) {
  fail('focus: compiled stylesheet not found (dist/_astro/*.css)');
} else if (/\.focus-visible\\:outline:focus-visible/.test(compiledCss)) {
  pass('focus: compiled CSS enables the focus-visible outline rule for the toggle');
} else {
  fail('focus: compiled CSS must include the .focus-visible\\:outline:focus-visible rule');
}

if (/\.focus-visible\\:outline-accent:focus-visible\{outline-color:\s*var\(--color-accent\)\}/.test(compiledCss)) {
  pass('focus: compiled CSS colors the toggle focus ring with --color-accent');
} else {
  fail('focus: compiled CSS must color .focus-visible\\:outline-accent with --color-accent');
}

// ---------------------------------------------------------------------------
// 3c. Toggle hash preservation — execute the shipped inline script against a
//     deterministic DOM stub (no browser, no flakiness).
// ---------------------------------------------------------------------------
const extractToggleScript = (html) => {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const target = blocks.find((match) => match[1].includes('data-lang-toggle'));
  return target ? target[1] : '';
};

const runToggleScript = (scriptText, { alt, hash }) => {
  const link = {
    alt,
    href: '',
    listeners: {},
    getAttribute(name) {
      return name === 'data-alt' ? this.alt : null;
    },
    setAttribute(name, value) {
      if (name === 'href') this.href = String(value);
    },
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    },
  };
  const windowStub = { location: { hash } };
  const documentStub = { querySelectorAll: () => [link] };
  new Function('window', 'document', scriptText)(windowStub, documentStub);
  return link;
};

const hashCases = [
  { page: 'ES', html: esHtml, alt: '/en', hash: '#magi', expected: '/en#magi' },
  { page: 'EN', html: enHtml, alt: '/', hash: '#agents', expected: '/#agents' },
];

for (const { page, html, alt, hash, expected } of hashCases) {
  if (!html) continue;
  const scriptText = extractToggleScript(html);
  if (!scriptText) {
    fail(`hash: ${page} page must ship the inline toggle hash script`);
    continue;
  }
  const link = runToggleScript(scriptText, { alt, hash });
  if (link.href === expected) {
    pass(`hash: ${page} toggle from ${hash} resolves to ${expected}`);
  } else {
    fail(`hash: ${page} toggle from ${hash} must resolve to ${expected}, got ${link.href || '(unset)'}`);
  }
  if (typeof link.listeners.click !== 'function') {
    fail(`hash: ${page} toggle script must bind a click listener`);
  } else {
    link.listeners.click();
    if (link.href === expected) {
      pass(`hash: ${page} toggle click keeps ${expected}`);
    } else {
      fail(`hash: ${page} toggle click must keep ${expected}, got ${link.href || '(unset)'}`);
    }
  }
}

// Sitemap: /en must appear without a trailing slash (when a sitemap is emitted).
const sitemap = resolve(DIST, 'sitemap-0.xml');
if (existsSync(sitemap)) {
  const sitemapXml = read(sitemap);
  if (sitemapXml.includes(`<loc>${siteBase}/en/</loc>`)) {
    fail('sitemap: must not list /en/ with a trailing slash');
  } else if (sitemapXml.includes(`<loc>${siteBase}/en</loc>`)) {
    pass('sitemap: lists /en without a trailing slash');
  } else {
    fail('sitemap: must list the EN route /en');
  }
}

// ---------------------------------------------------------------------------
// 4. Strict locale key parity (runtime structural walk, reports exact keys).
// ---------------------------------------------------------------------------
// Generic TS module loader: transpiles a project .ts file to CommonJS and
// executes it in isolation (used for locale parity and the MAGI network model).
const loadTsModule = (filePath) => {
  const source = read(filePath);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function('exports', 'module', outputText)(module.exports, module);
  return module.exports;
};

const esModule = loadTsModule(resolve(ROOT, 'src/lib/i18n/es.ts'));
const enModule = loadTsModule(resolve(ROOT, 'src/lib/i18n/en.ts'));
const esContent = esModule.es ?? esModule;
const enContent = enModule.en ?? enModule;

const parityErrors = [];
const walkPairs = (esValue, enValue, path) => {
  if (Array.isArray(esValue) || Array.isArray(enValue)) {
    if (!Array.isArray(esValue) || !Array.isArray(enValue)) {
      parityErrors.push(`${path}: array/object mismatch between locales`);
      return;
    }
    if (esValue.length !== enValue.length) {
      parityErrors.push(`${path}: array length ${esValue.length} (es) !== ${enValue.length} (en)`);
    }
    const max = Math.max(esValue.length, enValue.length);
    for (let i = 0; i < max; i += 1) {
      if (i < esValue.length && i < enValue.length) {
        walkPairs(esValue[i], enValue[i], `${path}[${i}]`);
      } else {
        parityErrors.push(`${path}[${i}]: missing in ${i < esValue.length ? 'en' : 'es'}`);
      }
    }
    return;
  }

  if (esValue && typeof esValue === 'object' && enValue && typeof enValue === 'object') {
    for (const key of Object.keys(esValue)) {
      if (!(key in enValue)) parityErrors.push(`${path}.${key}: missing in EN`);
    }
    for (const key of Object.keys(enValue)) {
      if (!(key in esValue)) parityErrors.push(`${path}.${key}: missing in ES`);
    }
    for (const key of Object.keys(esValue)) {
      if (key in enValue) walkPairs(esValue[key], enValue[key], path ? `${path}.${key}` : key);
    }
    return;
  }

  if (typeof esValue !== typeof enValue) {
    parityErrors.push(`${path}: type ${typeof esValue} (es) !== ${typeof enValue} (en)`);
  }
};

walkPairs(esContent, enContent, '');
if (parityErrors.length > 0) {
  for (const error of parityErrors) fail(`parity: ${error}`);
} else {
  pass(
    `parity: ES and EN locale modules share identical key structure (${JSON.stringify(esContent).length} chars compared)`
  );
}

// ---------------------------------------------------------------------------
// 5. Copy prohibitions across locale modules and built user-visible output.
// ---------------------------------------------------------------------------
const PROHIBITED_PATTERNS = [
  { label: 'exact prohibited phrase', re: /software\s+para\s+agentes/i },
  { label: 'pricing claim', re: /\b(?:precio|precios|pricing|price)\b/i },
  { label: 'purchase claim', re: /\b(?:comprar|purchase|buy\s+now)\b/i },
  {
    label: 'enrollment offer',
    re: /\b(?:inscr[ií]bete|inscribirte|sign\s*[- ]?up|register\s+(?:now|today)|enrollment\s+open|registro\s+abierto|apunt[aá]te)\b/i,
  },
  {
    label: 'beta availability claim',
    re: /\b(?:open\s+beta|beta\s+(?:p[uú]blica|abierta|available)|available\s+beta|beta\s+ya)\b/i,
  },
  {
    label: 'immediate availability claim',
    re: /\b(?:ya\s+disponible|available\s+now|disponible\s+hoy|launching\s+(?:today|soon))\b/i,
  },
  {
    label: 'hardware delivery claim',
    re: /\b(?:shipping|env[ií]o|delivery\s+date|delivery\s+in\s+\d|entrega\s+(?:garantizada|inmediata|prometida))\b/i,
  },
  { label: 'guarantee claim', re: /\b(?:garantizad\w*|guaranteed|money[-\s]?back)\b/i },
  { label: 'screenshot reference', re: /\b(?:screenshot|captura\s+de\s+pantalla|pantallazo)\b/i },
];

const VENDOR_NAMES = [
  'react',
  'vue',
  'svelte',
  'angular',
  'astro',
  'tailwind',
  'bootstrap',
  'node',
  'nodejs',
  'typescript',
  'javascript',
  'python',
  'php',
  'ruby',
  'openai',
  'anthropic',
  'claude',
  'chatgpt',
  'gpt',
  'gemini',
  'llama',
  'mistral',
  'aws',
  'azure',
  'google cloud',
  'cloudflare',
  'vercel',
  'netlify',
  'nvidia',
  'intel',
  'amd',
  'raspberry',
  'arduino',
  'esp32',
  'docker',
  'kubernetes',
  'postgres',
  'mysql',
  'mongodb',
  'graphql',
];

const collectStrings = (value, path = '', out = []) => {
  if (typeof value === 'string') {
    out.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectStrings(item, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
};

let copyIssues = 0;
const scanStrings = (strings, source) => {
  for (const { path, value } of strings) {
    for (const { label, re } of PROHIBITED_PATTERNS) {
      if (re.test(value)) {
        fail(`copy: ${source} ${path} matches ${label}`);
        copyIssues += 1;
      }
    }
    for (const name of VENDOR_NAMES) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(value)) {
        fail(`copy: ${source} ${path} names vendor/technology "${name}"`);
        copyIssues += 1;
      }
    }
  }
};

scanStrings(collectStrings(esContent), 'es.ts');
scanStrings(collectStrings(enContent), 'en.ts');
if (copyIssues === 0) pass('copy: locale modules are free of banned phrase, vendor names, screenshots and claims');

// Built output: raw HTML (comments can surface), visible text, and
// alt/title/meta attribute values.
const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();

const attributeValues = (html) =>
  [...html.matchAll(/\b(?:alt|title|content)="([^"]*)"/gi)].map((match) => match[1].toLowerCase());

const scanBuiltOutput = (html, page) => {
  if (!html) return;
  if (/software\s+para\s+agentes/i.test(html)) {
    fail(`copy: ${page} built HTML contains the prohibited phrase`);
  }
  const targets = [visibleText(html), ...attributeValues(html)];
  for (const [sourceIndex, target] of targets.entries()) {
    const source = sourceIndex === 0 ? 'visible text' : 'attribute';
    for (const { label, re } of PROHIBITED_PATTERNS) {
      if (re.test(target)) {
        fail(`copy: ${page} ${source} matches ${label}`);
      }
    }
    for (const name of VENDOR_NAMES) {
      if (new RegExp(`\\b${name}\\b`, 'i').test(target)) {
        fail(`copy: ${page} ${source} names vendor/technology "${name}"`);
      }
    }
  }
};

scanBuiltOutput(esHtml, 'ES');
scanBuiltOutput(enHtml, 'EN');

// ---------------------------------------------------------------------------
// 6. Unit C — L1 shell texture (dither level L1) and dither asset contract.
//
//    The L1 texture is a fixed, decorative 8x8 Bayer dot grid (CSS-pixel
//    scale, fill-opacity 0.03..0.10) painted at z-index -1 inside an isolated
//    page wrapper, below the opaque content shell (main + footer). Those two
//    structural facts — paint order and opaque surfaces — are what guarantee
//    the texture never overlaps readable text; the opacity cap and the
//    computed worst-case contrast are the quantitative backstop.
// ---------------------------------------------------------------------------
const INK_HEX = '#0B0B0C';
const BONE_HEX = '#F4F2ED';
const BODY_HEX = '#E8E6E1'; // bone-100 body text
const TEXTURE_MAX_OPACITY = 0.1; // dot opacity cap (docs/DESIGN.md — Dither levels)

// PNG header reader (no dependencies): IHDR dimensions + PLTE palette colors.
const pngInfo = (filePath) => {
  const b = readFileSync(filePath);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  let offset = 8;
  const palette = [];
  while (offset < b.length) {
    const len = b.readUInt32BE(offset);
    const type = b.toString('ascii', offset + 4, offset + 8);
    if (type === 'PLTE') {
      for (let i = 0; i + 2 < len; i += 3) {
        palette.push(`#${b.toString('hex', offset + 8 + i, offset + 8 + i + 3).toUpperCase()}`);
      }
      break;
    }
    offset += 12 + len;
  }
  return { width, height, palette };
};

// The inline <div class="shell-texture" data-shell-texture ...>...</div> block.
const textureRegion = (html) => {
  const start = html.indexOf('data-shell-texture');
  if (start === -1) return '';
  const open = html.lastIndexOf('<div', start);
  const close = html.indexOf('</div>', start);
  return open !== -1 && close !== -1 ? html.slice(open, close) : '';
};

// WCAG 2.1 relative luminance and contrast ratio (deterministic math).
const relativeLuminance = (hex) => {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const contrastRatio = (l1, l2) => {
  const [hi, lo] = [l1, l2].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
const blendedLuminance = (fg, bg, alpha) => relativeLuminance(fg) * alpha + relativeLuminance(bg) * (1 - alpha);

for (const [page, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  const tex = textureRegion(html);
  if (!tex) {
    fail(`texture: ${page} page must render the L1 shell texture ([data-shell-texture])`);
    continue;
  }
  if (tex.includes('aria-hidden="true"')) {
    pass(`texture: ${page} shell texture is aria-hidden (decorative)`);
  } else {
    fail(`texture: ${page} shell texture must be aria-hidden (decorative, no alt)`);
  }
  if (html.indexOf('data-shell-texture') !== -1 && html.indexOf('data-shell-texture') < html.indexOf('<main')) {
    pass(`texture: ${page} shell texture precedes the content shell (<main>) in DOM order`);
  } else {
    fail(`texture: ${page} shell texture must precede <main> so it renders behind content`);
  }
  if (/<svg[\s\S]*?<pattern/.test(tex) && !/<canvas/i.test(tex)) {
    pass(`texture: ${page} texture is a static SVG pattern, Canvas-free`);
  } else {
    fail(`texture: ${page} L1 texture must be CSS/SVG-only (pattern), never Canvas`);
  }
  if (!/<linearGradient|<radialGradient/i.test(tex)) {
    pass(`texture: ${page} texture carries no gradient fills`);
  } else {
    fail(`texture: ${page} texture must not use gradient fills`);
  }
  const opacities = [...tex.matchAll(/fill-opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
  if (opacities.length === 64) {
    const maxOpacity = Math.max(...opacities);
    if (maxOpacity <= TEXTURE_MAX_OPACITY) {
      pass(`texture: ${page} Bayer dot opacity capped at ${maxOpacity.toFixed(2)} (<= ${TEXTURE_MAX_OPACITY})`);
    } else {
      fail(`texture: ${page} dot opacity must be <= ${TEXTURE_MAX_OPACITY}, got ${maxOpacity}`);
    }
  } else {
    fail(`texture: ${page} texture must carry the 64 Bayer dot opacities, got ${opacities.length}`);
  }
}

// Opaque content shell: with main and footer painted opaque ink-950, the
// fixed z-index -1 texture can only show in shell gutters, never behind text.
const mainTag = esHtml.match(/<main\b[^>]*>/)?.[0] ?? '';
if (/class="[^"]*\bbg-ink-950\b/.test(mainTag)) {
  pass('surface: <main> is opaque (bg-ink-950) — texture cannot show behind section text');
} else {
  fail('surface: <main> must carry an opaque bg-ink-950 shell so the L1 texture never sits under text');
}
const footerTag = esHtml.match(/<footer\b[^>]*>/)?.[0] ?? '';
if (/class="[^"]*\bbg-ink-950\b/.test(footerTag)) {
  pass('surface: <footer> is opaque (bg-ink-950)');
} else {
  fail('surface: <footer> must carry an opaque bg-ink-950 shell');
}

// Worst-case contrast: bone-100 body text directly over a max-opacity dot
// blended on ink-950 must stay >= 4.5:1 (spec — Texture is legible).
const worstCaseLuminance = blendedLuminance(BONE_HEX, INK_HEX, TEXTURE_MAX_OPACITY);
const worstCaseContrast = contrastRatio(relativeLuminance(BODY_HEX), worstCaseLuminance);
if (worstCaseContrast >= 4.5) {
  pass(`contrast: bone-100 body over worst-case dot blend is ${worstCaseContrast.toFixed(2)}:1 (>= 4.5:1)`);
} else {
  fail(`contrast: bone-100 body over worst-case dot blend must be >= 4.5:1, got ${worstCaseContrast.toFixed(2)}:1`);
}

// Compiled CSS contract for the shell texture (property order is minifier-
// dependent, so assert membership, not ordering).
const shellTextureRule = compiledCss.match(/\.shell-texture\{[^}]*\}/)?.[0] ?? '';
const requiredShellProps = ['position:fixed', 'inset:0', 'z-index:-1', 'pointer-events:none'];
const missingShellProps = requiredShellProps.filter((prop) => !shellTextureRule.includes(prop));
if (missingShellProps.length === 0) {
  pass('css: compiled .shell-texture is fixed, inset 0, z-index -1, pointer-events none');
} else {
  fail(`css: compiled .shell-texture must declare ${missingShellProps.join(', ')}`);
}
if (/@media \(prefers-reduced-motion:reduce\)\{[^}]*\.shell-texture\{animation:none\}\}/.test(compiledCss)) {
  pass('motion: reduced-motion rule keeps the shell texture static (animation: none)');
} else {
  fail('motion: compiled CSS must disable any shell-texture animation under prefers-reduced-motion: reduce');
}
if (!/animation:/.test(shellTextureRule)) {
  pass('motion: base .shell-texture rule declares no animation (static by default)');
} else {
  fail('motion: base .shell-texture rule must not declare an animation');
}

// ---------------------------------------------------------------------------
// 7. Unit C — dither asset contract (five illustrations + separate OG).
// ---------------------------------------------------------------------------
const ASSET_CONTRACT = [
  { path: 'public/assets/dither/hero-dither.png', width: 1600, height: 900, maxBytes: 80 * 1024 },
  { path: 'public/assets/dither/hardware-dither.png', width: 1024, height: 1024, maxBytes: 60 * 1024 },
  { path: 'public/assets/dither/agents-dither.png', width: 1200, height: 900, maxBytes: 70 * 1024 },
  { path: 'public/assets/dither/magi-dither.png', width: 1200, height: 750, maxBytes: 75 * 1024 },
  { path: 'public/assets/dither/ecosystem-dither.png', width: 1200, height: 750, maxBytes: 75 * 1024 },
  { path: 'public/assets/brand/og-default.png', width: 1200, height: 628, maxBytes: 100 * 1024 },
];

for (const asset of ASSET_CONTRACT) {
  const filePath = resolve(ROOT, asset.path);
  if (!existsSync(filePath)) {
    fail(`asset: ${asset.path} must exist (regenerate with pnpm generate:dither)`);
    continue;
  }
  const info = pngInfo(filePath);
  if (!info) {
    fail(`asset: ${asset.path} must be a valid PNG`);
    continue;
  }
  if (info.width === asset.width && info.height === asset.height) {
    pass(`asset: ${asset.path} has intrinsic dimensions ${asset.width}x${asset.height}`);
  } else {
    fail(`asset: ${asset.path} must be ${asset.width}x${asset.height}, got ${info.width}x${info.height}`);
  }
  const size = statSync(filePath).size;
  if (size <= asset.maxBytes) {
    pass(`asset: ${asset.path} is ${(size / 1024).toFixed(1)} KiB <= ${(asset.maxBytes / 1024).toFixed(0)} KiB budget`);
  } else {
    fail(
      `asset: ${asset.path} is ${(size / 1024).toFixed(1)} KiB, over the ${(asset.maxBytes / 1024).toFixed(0)} KiB budget`
    );
  }
  const paletteOk = info.palette.length <= 2 && info.palette.every((color) => color === INK_HEX || color === BONE_HEX);
  if (paletteOk) {
    pass(`asset: ${asset.path} uses only the ink-950/bone-50 two-color palette`);
  } else {
    fail(`asset: ${asset.path} palette must be exactly ink-950/bone-50, got [${info.palette.join(', ')}]`);
  }
}

// Budget gate: the generator must exit 1 when an asset exceeds its byte
// budget. DITHER_BUDGET_SCALE=0.0001 forces every budget to ~0 bytes while
// pixels stay identical, so this is a deterministic failure-path test that
// leaves the committed PNGs byte-for-byte unchanged.
console.log('iteration-2: running dither budget gate test (DITHER_BUDGET_SCALE=0.0001)...');
const gate = spawnSync('node', ['scripts/generate-dither.mjs'], {
  cwd: ROOT,
  env: { ...process.env, DITHER_BUDGET_SCALE: '0.0001' },
  encoding: 'utf8',
});
if (gate.status === 1) {
  pass('gate: generator exits 1 when any asset exceeds its byte budget');
} else {
  fail(`gate: generator must exit 1 over budget, got status ${gate.status}`);
}

// ---------------------------------------------------------------------------
// 8. Unit D — MAGI canvas island (4.1) and SVG edge pulses (4.2).
//
//    The MAGI particle overlay is a vanilla Canvas island over the static
//    480x300 SVG diagram. Assertions cover: the network model (7 nodes/6
//    edges/30 particles on the diagram grid), the island wiring and a11y
//    semantics in both locales, the compiled canvas chunk guards (DPR cap,
//    30fps, observers, reduced-motion and Astro navigation cleanup), the
//    opacity-only SVG edge pulses, and the import scope of the new files
//    (no new runtime dependency).
// ---------------------------------------------------------------------------

// 8a. Network model — executed, not regexed: coordinates must match the
//     static diagram anchors (docs/DESIGN.md — MAGI SVG diagram guide).
const MAGI_ANCHORS = [
  { x: 240, y: 150 }, // MAGI hub
  { x: 390, y: 150 },
  { x: 315, y: 72 },
  { x: 165, y: 72 },
  { x: 90, y: 150 },
  { x: 165, y: 228 },
  { x: 315, y: 228 },
];

const magiNetworkModule = loadTsModule(resolve(ROOT, 'src/lib/magi-network.ts'));
const magiNetwork = magiNetworkModule.MAGI_NETWORK ?? magiNetworkModule;

if (magiNetwork?.nodes?.length === 7) {
  pass('model: MAGI_NETWORK declares 7 nodes (hub + 6 satellites)');
} else {
  fail(`model: MAGI_NETWORK must declare 7 nodes, got ${magiNetwork?.nodes?.length}`);
}
if (magiNetwork?.edges?.length === 6) {
  pass('model: MAGI_NETWORK declares 6 edges (hub to every satellite)');
} else {
  fail(`model: MAGI_NETWORK must declare 6 edges, got ${magiNetwork?.edges?.length}`);
}
if (magiNetwork?.particles?.length === 30) {
  pass('model: MAGI_NETWORK declares 30 particles');
} else {
  fail(`model: MAGI_NETWORK must declare 30 particles, got ${magiNetwork?.particles?.length}`);
}
if (magiNetwork?.nodes?.[0]?.x === 240 && magiNetwork?.nodes?.[0]?.y === 150) {
  pass('model: hub node sits at the grid center (240, 150)');
} else {
  fail('model: hub node must sit at (240, 150) on the 480x300 grid');
}
const anchorsMatch =
  magiNetwork?.nodes
    ?.slice(1)
    .every((node, i) => node.x === MAGI_ANCHORS[i + 1].x && node.y === MAGI_ANCHORS[i + 1].y) ?? false;
if (anchorsMatch) {
  pass('model: satellite nodes match the six static diagram anchors');
} else {
  fail('model: satellite nodes must match the static diagram anchors');
}
if (magiNetwork?.edges?.every((edge) => edge.from === 0)) {
  pass('model: every edge originates at the MAGI hub');
} else {
  fail('model: every edge must originate at the hub (from: 0)');
}
const particleEdgesOk =
  magiNetwork?.particles?.every((p) => p.edge >= 0 && p.edge < (magiNetwork?.edges?.length ?? 0)) ?? false;
if (particleEdgesOk) {
  pass('model: every particle references a valid edge');
} else {
  fail('model: every particle must reference a valid edge index');
}

// 8b. Island wiring and a11y semantics on both built pages.
const magiRegion = (html) => {
  const start = html.indexOf('id="magi"');
  return start === -1 ? '' : html.slice(start);
};

for (const [page, html, content] of [
  ['ES', esHtml, esContent],
  ['EN', enHtml, enContent],
]) {
  if (!html) continue;
  const region = magiRegion(html);
  if (!region) {
    fail(`magi: ${page} page must render the #magi section`);
    continue;
  }
  const canvasTag = region.match(/<canvas\b[^>]*data-magi-particles[^>]*>/)?.[0] ?? '';
  if (canvasTag) {
    pass(`magi: ${page} #magi section wires the MagiParticleCanvas island`);
  } else {
    fail(`magi: ${page} #magi section must render <canvas data-magi-particles>`);
  }
  if (canvasTag.includes('aria-hidden="true"')) {
    pass(`magi: ${page} canvas is aria-hidden (decorative overlay)`);
  } else {
    fail(`magi: ${page} canvas must be aria-hidden="true"`);
  }
  for (const [attr, expected] of [
    ['data-node-count', '7'],
    ['data-edge-count', '6'],
    ['data-particle-count', '30'],
    ['data-max-dpr', '2'],
    ['data-fps', '30'],
  ]) {
    if (canvasTag.includes(`${attr}="${expected}"`)) {
      pass(`magi: ${page} canvas carries ${attr}="${expected}"`);
    } else {
      fail(`magi: ${page} canvas must carry ${attr}="${expected}"`);
    }
  }
  if (region.includes(content.magi.motion.canvasLabel)) {
    pass(`magi: ${page} renders the localized canvas label next to the canvas`);
  } else {
    fail(`magi: ${page} must render the localized canvas label (magi.motion.canvasLabel)`);
  }
  if (region.includes(content.magi.motion.staticStatus)) {
    pass(`magi: ${page} static status text renders by default (no-JS/reduced-motion)`);
  } else {
    fail(`magi: ${page} must render magi.motion.staticStatus as the default status`);
  }
  if (canvasTag.includes(`data-active-status="${content.magi.motion.activeStatus}"`)) {
    pass(`magi: ${page} canvas carries the localized active status label`);
  } else {
    fail(`magi: ${page} canvas must carry data-active-status="${content.magi.motion.activeStatus}"`);
  }
}

// 8c. Compiled canvas script: the module that queries the island must ship the
//     full motion guard set. Astro may inline the small module into the built
//     HTML or emit a hashed chunk — both sources are scanned (minification
//     preserves string literals).
const jsFiles = existsSync(cssDir) ? readdirSync(cssDir).filter((file) => file.endsWith('.js')) : [];
const magiChunks = [];
for (const file of jsFiles) {
  const content = read(resolve(cssDir, file));
  if (content.includes('data-magi-particles')) magiChunks.push({ file, content });
}
const inlineModuleScripts = (html) =>
  [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const magiInlineEs = inlineModuleScripts(esHtml).filter((script) => script.includes('data-magi-particles'));
const magiInlineEn = inlineModuleScripts(enHtml).filter((script) => script.includes('data-magi-particles'));
const magiSources = [...magiChunks.map((chunk) => chunk.content), ...magiInlineEs];
if (magiSources.length === 1) {
  pass('magi: exactly one compiled canvas script source (inline module or chunk)');
} else {
  fail(`magi: expected exactly one canvas script source, found ${magiSources.length}`);
}
if (magiInlineEs.length === 1) {
  pass('magi: the canvas controller ships on the ES page');
} else {
  fail(`magi: ES page must ship the canvas controller, found ${magiInlineEs.length} inline module(s)`);
}
if (magiInlineEn.length === 1) {
  pass('magi: the canvas controller ships on the EN page (locale parity)');
} else {
  fail(`magi: EN page must ship the canvas controller, found ${magiInlineEn.length} inline module(s)`);
}
const magiJs = magiSources.join('\n');
const REQUIRED_MAGI_GUARDS = [
  ['devicePixelRatio', 'read the device pixel ratio'],
  ['IntersectionObserver', 'pause when the section leaves the viewport'],
  ['visibilitychange', 'pause when the tab is hidden'],
  ['pagehide', 'stop on navigation away'],
  ['pageshow', 'resume on bfcache restore'],
  ['prefers-reduced-motion', 'keep the static fallback under reduced motion'],
  ['cancelAnimationFrame', 'cancel the rAF loop on cleanup'],
  ['removeEventListener', 'remove listeners on cleanup'],
  ['astro:page-load', 'reboot after Astro view-transition navigation'],
  ['astro:before-swap', 'stop before the Astro DOM swap'],
  ['data-max-dpr', 'read the DPR cap attribute'],
  ['data-fps', 'read the fps cap attribute'],
];
for (const [token, what] of REQUIRED_MAGI_GUARDS) {
  if (magiJs.includes(token)) {
    pass(`magi: canvas chunk must ${what} (${token})`);
  } else {
    fail(`magi: canvas chunk must ${what} (missing ${token})`);
  }
}
if (/Math\.min\([^)]*devicePixelRatio/.test(magiJs)) {
  pass('magi: DPR is capped with Math.min(devicePixelRatio, maxDpr) (<= 2)');
} else {
  fail('magi: canvas chunk must cap DPR via Math.min(window.devicePixelRatio, maxDpr)');
}

// 8d. SVG edge pulses: opacity-only, on the six edge lines only.
const diagramRegion = (html) => {
  const start = html.indexOf('viewBox="0 0 480 300"');
  if (start === -1) return '';
  const open = html.lastIndexOf('<svg', start);
  const close = html.indexOf('</svg>', start);
  return open !== -1 && close !== -1 ? html.slice(open, close) : '';
};

for (const [page, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  const diagram = diagramRegion(html);
  if (!diagram) {
    fail(`diagram: ${page} page must render the 480x300 MAGI SVG`);
    continue;
  }
  const pulseLines = [...diagram.matchAll(/<line\b[^>]*edge-pulse[^>]*>/g)].length;
  if (pulseLines === 6) {
    pass(`diagram: ${page} exactly the 6 hub->satellite edges carry edge-pulse`);
  } else {
    fail(`diagram: ${page} must pulse exactly 6 edges, found ${pulseLines}`);
  }
  const pulseOnOthers = (diagram.match(/<(?!line\b)[^>]*edge-pulse/g) ?? []).length;
  if (pulseOnOthers === 0) {
    pass(`diagram: ${page} the pulse is limited to edge lines (no other idle motion)`);
  } else {
    fail(`diagram: ${page} edge-pulse must not appear on non-line elements`);
  }
  const accentStrokes = (diagram.match(/stroke-accent/g) ?? []).length;
  if (accentStrokes === 1) {
    pass(`diagram: ${page} keeps exactly one amber active node (stroke-accent)`);
  } else {
    fail(`diagram: ${page} must keep exactly one amber active node, found ${accentStrokes}`);
  }
}

// 8e. Compiled CSS: opacity-only keyframes, pulse class, reduced-motion statics.
const extractKeyframes = (css, name) => {
  const start = css.indexOf(`@keyframes ${name}`);
  if (start === -1) return '';
  let depth = 0;
  let i = start + `@keyframes ${name}`.length;
  for (; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return css.slice(start, i + 1);
};

const pulseKeyframes = extractKeyframes(compiledCss, 'magi-edge-pulse');
if (pulseKeyframes && /opacity:/.test(pulseKeyframes)) {
  pass('css: compiled @keyframes magi-edge-pulse animates opacity');
} else {
  fail('css: compiled CSS must include @keyframes magi-edge-pulse with opacity steps');
}
if (pulseKeyframes && !/transform|translate|scale|rotate/.test(pulseKeyframes)) {
  pass('css: magi-edge-pulse keyframes are opacity-only (no transform/scale)');
} else {
  fail('css: magi-edge-pulse keyframes must only animate opacity (no transform/scale)');
}
if (/\.edge-pulse\{animation:[^}]*magi-edge-pulse/.test(compiledCss)) {
  pass('css: compiled .edge-pulse rule applies the magi-edge-pulse animation');
} else {
  fail('css: compiled CSS must declare .edge-pulse { animation: magi-edge-pulse ... }');
}

// Brace-aware extraction of every prefers-reduced-motion media block (the
// minifier may put several rules inside one block, so plain regex truncates).
const reducedMotionBlocks = [];
{
  const needle = '@media (prefers-reduced-motion:reduce){';
  let from = 0;
  while (true) {
    const start = compiledCss.indexOf(needle, from);
    if (start === -1) break;
    let depth = 0;
    let i = start + needle.length - 1;
    for (; i < compiledCss.length; i += 1) {
      if (compiledCss[i] === '{') depth += 1;
      else if (compiledCss[i] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    reducedMotionBlocks.push(compiledCss.slice(start + needle.length, i));
    from = i + 1;
  }
}
const motionMedia = reducedMotionBlocks.join('\n');
if (/\.edge-pulse\{animation:none\}/.test(motionMedia)) {
  pass('motion: reduced-motion CSS disables the edge pulses (animation: none)');
} else {
  fail('motion: compiled CSS must set .edge-pulse animation: none under prefers-reduced-motion');
}
if (/canvas\[data-magi-particles\]\{display:none\}/.test(motionMedia)) {
  pass('motion: reduced-motion CSS removes the canvas overlay (static SVG fallback)');
} else {
  fail('motion: compiled CSS must hide canvas[data-magi-particles] under prefers-reduced-motion');
}

// 8f. No new runtime dependency: the new Unit D files may only import
//     internal (~/ or relative) modules, never external packages.
const scanImports = (filePath, label) => {
  const source = read(filePath);
  const imports = [...source.matchAll(/(?:import|export)\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const external = imports.filter(
    (specifier) => !specifier.startsWith('~/') && !specifier.startsWith('.') && !specifier.startsWith('/')
  );
  if (external.length === 0) {
    pass(`deps: ${label} imports only internal modules (no new runtime dependency)`);
  } else {
    fail(`deps: ${label} must not import external packages, got ${external.join(', ')}`);
  }
};
scanImports(resolve(ROOT, 'src/lib/magi-network.ts'), 'magi-network.ts');
scanImports(resolve(ROOT, 'src/components/joyan/MagiParticleCanvas.astro'), 'MagiParticleCanvas.astro');

// 8g. Runtime harness — execute the SHIPPED inline canvas module against a
//     deterministic DOM stub (same technique as the toggle hash check): the
//     built script must start the loop on intersection, cap DPR at 2, update
//     the localized status text, pause when hidden or on pagehide, and fully
//     clean up on the Astro before-swap signal.
const ACTIVE_STATUS = esHtml.match(/data-active-status="([^"]*)"/)?.[1] ?? '';
const shippedScript = magiInlineEs[0] ?? '';
if (shippedScript && !/\b(?:import|export)\b/.test(shippedScript)) {
  pass('magi: shipped canvas module is self-contained (model inlined, executable)');
} else {
  fail('magi: shipped canvas module must be self-contained (no import/export) for the stub harness');
}

if (shippedScript) {
  const recorded = [];
  const ctxStub = {
    setTransform: () => {},
    clearRect: () => recorded.push('clear'),
    save: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => recorded.push('stroke'),
    arc: () => {},
    fill: () => recorded.push('fill'),
    restore: () => {},
  };
  const canvasStub = {
    clientWidth: 960,
    clientHeight: 600,
    width: 0,
    height: 0,
    getContext: () => ctxStub,
    getAttribute: (name) => (name === 'data-active-status' ? ACTIVE_STATUS : null),
  };
  const statusStub = { textContent: '' };
  const docHandlers = {};
  const winHandlers = {};
  const winRemoved = [];
  const documentStub = {
    hidden: false,
    addEventListener: (name, handler) => {
      docHandlers[name] = handler;
    },
    removeEventListener: (name) => {
      winRemoved.push(name);
    },
    querySelector: (selector) => {
      if (selector === 'canvas[data-magi-particles]') return canvasStub;
      if (selector === '[data-magi-status]') return statusStub;
      return null;
    },
  };
  const windowStub = {
    devicePixelRatio: 3,
    matchMedia: () => ({ matches: false }),
    addEventListener: (name, handler) => {
      winHandlers[name] = handler;
    },
    removeEventListener: (name) => {
      winRemoved.push(name);
    },
  };
  let pendingRaf = new Map();
  let nextRafId = 1;
  let cancelCount = 0;
  let observerInstance = null;
  const IntersectionObserverStub = class {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observerInstance = this;
    }
    trigger(intersecting) {
      this.callback([{ isIntersecting: intersecting }]);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  };
  const rafStub = (callback) => {
    const id = nextRafId;
    nextRafId += 1;
    pendingRaf.set(id, callback);
    return id;
  };
  const cancelStub = () => {
    cancelCount += 1;
  };
  const pumpFrames = (ms) => {
    const queue = [...pendingRaf.values()];
    pendingRaf = new Map();
    for (const callback of queue) callback(ms);
  };

  new Function(
    'window',
    'document',
    'IntersectionObserver',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    shippedScript
  )(windowStub, documentStub, IntersectionObserverStub, rafStub, cancelStub);

  observerInstance.trigger(true); // visible -> startLoop
  pumpFrames(0);
  pumpFrames(100);
  pumpFrames(200);
  pumpFrames(300);
  if (canvasStub.width === 1920 && canvasStub.height === 1200) {
    pass(`magi: runtime caps DPR at 2 (devicePixelRatio 3 -> ${canvasStub.width}x${canvasStub.height})`);
  } else {
    fail(`magi: runtime must cap DPR at 2, got ${canvasStub.width}x${canvasStub.height} backing store`);
  }
  const drawCount = recorded.filter((op) => op === 'clear').length;
  if (drawCount >= 2) {
    pass(`magi: runtime loop renders while intersecting (${drawCount} frames drawn)`);
  } else {
    fail(`magi: runtime loop must render while intersecting, drew ${drawCount} frames`);
  }
  if (statusStub.textContent === ACTIVE_STATUS) {
    pass('magi: runtime updates the status element to the localized active label');
  } else {
    fail(`magi: runtime must set the status text to "${ACTIVE_STATUS}", got "${statusStub.textContent}"`);
  }

  const drawsBeforePause = recorded.filter((op) => op === 'clear').length;
  documentStub.hidden = true;
  winHandlers.visibilitychange();
  pumpFrames(300);
  pumpFrames(400);
  if (recorded.filter((op) => op === 'clear').length === drawsBeforePause) {
    pass('magi: runtime pauses the loop while the tab is hidden (visibilitychange)');
  } else {
    fail('magi: runtime must pause rendering while document.hidden is true');
  }

  winHandlers.pagehide();
  docHandlers['astro:before-swap']();
  const drawsAfterCleanup = recorded.filter((op) => op === 'clear').length;
  pumpFrames(500);
  if (recorded.filter((op) => op === 'clear').length === drawsAfterCleanup) {
    pass('magi: before-swap cleanup fully stops the loop');
  } else {
    fail('magi: the loop must not render after astro:before-swap cleanup');
  }
  if (observerInstance.disconnected && cancelCount >= 1) {
    pass('magi: cleanup disconnects the observer and cancels the rAF loop');
  } else {
    fail('magi: cleanup must disconnect the IntersectionObserver and cancel the rAF loop');
  }
  const expectedRemoved = ['visibilitychange', 'pagehide', 'pageshow', 'resize'];
  if (expectedRemoved.every((name) => winRemoved.includes(name))) {
    pass('magi: cleanup removes all window listeners (visibilitychange/pagehide/pageshow/resize)');
  } else {
    fail(`magi: cleanup must remove all window listeners, removed [${winRemoved.join(', ')}]`);
  }
}

// ---------------------------------------------------------------------------
// 9. Unit E — figure integration (5.1) and final audits (5.2).
//
//    Every dither illustration must render as a static <figure><img> inside
//    its declared L2/L3 section only (containment), with an absolute
//    /assets/... path, intrinsic width/height (no CLS), and the localized
//    alt/caption from the locale modules. Hero is decorative (alt=""); the
//    OG brand output never appears in-page; the figures are plain static
//    markup (no-JS fallback — the PNG renders without any script).
// ---------------------------------------------------------------------------
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sectionRegion = (html, id) => {
  const start = html.indexOf(`<section id="${id}"`);
  if (start === -1) return '';
  const next = html.indexOf('<section id=', start + 1);
  return next === -1 ? html.slice(start) : html.slice(start, next);
};

const FIGURE_CONTRACT = [
  {
    section: 'top',
    path: '/assets/dither/hero-dither.png',
    width: 1600,
    height: 900,
    localeKey: 'hero',
    decorative: true,
  },
  {
    section: 'agents',
    path: '/assets/dither/agents-dither.png',
    width: 1200,
    height: 900,
    localeKey: 'agents',
    decorative: false,
  },
  {
    section: 'magi',
    path: '/assets/dither/magi-dither.png',
    width: 1200,
    height: 750,
    localeKey: 'magi',
    decorative: false,
  },
  {
    section: 'hardware',
    path: '/assets/dither/hardware-dither.png',
    width: 1024,
    height: 1024,
    localeKey: 'hardware',
    decorative: false,
  },
  {
    section: 'ecosystem',
    path: '/assets/dither/ecosystem-dither.png',
    width: 1200,
    height: 750,
    localeKey: 'ecosystem',
    decorative: false,
  },
];

for (const [page, html, content] of [
  ['ES', esHtml, esContent],
  ['EN', enHtml, enContent],
]) {
  if (!html) continue;
  for (const row of FIGURE_CONTRACT) {
    const region = sectionRegion(html, row.section);
    const pathRe = new RegExp(`src="${escapeRegex(row.path)}"`);
    if (!region) {
      fail(`figure: ${page} #${row.section} section must render (hosts ${row.path})`);
      continue;
    }
    if (pathRe.test(region)) {
      pass(`figure: ${page} #${row.section} wires ${row.path} inside its declared section`);
    } else {
      fail(`figure: ${page} #${row.section} must render ${row.path} (declared section figure)`);
    }
    const occurrences = (html.match(pathRe) ?? []).length;
    if (occurrences === 1) {
      pass(`figure: ${page} ${row.path} appears exactly once (containment, no repeats)`);
    } else {
      fail(`figure: ${page} ${row.path} must appear exactly once, found ${occurrences}`);
    }
    const imgTag = region.match(new RegExp(`<img\\b[^>]*src="${escapeRegex(row.path)}"[^>]*>`))?.[0] ?? '';
    if (!imgTag) continue;
    if (imgTag.includes(`width="${row.width}"`)) {
      pass(`figure: ${page} ${row.path} declares intrinsic width ${row.width}`);
    } else {
      fail(`figure: ${page} ${row.path} img must declare width="${row.width}" (reserve layout)`);
    }
    if (imgTag.includes(`height="${row.height}"`)) {
      pass(`figure: ${page} ${row.path} declares intrinsic height ${row.height}`);
    } else {
      fail(`figure: ${page} ${row.path} img must declare height="${row.height}" (reserve layout)`);
    }
    if (imgTag.includes('class="block h-auto w-full"')) {
      pass(`figure: ${page} ${row.path} img keeps the responsive block layout class`);
    } else {
      fail(`figure: ${page} ${row.path} img must carry class="block h-auto w-full"`);
    }
    const figureCopy = content[row.localeKey]?.figure;
    if (row.decorative) {
      // Astro/compressHTML renders alt="" as a valueless `alt` attribute.
      if (!/alt="/.test(imgTag) && /\balt(?=>|\s)/.test(imgTag)) {
        pass(`figure: ${page} ${row.path} is decorative (empty alt)`);
      } else {
        fail(`figure: ${page} ${row.path} must be decorative with alt="" (L3 focal art)`);
      }
    } else if (figureCopy) {
      if (imgTag.includes(`alt="${figureCopy.alt}"`)) {
        pass(`figure: ${page} ${row.path} carries the localized informative alt`);
      } else {
        fail(`figure: ${page} ${row.path} must carry alt="${figureCopy.alt}" (localized)`);
      }
      if (region.includes(figureCopy.caption)) {
        pass(`figure: ${page} ${row.path} renders its localized caption`);
      } else {
        fail(`figure: ${page} ${row.path} must render the localized caption "${figureCopy.caption}"`);
      }
    }
  }
  const ogTotal = (html.match(/\/assets\/brand\/og-default\.png/g) ?? []).length;
  const ogInMeta = (html.match(/<meta\b[^>]*content="[^"]*\/assets\/brand\/og-default\.png[^"]*"[^>]*>/g) ?? []).length;
  const ogInImg = (html.match(/<img\b[^>]*\/assets\/brand\/og-default\.png[^>]*>/g) ?? []).length;
  if (ogTotal > 0 && ogTotal === ogInMeta && ogInImg === 0) {
    pass(`figure: ${page} references og-default.png only via social meta tags, never as an in-page image`);
  } else {
    fail(`figure: ${page} og-default.png must appear only in social meta tags, never as an in-page image`);
  }
  const figures = [...html.matchAll(/<figure[\s\S]*?<\/figure>/g)].map((m) => m[0]);
  if (figures.length === 5) {
    pass(`figure: ${page} renders exactly the 5 section figures (L2 x4 + L3 hero)`);
  } else {
    fail(`figure: ${page} must render exactly 5 figure elements, found ${figures.length}`);
  }
  if (figures.every((figure) => !/<script/i.test(figure))) {
    pass(`figure: ${page} figures are static markup (no-JS fallback, plain <img> PNG)`);
  } else {
    fail(`figure: ${page} figure elements must not contain scripts (static PNG fallback)`);
  }
}

// ---------------------------------------------------------------------------
// 8g5. Hero film contract (docs/DESIGN.md - Hero film).
//
//     The film is progressive enhancement, and that is the whole claim. These
//     assertions exist so that claim cannot be quietly broken: a hero that
//     starts depending on the video, or a reduced-motion path that leaves a
//     paused first frame on screen, both fail here rather than in production.
// ---------------------------------------------------------------------------
const HERO_FILM = '/assets/motion/el-caret.mp4';
const HERO_POSTER = '/assets/dither/hero-dither.png';
const FILM_MAX_BYTES = 300 * 1024; // docs/DESIGN.md - Hero film asset contract

const filmPath = resolve(ROOT, 'public', HERO_FILM.replace(/^\//, ''));
if (!existsSync(filmPath)) {
  fail(`film: committed hero film ${HERO_FILM} is missing`);
} else {
  const bytes = statSync(filmPath).size;
  if (bytes <= FILM_MAX_BYTES) {
    pass(`film: ${HERO_FILM} is within budget (${bytes} / ${FILM_MAX_BYTES} bytes)`);
  } else {
    fail(`film: ${HERO_FILM} must be <= ${FILM_MAX_BYTES} bytes, got ${bytes}`);
  }
}

for (const [page, html] of [
  ['ES', esHtml],
  ['EN', enHtml],
]) {
  if (!html) continue;
  const region = sectionRegion(html, 'top');
  if (!region) {
    fail(`film: ${page} #top section must render`);
    continue;
  }
  const occurrences = (html.match(new RegExp(`src="${escapeRegex(HERO_FILM)}"`, 'g')) ?? []).length;
  if (occurrences === 1) {
    pass(`film: ${page} hero film appears exactly once (containment, no repeats)`);
  } else {
    fail(`film: ${page} ${HERO_FILM} must appear exactly once, found ${occurrences}`);
  }

  const videoTag = region.match(/<video\b[^>]*>/)?.[0] ?? '';
  if (!videoTag) {
    fail(`film: ${page} hero must render the <video> film`);
  } else {
    // Autoplay only works muted; without these the hero shows a dead frame.
    for (const [attr, label] of [
      ['autoplay', 'autoplay'],
      ['muted', 'muted (required for autoplay)'],
      ['loop', 'loop'],
      ['playsinline', 'playsinline (required for iOS inline playback)'],
      ['aria-hidden="true"', 'aria-hidden (decorative)'],
      ['tabindex="-1"', 'tabindex="-1" (never focusable)'],
      ['width="960"', 'intrinsic width'],
      ['height="540"', 'intrinsic height'],
    ]) {
      if (videoTag.includes(attr)) {
        pass(`film: ${page} hero video carries ${label}`);
      } else {
        fail(`film: ${page} hero video must carry ${label}`);
      }
    }
    if (!/\bcontrols\b/.test(videoTag)) {
      pass(`film: ${page} hero video has no controls (ambient, not a player)`);
    } else {
      fail(`film: ${page} hero video must not expose controls`);
    }
    if (/\bon[a-z]+=/.test(videoTag)) {
      fail(`film: ${page} hero video must not carry inline event handlers`);
    } else {
      pass(`film: ${page} hero film runs with no JS`);
    }
  }

  // The stack contract: the poster is a real <img> in the DOM, not a `poster`
  // attribute. That is what makes no-JS and reduced-motion land on the image.
  const heroFigure = region.match(/<figure\b[\s\S]*?<\/figure>/)?.[0] ?? '';
  if (heroFigure.includes(`src="${HERO_POSTER}"`)) {
    pass(`film: ${page} hero stacks the film over the static poster (no-JS path)`);
  } else {
    fail(`film: ${page} hero figure must keep the ${HERO_POSTER} poster underneath`);
  }
  if (heroFigure.indexOf(HERO_POSTER) < heroFigure.indexOf('<video')) {
    pass(`film: ${page} poster precedes the video (poster is the base layer)`);
  } else {
    fail(`film: ${page} the poster <img> must come before the <video> in the hero figure`);
  }
}

// Reuse the brace-aware reduced-motion block extraction already built above
// (reducedMotionBlocks): the minifier merges sibling media blocks, so the film
// rule shares a block with the disclosure rules and plain regex truncates.
if (reducedMotionBlocks.some((b) => /\.joyan-film\{display:none\}/.test(b))) {
  pass('film: reduced-motion users get the static poster (film removed, not paused)');
} else {
  fail('film: compiled CSS must remove .joyan-film under prefers-reduced-motion');
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
console.log(`\niteration-2 checks: ${passed.length} passed, ${failures.length} failed`);
for (const message of passed) console.log(`  ✓ ${message}`);
for (const message of failures) console.error(`  ✗ ${message}`);

if (failures.length > 0) {
  console.error('\niteration-2: FAILED — see failures above.');
  process.exit(1);
}

console.log('\niteration-2: PASS');
