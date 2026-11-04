"""Check the ground study through the files the browser actually loads."""
import json
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:4402/'
OUT = ROOT.parent.parent / 'dist-motion-verify/wu36-grounds-01'
checks = []

def check(name, passed):
    checks.append({'check': name, 'pass': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name)

def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=5) as response:
        check('HTTP ' + path, response.status == 200)
        return response.read()

def luminance(color):
    values = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    return sum((v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4)*w for v, w in zip(values, (.2126, .7152, .0722)))

def contrast(a, b):
    lo, hi = sorted((luminance(a), luminance(b)))
    return (hi+.05)/(lo+.05)

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

boards = json.loads(fetch('grounds.json'))
css = fetch('grounds-colors.css').decode()
page = Page()
page.feed(fetch('grounds.html').decode())
check('Four boards, two grounds each', len(boards) == 4 and len({b['ground'] for b in boards}) == 2)
check('No scripts or inline styles', page.scripts == page.inline == 0)
check('Unique IDs', len(page.ids) == len(set(page.ids)))
for ref in sorted(set(page.refs)):
    if ref.startswith('#'):
        check('Anchor ' + ref, ref[1:] in page.ids)
    else:
        fetch(ref)

def circles(raw):
    return ET.fromstring(raw).findall('.//{http://www.w3.org/2000/svg}circle')

def geometry(dots):
    return [(d.attrib['cx'], d.attrib['cy'], d.attrib['r']) for d in dots]

sources = {code: circles(fetch(f'{code}-harmony.svg')) for code in ('h1', 'h3')}
ratios = {}
for board in boards:
    dots = circles(fetch(board['image']))
    code = board['source']
    check(board['id'] + ' same geometry as ' + code, geometry(dots) == geometry(sources[code]))
    declared = set(board['ramp'] + [board['accent']])
    check(board['id'] + ' draws only declared colours', all(d.attrib['fill'] in declared for d in dots))
    if board['exchange']:
        check(board['id'] + ' is a real paper recolour', board['image'].startswith('grounds-'))
        check(board['id'] + ' accent tier present in the scene',
              any(d.attrib['fill'] == board['accentTier'] for d in dots))
    for role in ('ink', 'muted', 'accent'):
        score = contrast(board[role], board['bg'])
        ratios[f"{board['id']}/{role}"] = round(score, 2)
        check(f"{board['id']}/{role} contrast {score:.2f}:1", score >= 4.5)
    for role in ('bg', 'panel', 'ink', 'muted', 'accent'):
        check(f"{board['id']} CSS {role}", f'--{role}:{board[role]}' in css)

dark_ids = {b['id'] for b in boards if not b['exchange']}
check('Dark boards reuse the original images',
      all(b['image'] == b['source'] + '-harmony.svg' for b in boards if b['id'] in dark_ids))

OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'checks.json').write_text(json.dumps({'checks': checks, 'contrast': ratios, 'limitations': [
    'Static colour-pair contrast only; not a full accessibility audit',
    'Paper boards keep the geometry of the dark study, so the ink density is not yet re-solved for paper',
    'No animation, no engine change, no landing change']}, indent=2) + '\n')
print(f'{sum(c["pass"] for c in checks)}/{len(checks)} PASS')
raise SystemExit(0 if all(c['pass'] for c in checks) else 1)
