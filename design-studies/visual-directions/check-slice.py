"""Check the three slices: dark, paper and hybrid (dark hero + paper body)."""
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:4402/'
OUT = ROOT.parent.parent / 'dist-motion-verify/wu36-slice-01'
checks = []

def check(name, passed):
    checks.append({'check': name, 'pass': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name)

def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=5) as response:
        check('HTTP ' + path, response.status == 200)
        return response.read()

def luminance(color):
    v = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    return sum((x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4)*w for x, w in zip(v, (.2126, .7152, .0722)))

def contrast(a, b):
    lo, hi = sorted((luminance(a), luminance(b)))
    return (hi+.05)/(lo+.05)

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs, self.ids, self.classes = [], [], []
        self.scripts = self.inline = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.scripts += tag == 'script'
        self.inline += 'style' in attrs
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if 'class' in attrs:
            self.classes += attrs['class'].split()
        for key in ('href', 'src', 'srcset'):
            if key in attrs:
                self.refs.append(attrs[key])

grounds = json.loads(fetch('slice.json'))
raw = {}
for key, g in grounds.items():
    body = fetch(g['file'])
    raw[key] = body
    page = Page()
    page.feed(body.decode())
    check(key + ' no scripts or inline styles', page.scripts == page.inline == 0)
    check(key + ' unique IDs', len(page.ids) == len(set(page.ids)))
    check(key + ' has headline anchor', 'headline' in page.ids)
    hero = g['top'] if g.get('hybrid') else g['ground']
    foot = g['bottom'] if g.get('hybrid') else g['ground']
    for label, spec in (('hero', hero), ('body', foot)):
        for role in ('ink', 'muted', 'accent'):
            score = contrast(spec[role], spec['bg'])
            check(f'{key}/{label} {role} {score:.2f}:1', score >= 4.5)
    if g.get('hybrid'):
        check(key + ' is built from two blocks',
              'block-top' in page.classes and 'block-bottom' in page.classes)
    check(key + ' links to another ground', any(r.endswith('.html') and r != g['file'] for r in page.refs))
    for ref in sorted({r for r in page.refs if not r.startswith('#')}):
        fetch(ref)

# A dark hero must offer a heavier mobile scene; paper already reads at 1.55.
for key in ('negro', 'hibrido'):
    desktop = ET.fromstring(fetch(f'slice-{key}.svg')).findall('.//{http://www.w3.org/2000/svg}circle')
    mobile = ET.fromstring(fetch(f'slice-{key}-movil.svg')).findall('.//{http://www.w3.org/2000/svg}circle')
    check(key + ' mobile scene keeps every centre',
          [(d.attrib['cx'], d.attrib['cy']) for d in desktop] == [(d.attrib['cx'], d.attrib['cy']) for d in mobile])
    ratio = sum(float(m.attrib['r']) for m in mobile) / sum(float(d.attrib['r']) for d in desktop)
    check(f'{key} mobile ink is heavier ({ratio:.2f}x)', ratio > 1.35)
    check(key + ' serves the mobile scene through <picture>',
          f'slice-{key}-movil.svg' in raw[key].decode() and '<picture>' in raw[key].decode())

# Every scene draws only colours declared for its ground.
for key, g in grounds.items():
    top = g['top'] if g.get('hybrid') else g['ground']
    declared = set(top['ramp'] + [top['fold']])
    dots = ET.fromstring(fetch(f'slice-{key}.svg')).findall('.//{http://www.w3.org/2000/svg}circle')
    check(key + ' scene uses only declared colours', all(d.attrib['fill'] in declared for d in dots))

OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'checks-hibrido.json').write_text(json.dumps({'checks': checks, 'limitations': [
    'Static colour-pair contrast only; not a full accessibility audit',
    'No animation: the production reveal is not exercised',
    'Mobile scenes are a second static file, not a runtime density rule']}, indent=2) + '\n')
print(f'{sum(c["pass"] for c in checks)}/{len(checks)} PASS')
raise SystemExit(0 if all(c['pass'] for c in checks) else 1)
