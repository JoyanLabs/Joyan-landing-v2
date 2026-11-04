"""Adapt Angie's two Color Hunt palettes into the seven-tier scene system.

Rules kept honest:
  * The seven tiers are blended only between the four colours she sent.
  * Any neutral the palette lacks (paper, text, muted) is flagged as authored.
  * The paper ground is re-solved: same dot centres, larger radii, so the
    ink builds shadow instead of reading as a pale grid.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def mix(a, b, t):
    a, b = a.lstrip('#'), b.lstrip('#')
    return '#' + ''.join(f'{round(int(a[i:i+2], 16) + (int(b[i:i+2], 16) - int(a[i:i+2], 16)) * t):02X}'
                         for i in (0, 2, 4))


def tiers(stops, count=7):
    """Blend the given colours into `count` ordered tiers (shadow -> light)."""
    out = []
    for k in range(count):
        t = k / (count - 1) * (len(stops) - 1)
        i = min(int(t), len(stops) - 2)
        out.append(mix(stops[i], stops[i + 1], t - i))
    return out


PALETTES = [
    dict(id='p1', name='Violeta de Angie', source='colorhunt.co/palette/1f2544474f7a81689dffd0ec',
         given=['#1F2544', '#474F7A', '#81689D', '#FFD0EC'],
         dark=dict(bg='#1F2544', panel='#2E3560', ink='#F4EFF8', muted='#BDB2CE',
                   accent='#FFD0EC', accent_tier='#FFD0EC'),
         paper=dict(bg='#F3EEF6', panel='#E7DFEE', ink='#1F2544', muted='#6B5C86',
                    accent='#5E4478', accent_tier='#5E4478')),
    dict(id='p2', name='Verde de Angie', source='colorhunt.co/palette/0b09092e4540408175b5b9f0',
         given=['#0B0909', '#2E4540', '#408175', '#B5B9F0'],
         dark=dict(bg='#0B0909', panel='#2E4540', ink='#EDF0F6', muted='#A9BDB8',
                   accent='#B5B9F0', accent_tier='#B5B9F0'),
         paper=dict(bg='#EDF0F4', panel='#DDE4E5', ink='#0B0909', muted='#40605A',
                    accent='#1F6B5C', accent_tier='#1F6B5C')),
]


def field(ramp, accent_tier, radius_scale):
    """The same fold as the H1/H3 studies, rebuilt so radii can be re-solved."""
    dots = []
    for j in range(62):
        for i in range(75):
            u, v = i / 74, j / 61
            edge = .49 + .11 * __import__('math').sin(v * 4.8)
            dist = abs(u - edge)
            if dist < .035:
                continue
            ridge = __import__('math').exp(-dist * 16)
            right = u > edge
            x = 48 + 570 * u + 26 * __import__('math').sin(__import__('math').pi * v) + (1 if right else -1) * ridge * 16
            y = 110 + 430 * v - 65 * u + 23 * __import__('math').sin(u * __import__('math').pi * 2) + (-1 if right else 1) * ridge * 24
            fold = .5 + .5 * __import__('math').sin(u * 4.9 + v * 1.3)
            level = max(0, min(6, round((.17 + fold * .45 + ridge * .45) * 6)))
            radius = (1.1 + fold * .65 + ridge * .7) * radius_scale
            fill = accent_tier if ridge > .55 else ramp[level]
            dots.append((x, y, radius, fill))
    return dots


def svg_for(dots, title, stroke):
    body = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{c}"/>' for x, y, r, c in dots)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="680" height="620" viewBox="0 0 680 620">'
            f'<title>{title}</title><g stroke="{stroke}" stroke-width="1" fill="none">'
            f'<path d="M32 110V80h30M618 80h30v30M32 530v30h30M618 560h30v-30"/></g>{body}</svg>\n')


boards = []
css = []
for palette in PALETTES:
    ramp = tiers(palette['given'])
    for ground in ('dark', 'paper'):
        spec = palette[ground]
        scale = 1.0 if ground == 'dark' else 1.55
        board_id = f"{palette['id']}-{'negro' if ground == 'dark' else 'papel'}"
        dots = field(ramp, spec['accent_tier'], scale)
        name = f"{board_id}.svg"
        (ROOT / name).write_text(svg_for(dots, f"{palette['name']} / {ground}", ramp[2]))
        boards.append(dict(id=board_id, palette=palette['id'], palette_name=palette['name'],
                           ground='Negro' if ground == 'dark' else 'Papel',
                           source=palette['source'], given=palette['given'], ramp=ramp,
                           radiusScale=scale, image=name, authored=ground == 'paper',
                           **{k: spec[k] for k in ('bg', 'panel', 'ink', 'muted', 'accent')},
                           accentTier=spec['accent_tier'],
                           note=('Luz sobre fondo oscuro.' if ground == 'dark'
                                 else 'Tinta re-resuelta: mismos centros, más radio.')))
        css.append(f'.g-{board_id}' + '{' + ';'.join(
            f'--{k}:{spec[k]}' for k in ('bg', 'panel', 'ink', 'muted', 'accent')) + '}')
        for i, color in enumerate(ramp):
            css.append(f'.g-{board_id} .r{i}' + '{background:' + color + '}')

(ROOT / 'angie.json').write_text(json.dumps(boards, indent=2, ensure_ascii=False) + '\n')
(ROOT / 'angie-colors.css').write_text('\n'.join(css) + '\n')

cards = []
for board in boards:
    ramp = ''.join(f'<span class="r{i}" title="{c}"></span>' for i, c in enumerate(board['ramp']))
    cards.append(f'''<article class="board g-{board['id']}" id="{board['id']}" aria-labelledby="t-{board['id']}">
<header class="board-head"><div><p class="label">{board['palette_name']}</p><h2 id="t-{board['id']}">{board['ground']}</h2></div><span class="label">{board['note']}</span></header>
<div class="preview"><div class="top"><span class="wordmark">Joyan</span><span class="label">NO FATE.</span></div>
<div class="composition"><div class="copy"><p class="label">CRITERIO HUMANO</p><p class="headline">Alguien tiene<br>que mirar a<br>las máquinas<span>.</span></p><p class="support">Construir juntos.<br>Sin renunciar al criterio.</p></div><img src="{board['image']}" width="680" height="620" alt="Pliegue de puntos con la paleta de Angie sobre {board['ground'].lower()}."></div>
<div class="bottom"><span class="label">LA TECNOLOGÍA NO DECIDE POR NOSOTROS</span><span class="arrow" aria-hidden="true">↗</span></div></div>
<div class="ramp">{ramp}</div>
<p class="caption">Siete tonos mezclados solo entre los cuatro colores de Angie. {'El papel y la tinta son neutros que agregué: su paleta no incluye fondo claro.' if board['authored'] else 'Sin tonos agregados en la escena.'}</p>
</article>''')

(ROOT / 'angie.html').write_text(f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Joyan / las paletas de Angie en el sistema</title><link rel="stylesheet" href="grounds.css"><link rel="stylesheet" href="angie-colors.css"></head>
<body><header class="page-head"><a class="wordmark" href="atlas.html">Joyan</a><a href="grounds.html">Ver el estudio de suelo anterior ↗</a></header>
<main><section class="intro"><p class="label">ESTUDIO 07 / PALETAS DEL EQUIPO, ADAPTADAS</p><h1>Cuatro colores.<br>Siete tonos.</h1><p>Las dos paletas de Angie convertidas en una gama continua: la escena no usa cuatro planos, usa siete pasos mezclados entre sus mismos colores. Cada una aparece en negro y en papel, con el papel re-resuelto.</p><p class="keys"><strong>P1</strong> es violeta con rosa: se parece a H3 y comparte su riesgo, el violeta genérico de IA. <strong>P2</strong> es casi negro con verde y periwinkle: no se parece a nada que hayamos probado y es la más difícil de confundir con otra marca.</p></section>
<div class="grid">{''.join(cards)}</div>
<section class="notes"><p class="label">QUÉ CAMBIÓ EN EL PAPEL</p><h2>Mismos centros. Más tinta.</h2><ol>
<li><strong>El papel ya no es un color invertido.</strong> Los centros de los puntos son idénticos al negro; el radio sube ×1,55 para que la tinta construya sombra.</li>
<li><strong>El acento se oscurece, no se aclara.</strong> En papel el rosa y el periwinkle desaparecen; el acento pasa a violeta profundo y a verde profundo, marcados como neutros agregados.</li>
<li><strong>Ningún color nuevo entra en la escena.</strong> Los siete tonos salen de mezclar los cuatro de Angie entre sí.</li>
</ol><p class="disclaimer">Estudio estático aislado. No cambia el motor, la landing ni el OG, y no aprueba ninguna paleta. P1 y P2 no son las paletas finales: son sus paletas probadas dentro de un sistema.</p></section>
</main><footer class="page-foot">JOYAN / ESTUDIO 07 · Adaptar no es aplicar cuatro cuadritos.</footer></body></html>
''')
print(f'Generated {len(boards)} boards for {len(PALETTES)} palettes.')
