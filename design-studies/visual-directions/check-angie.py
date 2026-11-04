"""Check Angie's palettes adapted into the seven-tier system."""
import json
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:4402/'
OUT = ROOT.parent.parent / 'dist-motion-verify/wu36-angie-01'
checks = []

def check(name, passed):
    checks.append({'check': name, 'pass': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name)

def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=5) as response:
        check('HTTP ' + path, response.status == 200)
        return response.read()

def rgb(color):
    return tuple(int(color[i:i+2], 16) for i in (1, 3, 5))

def luminance(color):
    values = [c/255 for c in rgb(color)]
    return sum((v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4)*w for v, w in zip(values, (.2126, .7152, .0722)))

def contrast(a, b):
    lo, hi = sorted((luminance(a), luminance(b)))
    return (hi+.05)/(lo+.05)

def distance_to_polyline(color, stops):
    p = rgb(color)
    best = 1e9
    for a, b in zip(stops, stops[1:]):
        a, b = rgb(a), rgb(b)
        ab = [b[i]-a[i] for i in range(3)]
        length = sum(c*c for c in ab) or 1
        t = max(0.0, min(1.0, sum((p[i]-a[i])*ab[i] for i in range(3))/length))
        best = min(best, max(abs(p[i]-(a[i]+ab[i]*t)) for i in range(3)))
    return best

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids = [], []
        self.scripts = self.inline = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.scripts += tag == 'script'
        self.inline += 'style' in attrs
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.refs.append(attrs[key])

boards = json.loads(fetch('angie.json'))
css = fetch('angie-colors.css').decode()
page = Page()
page.feed(fetch('angie.html').decode())

check('Two palettes, two grounds each', len(boards) == 4)
check('Both source palettes kept', len({b['palette'] for b in boards}) == 2)
check('No scripts or inline styles', page.scripts == page.inline == 0)
check('Unique IDs', len(page.ids) == len(set(page.ids)))
for ref in sorted(set(page.refs)):
    if ref.startswith('#'):
        check('Anchor ' + ref, ref[1:] in page.ids)
    else:
        fetch(ref)

def circles(raw):
    return ET.fromstring(raw).findall('.//{http://www.w3.org/2000/svg}circle')

ratios = {}
geometry = {}
for board in boards:
    dots = circles(fetch(board['image']))
    geometry.setdefault(board['palette'], {})[board['ground']] = [(d.attrib['cx'], d.attrib['cy'], float(d.attrib['r'])) for d in dots]
    declared = set(board['ramp'] + [board['accentTier']])
    check(board['id'] + ' draws only declared colours', all(d.attrib['fill'] in declared for d in dots))
    check(board['id'] + ' seven tiers', len(board['ramp']) == 7 and len(set(board['ramp'])) == 7)
    worst = max(distance_to_polyline(c, board['given']) for c in board['ramp'])
    check(f"{board['id']} tiers derived only from the four given colours (max {worst:.1f}/255)", worst <= 2)
    check(board['id'] + ' accent tier in the scene', any(d.attrib['fill'] == board['accentTier'] for d in dots))
    for role in ('ink', 'muted', 'accent'):
        score = contrast(board[role], board['bg'])
        ratios[f"{board['id']}/{role}"] = round(score, 2)
        check(f"{board['id']}/{role} contrast {score:.2f}:1", score >= 4.5)
    for role in ('bg', 'panel', 'ink', 'muted', 'accent'):
        check(f"{board['id']} CSS {role}", f'--{role}:{board[role]}' in css)

for palette, grounds in geometry.items():
    dark, paper = grounds['Negro'], grounds['Papel']
    check(palette + ' paper keeps every dot centre',
          [(x, y) for x, y, _ in dark] == [(x, y) for x, y, _ in paper])
    ratios_radii = sum(p[2] for p in paper) / sum(d[2] for d in dark)
    check(f'{palette} paper ink is heavier ({ratios_radii:.2f}x radius mass)', ratios_radii > 1.4)

OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'checks.json').write_text(json.dumps({'checks': checks, 'contrast': ratios, 'limitations': [
    'Static colour-pair contrast only; not a full accessibility audit',
    'Paper neutrals and the deeper paper accents are authored, not Angie colours',
    'Scene is a study SVG, not the production engine; no animation']}, indent=2) + '\n')
print(f'{sum(c["pass"] for c in checks)}/{len(checks)} PASS')
raise SystemExit(0 if all(c['pass'] for c in checks) else 1)
