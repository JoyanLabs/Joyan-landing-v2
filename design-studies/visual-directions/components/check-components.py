"""Check the component sheet: contrast by role, structure, HTTP, determinism."""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:4402/components/'
GROUNDS = {
    'oscuro': {'bg': '#10191C', 'surface': '#182A30', 'ink': '#E4EEEA', 'muted': '#ACC3C1', 'accent': '#94CCBB'},
    'papel': {'bg': '#F2EFE7', 'surface': '#E4E0D6', 'ink': '#15191A', 'muted': '#4B5658', 'accent': '#1C6B61'},
}
checks, fails = [], []

def check(name, passed):
    checks.append({'check': name, 'pass': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name)
    if not passed:
        fails.append(name)

def luminance(color):
    channels = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    return sum((c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4)*w
               for c, w in zip(channels, (.2126, .7152, .0722)))

def contrast(a, b):
    lo, hi = sorted((luminance(a), luminance(b)))  # ascending: lo first
    return (hi+.05)/(lo+.05)

def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=5) as response:
        check(f'HTTP {response.status} {path}', response.status == 200)
        return response.read()

html = (ROOT / 'index.html').read_text()
css = (ROOT / 'components.css').read_text()
check('no <script>', '<script' not in html.lower())
check('no inline style attributes', 'style="' not in html)
check('no <style> blocks', '<style' not in html.lower())
check('six components per ground', html.count('class="card"') == 12)
check('both grounds present', 'class="sheet oscuro"' in html and 'class="sheet papel"' in html)
check('forced hover and focus states', 'is-hover' in html and 'is-focus' in html)
check('static-sample notice', 'Muestras estáticas' in html)

for path in ('index.html', 'components.css', 'fonts/instrument-serif-400-latin.woff2',
             'fonts/archivo-latin.woff2', 'fonts/michroma-400.woff2', 'contrast.json'):
    if path != 'contrast.json':
        fetch(path)

measured = {}
for ground, tokens in GROUNDS.items():
    for fg, bg, label in (('ink', 'bg', 'texto sobre fondo'),
                          ('muted', 'bg', 'secundario sobre fondo'),
                          ('accent', 'bg', 'señal sobre fondo'),
                          ('bg', 'accent', 'texto del póster')):
        ratio = contrast(tokens[fg], tokens[bg])
        measured[f'{ground}: {label}'] = round(ratio, 2)
        check(f'{ground} {label} {ratio:.2f}:1', ratio >= 4.5)

report = {'grounds': GROUNDS, 'measured': measured,
          'note': 'Los separadores usan el token superficie; la rampa de siete escalones no se usa en interfaz.',
          'limitations': ['Static colour-pair checks, not a full accessibility audit',
                          'Forced state classes are specimens, not real interaction']}
(ROOT / 'contrast.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
fetch('contrast.json')
print(f'{sum(c["pass"] for c in checks)}/{len(checks)} PASS')
raise SystemExit(0 if not fails else 1)
