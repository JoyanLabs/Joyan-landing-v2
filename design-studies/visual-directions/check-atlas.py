"""Check the isolated atlas through its served files and declared color data."""
import json
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:4402/'
checks = []
def check(name, passed):
    checks.append({'check': name, 'pass': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name)
def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=5) as response:
        check('HTTP ' + path, response.status == 200)
        return response.read().decode()
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
        self.scripts = self.inline = self.details = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.scripts += tag == 'script'
        self.details += tag == 'details'
        self.inline += 'style' in attrs
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.refs.append(attrs[key])
data = json.loads(fetch('atlas.json'))
old = json.loads(fetch('harmonies.json'))
css = fetch('atlas-colors.css')
p = Page()
p.feed(fetch('atlas.html'))
check('10 options and disclosures', len(data) == p.details == 10)
check('No scripts or inline styles', p.scripts == p.inline == 0)
check('Unique IDs', len(p.ids) == len(set(p.ids)))
for ref in sorted(set(p.refs)):
    if ref.startswith('#'):
        check('Anchor ' + ref, ref[1:] in p.ids)
    else:
        fetch(ref)
with urllib.request.urlopen(BASE+'fonts/michroma-400.woff2', timeout=5) as response:
    check('Font served', response.status == 200 and len(response.read()) > 0)
def circles(svg):
    return ET.fromstring(svg).findall('.//{http://www.w3.org/2000/svg}circle')
def geometry(dots):
    return [(d.attrib['cx'], d.attrib['cy'], d.attrib['r']) for d in dots]
base = circles(fetch('h1-harmony.svg'))
for item in data:
    code = item['id']
    path = code+'-harmony.svg' if item['kind'] == 'reference' else 'atlas-'+code+'.svg'
    dots = circles(fetch(path))
    check(code+' identical geometry', geometry(dots) == geometry(base))
    declared = item['ramp'] + (item['secondary'] or [])
    check(code+' declared colors only', all(d.attrib['fill'] in declared for d in dots))
    for role in ('ink', 'muted', 'accent'):
        score = contrast(item[role], item['bg'])
        check(f'{code}/{role} contrast {score:.2f}:1', score >= 4.5)
    for role in ('bg', 'panel', 'ink', 'muted', 'accent'):
        check(code+' CSS '+role, '--'+role+':'+item[role] in css)
    if item['secondary']:
        count = sum(d.attrib['fill'] in item['secondary'] for d in dots)
        check(f'{code} secondary visible and localized ({count}/{len(dots)} dots)', 0 < count/len(dots) < .15 and count == item['secondaryDotCount'])
        check(code+' every secondary used', all(any(d.attrib['fill'] == color for d in dots) for color in item['secondary']))
    if item['kind'] == 'reference':
        original = next(v for v in old if v['id'] == code)
        check(code+' palette unchanged', all(item[k] == original[k] for k in ('bg','panel','ink','muted','accent','ramp')))
for fg in ('#24282B', '#50565B'):
    check('Editorial text '+fg, contrast(fg, '#E8E5DF') >= 4.5)
output = ROOT.parent.parent/'dist-motion-verify/wu36-atlas-01/checks-green.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({'checks': checks, 'limitations': ['Static color-pair checks, not full accessibility audit', 'Secondary coverage measured as number of dots, not screen area']}, indent=2)+'\n')
print(f'{sum(c["pass"] for c in checks)}/{len(checks)} PASS')
raise SystemExit(0 if all(c['pass'] for c in checks) else 1)
