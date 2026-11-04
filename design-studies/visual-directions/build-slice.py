"""Vertical slice in H1, three ways: dark ground, paper ground, and hybrid.

The hybrid is a dark hero over a paper body. The dark hero also gets a
mobile-rescaled scene: same dot centres, larger radius, served through
<picture> so a 390px viewport no longer looks at a nearly invisible field.
Static study: no animation, no engine change, no landing change.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
h1 = next(v for v in json.loads((ROOT / 'harmonies.json').read_text()) if v['id'] == 'h1')

DARK = dict(bg=h1['bg'], panel=h1['panel'], ink=h1['ink'], muted=h1['muted'],
            accent=h1['accent'], line=h1['panel'], ramp=h1['ramp'], fold=h1['ramp'][5],
            note='Luz sobre fondo oscuro: la escena emite.')
PAPER = dict(bg='#F2EFE7', panel='#E4E0D6', ink='#15191A', muted='#4B5658',
             accent='#1C6B61', line='#CFC9BC',
             ramp=['#1B2B2C', '#2A4342', '#3B5B59', '#547674', '#7C9895', '#ADC0BB', '#D8DFDA'],
             fold='#1C6B61', note='Tinta sobre papel: la escena absorbe.')

GROUNDS = {
    'negro': dict(file='slice-negro.html', label='Negro', other='papel', hybrid=False,
                  ground=DARK, radius=1.0, mobile_radius=1.5),
    'papel': dict(file='slice-papel.html', label='Papel', other='negro', hybrid=False,
                  ground=PAPER, radius=1.55, mobile_radius=1.55),
    'hibrido': dict(file='slice-hibrido.html', label='Híbrido', other='negro', hybrid=True,
                    top=DARK, bottom=PAPER, radius=1.0, mobile_radius=1.5),
}


def field(ramp, fold, radius_scale):
    dots = []
    for j in range(62):
        for i in range(75):
            u, v = i / 74, j / 61
            edge = .49 + .11 * math.sin(v * 4.8)
            dist = abs(u - edge)
            if dist < .035:
                continue
            ridge = math.exp(-dist * 16)
            right = u > edge
            x = 48 + 570 * u + 26 * math.sin(math.pi * v) + (1 if right else -1) * ridge * 16
            y = 110 + 430 * v - 65 * u + 23 * math.sin(u * math.pi * 2) + (-1 if right else 1) * ridge * 24
            tw = .5 + .5 * math.sin(u * 4.9 + v * 1.3)
            level = max(0, min(6, round((.17 + tw * .45 + ridge * .45) * 6)))
            dots.append((x, y, (1.1 + tw * .65 + ridge * .7) * radius_scale,
                         fold if ridge > .55 else ramp[level]))
    return dots


def svg(dots, title, stroke):
    body = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{c}"/>' for x, y, r, c in dots)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="680" height="620" viewBox="0 0 680 620" role="img">'
            f'<title>{title}</title><g stroke="{stroke}" stroke-width="1" fill="none">'
            f'<path d="M32 110V80h30M618 80h30v30M32 530v30h30M618 560h30v-30"/></g>{body}</svg>\n')


def scene_block(key, desktop, mobile, note, label):
    return (f'<picture><source media="(max-width:900px)" srcset="{mobile}">'
            f'<img src="{desktop}" width="680" height="620" alt="Un pliegue de puntos: la materia se abre y deja ver una franja de luz."></picture>'
            f'<figcaption>FIG. 01 / APERTURA — {label}</figcaption>')


def page(key, g):
    other = GROUNDS[g['other']]
    top = g['top'] if g['hybrid'] else g['ground']
    bottom = g['bottom'] if g['hybrid'] else g['ground']
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Joyan — rodaja vertical · {g['label']}</title><link rel="stylesheet" href="slice.css"><link rel="stylesheet" href="slice-colors.css"></head>
<body class="g-{key}">
<a class="skip" href="#forma">Saltar al contenido</a>
<div class="block-top">
<header class="nav"><a class="wordmark" href="slice-negro.html">Joyan</a>
<nav aria-label="Secciones"><a href="#forma">Forma de hacer</a><a href="#territorios">Territorios</a><a href="#notas">Notas</a><a href="{other['file']}">Ver en {other['label']} ↗</a></nav></header>
<section class="hero" aria-labelledby="headline">
<div class="hero-copy">
<p class="eyebrow">TALLER ABIERTO · CRITERIO HUMANO</p>
<h1 id="headline">Alguien tiene<br>que mirar a<br>las máquinas<span>.</span></h1>
<p class="lede">Construir con máquinas.<br>Sin renunciar al criterio.</p>
<a class="cta" href="#forma">Conocer el taller <span aria-hidden="true">↗</span></a>
</div>
<figure class="scene">{scene_block(key, f'slice-{key}.svg', f'slice-{key}-movil.svg', top['note'], g['label'])}</figure>
<div class="hero-foot"><span class="tag">NO FATE.</span><p>La tecnología no decide por nosotros.</p></div>
</section>
</div>
<div class="block-bottom">
<main>
<section class="forma" id="forma" aria-labelledby="forma-title">
<p class="eyebrow">01 / UNA FORMA DE HACER</p>
<div class="two"><h2 id="forma-title">Construir juntos.<br><span>Sin delegar el juicio.</span></h2>
<p>Nos interesa lo que podemos construir con máquinas, y también entender qué decisiones toma cada sistema, de dónde viene un resultado y de qué tenemos que hacernos cargo. Es una forma de trabajar, no una colección de herramientas.</p></div>
</section>
<section class="territorios" id="territorios" aria-labelledby="terr-title">
<p class="eyebrow">02 / TERRITORIOS POR EXPLORAR</p>
<h2 id="terr-title">Tres preguntas antes de construir.</h2>
<ol class="list">
<li><span class="num">01</span><h3>Inferencia</h3><p>¿Dónde y cómo piensa el sistema, y con qué límites?</p></li>
<li><span class="num">02</span><h3>Trazabilidad</h3><p>¿Podemos seguir una decisión hasta su origen?</p></li>
<li><span class="num">03</span><h3>Seguridad</h3><p>¿Qué pasa cuando algo falla o alguien lo fuerza?</p></li>
</ol>
<p class="fine">Territorios por explorar, no un catálogo de servicios cerrado.</p>
</section>
<section class="notas" id="notas" aria-labelledby="notas-title">
<div class="notes-copy"><p class="eyebrow">03 / NOTAS DEL TALLER</p><h2 id="notas-title">Lo que no<br>delegamos.</h2><p>El criterio, la lectura del resultado y la responsabilidad de lo que construimos. La herramienta cambia; esa parte no.</p><p class="fine">Estudio estático: sin animación, sin motor nuevo, sin cambios a la landing ni al OG. No es la identidad aprobada.</p></div>
<div class="poster"><div><p class="tag">JOYAN / NOTAS DEL TALLER</p><p class="poster-title">No es magia.<br>Es trabajo.<br><span>Y criterio.</span></p></div>
<div class="poster-foot"><span class="wordmark">Joyan</span><span class="tag">NO FATE.</span></div></div>
</section>
</main>
<footer class="foot"><span class="wordmark">Joyan</span><p>© Joyan — no fate.</p><p class="fine">H1 Marea mineral · suelo {g['label'].lower()}</p></footer>
</div>
</body></html>
'''


BASE_CSS = '''@font-face{font-family:Michroma;src:url('fonts/michroma-400.woff2') format('woff2');font-display:swap}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-synthesis:none}
p,h1,h2,h3,figure{margin:0}a{color:inherit;text-underline-offset:5px}
a:focus-visible{outline:2px solid var(--accent);outline-offset:6px}
.skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:12px;background:var(--bg);padding:10px;z-index:9}
.block-top{background:var(--bg);color:var(--ink)}
.block-bottom{background:var(--bg);color:var(--ink)}
.wordmark{font:20px/1.5 Michroma,sans-serif;letter-spacing:-.04em;text-decoration:none}
.tag,.eyebrow,.fine,figcaption{font-family:monospace;font-weight:400}
.eyebrow{font-size:10px;letter-spacing:.12em;color:var(--accent);line-height:1.7}
.fine{font-size:11px;line-height:1.7;color:var(--muted)}
.nav{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 5vw;border-bottom:1px solid var(--line)}
.nav nav{display:flex;gap:22px;font-size:12px;color:var(--muted)}
.nav nav a:last-child{color:var(--accent)}
.hero{padding:0 5vw;max-width:1600px;margin:auto}
.hero-copy{padding:70px 0 40px;max-width:720px}
h1{font-size:clamp(46px,6.4vw,96px);font-weight:400;line-height:1.02;letter-spacing:-.055em;margin:26px 0}
h1 span{color:var(--accent)}
.lede{font-size:17px;line-height:1.7;color:var(--muted)}
.cta{display:inline-flex;gap:40px;align-items:center;margin-top:26px;padding-bottom:10px;border-bottom:1px solid var(--accent);font-size:13px;text-decoration:none}
.cta span{font-size:20px;color:var(--accent)}
.scene{display:grid;grid-template-columns:1fr;margin:-220px 0 20px;justify-items:end;max-width:620px;margin-left:auto}
.scene img{width:100%;height:auto;display:block}
figcaption{font-size:9px;letter-spacing:.08em;color:var(--muted);text-align:right;padding-top:8px}
.hero-foot{display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid var(--line);padding:22px 0 40px}
.hero-foot .tag{color:var(--accent);font-size:10px;letter-spacing:.14em}
.hero-foot p{font-size:12px;color:var(--muted)}
.forma,.territorios,.notas{padding:0 5vw;max-width:1600px;margin:auto}
.forma{padding-top:60px;padding-bottom:60px}
.block-bottom{border-top:1px solid var(--line)}
.two{display:grid;grid-template-columns:1.1fr 1fr;gap:70px;align-items:start;margin-top:22px}
h2{font-size:clamp(30px,3.4vw,50px);font-weight:400;line-height:1.12;letter-spacing:-.045em}
.two h2 span{color:var(--muted)}
.two p{font-size:15px;line-height:1.75;color:var(--muted);max-width:460px}
.territorios{padding-top:20px;padding-bottom:60px}
.list{list-style:none;padding:0;margin:26px 0 18px;display:grid;grid-template-columns:repeat(3,1fr);gap:30px}
.list li{border-top:1px solid var(--line);padding-top:16px}
.num{font:10px/1.7 monospace;color:var(--accent)}
h3{font-size:20px;font-weight:400;margin:12px 0 8px}
.list p{font-size:13px;line-height:1.7;color:var(--muted)}
.notas{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:stretch;padding-bottom:70px}
.notes-copy{display:flex;flex-direction:column;border-top:1px solid var(--line);padding-top:18px}
.notes-copy h2{font-size:clamp(30px,3.2vw,46px);margin:14px 0 18px}
.notes-copy p{font-size:14px;line-height:1.75;color:var(--muted);max-width:420px}
.notes-copy .fine{margin-top:auto;padding-top:26px}
.poster{background:var(--accent);color:var(--bg);padding:34px;display:flex;flex-direction:column;justify-content:space-between;min-height:380px}
.poster .tag{font-size:9px;letter-spacing:.12em}
.poster-title{font-size:clamp(34px,4vw,58px);line-height:1.03;letter-spacing:-.05em;margin:26px 0}
.poster-title span{opacity:.82}
.poster-foot{display:flex;justify-content:space-between;align-items:center}
.poster-foot .wordmark{font-size:17px}
.foot{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:26px 5vw;border-top:1px solid var(--line)}
.foot p{font-size:12px;color:var(--muted)}
@media(max-width:900px){
.nav{flex-direction:column;align-items:flex-start;gap:12px;padding:18px 5vw}
.nav nav{gap:14px;flex-wrap:wrap;font-size:11px}
.hero-copy{padding:40px 0 26px}h1{margin:20px 0}.lede{font-size:15px}
.scene{margin:0 auto 18px;justify-items:center;max-width:440px}
figcaption{text-align:center}.hero-foot{gap:10px;padding:18px 0 30px}.hero-foot p{font-size:11px;max-width:170px;text-align:right}
.two{grid-template-columns:1fr;gap:24px}.list{grid-template-columns:1fr;gap:0}
.list li{padding:16px 0}.notas{grid-template-columns:1fr}.poster{min-height:330px;padding:26px}
.foot{flex-direction:column;align-items:flex-start;gap:6px;padding:22px 5vw}
}
'''

css = [BASE_CSS]
for key, g in GROUNDS.items():
    top = g['top'] if g['hybrid'] else g['ground']
    bottom = g['bottom'] if g['hybrid'] else g['ground']
    dots = field(top['ramp'], top['fold'], g['radius'])
    (ROOT / f'slice-{key}.svg').write_text(svg(dots, f'Joyan — apertura {g["label"].lower()}', top['ramp'][2]))
    mob = field(top['ramp'], top['fold'], g['mobile_radius'])
    (ROOT / f'slice-{key}-movil.svg').write_text(svg(mob, f'Joyan — apertura {g["label"].lower()}, móvil', top['ramp'][2]))
    spec = top if not g['hybrid'] else bottom
    css.append(f'.g-{key}' + '{' + ';'.join(f'--{k}:{spec[k]}' for k in ('bg', 'panel', 'ink', 'muted', 'accent', 'line')) + '}')
    if g['hybrid']:
        css.append('.g-hibrido .block-top{' + ';'.join(f'--{k}:{top[k]}' for k in ('bg', 'panel', 'ink', 'muted', 'accent', 'line')) + '}')
        css.append('.g-hibrido{background:' + bottom['bg'] + '}')
    (ROOT / g['file']).write_text(page(key, g))

(ROOT / 'slice.css').write_text(css[0])
(ROOT / 'slice-colors.css').write_text('\n'.join(css[1:]) + '\n')
(ROOT / 'slice.json').write_text(json.dumps(
    {k: {kk: vv for kk, vv in v.items()} for k, v in GROUNDS.items()}, indent=2, ensure_ascii=False) + '\n')
print('Generated negro, papel and hibrido pages with mobile-rescaled dark scenes.')
