"""Ground study: the same scene and the same palettes on a dark and a paper ground.

Reuses the geometry of the existing H1/H3 studies; only the colour mapping
changes. Nothing here touches the landing, the engine or the atlas.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
originals = {v['id']: v for v in json.loads((ROOT / 'harmonies.json').read_text())}

# Paper grounds. `ramp` is the same seven tiers, re-mapped for ink on paper:
# the darkest tier is the heaviest ink, the lightest tier almost disappears
# into the paper. `accent` becomes a deep ink so it can carry text.
light = {
    'h1': dict(bg='#F2EFE7', panel='#E4E0D6', ink='#15191A', muted='#4B5658',
               accent='#1C6B61',
               ramp=['#1B2B2C', '#2A4342', '#3B5B59', '#547674', '#7C9895', '#ADC0BB', '#D8DFDA']),
    'h3': dict(bg='#F1EFEA', panel='#E3E1DC', ink='#1A1B22', muted='#4E5063',
               accent='#554F78',
               ramp=['#232735', '#333A4E', '#4A5470', '#6C7794', '#98A2B8', '#C0C6D4', '#E0E2E8']),
}
names = {'h1': 'Marea mineral', 'h3': 'Ópalo nocturno'}
boards = []
css = []

for code in ('h1', 'h3'):
    dark = originals[code]
    boards.append(dict(id=f'{code}-negro', source=code, palette=f'{code.upper()} / {names[code]}',
                       ground='Negro', note='Luz sobre fondo oscuro: la escena emite.',
                       bg=dark['bg'], panel=dark['panel'], ink=dark['ink'],
                       muted=dark['muted'], accent=dark['accent'], ramp=dark['ramp'],
                       accentTier=dark['ramp'][-1], exchange=False))
    pale = light[code]
    boards.append(dict(id=f'{code}-papel', source=code, palette=f'{code.upper()} / {names[code]}',
                       ground='Papel', note='Tinta sobre papel: la escena absorbe luz.',
                       bg=pale['bg'], panel=pale['panel'], ink=pale['ink'],
                       muted=pale['muted'], accent=pale['accent'], ramp=pale['ramp'],
                       accentTier=pale['accent'], exchange=True))

source_svg = (ROOT / 'h1-harmony.svg').read_text()
h3_svg = (ROOT / 'h3-harmony.svg').read_text()
for board in boards:
    base = originals[board['source']]
    svg = source_svg if board['source'] == 'h1' else h3_svg
    if not board['exchange']:
        board['image'] = f"{board['source']}-harmony.svg"
        continue

    def remap(match):
        circle = match.group(0)
        old = re.search(r'fill="(#[A-Fa-f0-9]+)"', circle)[1]
        radius = float(re.search(r'r="([\d.]+)"', circle)[1])
        try:
            index = base['ramp'].index(old)
        except ValueError:
            return circle
        fill = board['accentTier'] if radius >= 1.8 else board['ramp'][index]
        return circle.replace(old, fill)

    svg = re.sub(r'<circle\b[^>]+/>', remap, svg)
    svg = svg.replace(f'stroke="{base["ramp"][2]}"', f'stroke="{board["ramp"][2]}"')
    svg = re.sub(r'<title>.*?</title>', f'<title>{board["palette"]} sobre papel</title>', svg)
    board['image'] = f"grounds-{board['id']}.svg"
    (ROOT / board['image']).write_text(svg)

    for i, color in enumerate(board['ramp']):
        css.append(f'.g-{board["id"]} .r{i}' + '{background:' + color + '}')
    css.append(f'.g-{board["id"]} .tone-accent' + '{background:' + board['accentTier'] + '}')

for board in boards:
    css.append(f'.g-{board["id"]}' + '{' + ';'.join(
        f'--{k}:{board[k]}' for k in ('bg', 'panel', 'ink', 'muted', 'accent')) + '}')

(ROOT / 'grounds.json').write_text(json.dumps(boards, indent=2, ensure_ascii=False) + '\n')
(ROOT / 'grounds-colors.css').write_text('\n'.join(css) + '\n')

cards = []
for board in boards:
    ramp = ''.join(f'<span class="r{i}" title="{c}"></span>' for i, c in enumerate(board['ramp']))
    cards.append(f'''<article class="board g-{board['id']}" id="{board['id']}" aria-labelledby="t-{board['id']}">
<header class="board-head"><div><p class="label">{board['palette']}</p><h2 id="t-{board['id']}">{board['ground']}</h2></div><span class="label">{board['note']}</span></header>
<div class="preview"><div class="top"><span class="wordmark">Joyan</span><span class="label">NO FATE.</span></div>
<div class="composition"><div class="copy"><p class="label">CRITERIO HUMANO</p><p class="headline">Alguien tiene<br>que mirar a<br>las máquinas<span>.</span></p><p class="support">Construir juntos.<br>Sin renunciar al criterio.</p><p class="signature">EL COLOR APARECE DONDE HACE FALTA</p></div><img src="{board['image']}" width="680" height="620" alt="Pliegue de puntos en la gama {board['palette']} sobre fondo {board['ground'].lower()}."></div>
<div class="bottom"><span class="label">LA TECNOLOGÍA NO DECIDE POR NOSOTROS</span><span class="arrow" aria-hidden="true">↗</span></div></div>
<div class="ramp">{ramp}</div>
<p class="caption">Siete tonos de la escena. Los más claros casi se funden con el fondo; no sirven como texto.</p>
</article>''')

(ROOT / 'grounds.html').write_text(f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Joyan / la misma escena sobre negro y sobre papel</title><link rel="stylesheet" href="grounds.css"><link rel="stylesheet" href="grounds-colors.css"></head>
<body><header class="page-head"><a class="wordmark" href="atlas.html">Joyan</a><a href="atlas.html">Volver al atlas ↗</a></header>
<main><section class="intro"><p class="label">ESTUDIO 06 / EL FONDO CAMBIA TODO</p><h1>Luz que emite.<br>Tinta que absorbe.</h1><p>Misma escena, mismo texto, mismos siete tonos por familia. Cambia el suelo: negro o papel. No es un tema claro y oscuro del mismo diseño; son dos formas opuestas de construir la imagen.</p><p class="keys"><strong>Negro:</strong> la escena emite luz, los puntos se encienden sobre el vacío. <strong>Papel:</strong> la escena absorbe luz, los puntos son tinta y el vacío es el papel.</p></section>
<div class="grid">{''.join(cards)}</div>
<section class="notes"><p class="label">LO QUE ESTO IMPLICA</p><h2>El color no se invierte: se reconstruye.</h2><ol>
<li><strong>En papel el acento debe oscurecerse.</strong> Un turquesa claro funciona como luz sobre negro, pero desaparece como texto sobre papel. Por eso el acento cambia de valor, no solo de posición.</li>
<li><strong>La escena no es la misma imagen en negativo.</strong> Sobre papel la densidad de tinta construye la sombra; sobre negro la densidad de puntos construye la luz.</li>
<li><strong>Una página puede usar los dos suelos.</strong> Portada oscura y cuerpo en papel es legítimo, pero necesita una transición diseñada, no un corte.</li>
</ol><p class="disclaimer">Estudio estático aislado, sin animación. No verifica el motor, no cambia la landing ni el OG, y no aprueba ninguna paleta. Los siete tonos modelan la escena; no son siete colores de interfaz.</p></section>
</main><footer class="page-foot">JOYAN / ESTUDIO DE SUELO · Negro y papel, no “modo oscuro”.</footer></body></html>
''')
print(f'Generated {len(boards)} boards ({sum(b["exchange"] for b in boards)} paper recolours).')
