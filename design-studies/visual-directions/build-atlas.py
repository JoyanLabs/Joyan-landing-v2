"""Generate an isolated color atlas from the existing, unchanged H1/H3 studies."""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent
originals = json.loads((ROOT / 'harmonies.json').read_text())
h1, _, h3 = originals

def variant(code, name, base, ramp, note, kind='analogous', secondary=None):
    return dict(base, id=code, name=name, ramp=ramp, note=note, kind=kind,
                secondary=secondary, accent=base['accent'] if secondary else ramp[-2])

items = [
    dict(h1, id='h1', kind='reference', secondary=None, note='Referencia elegida: petróleo, turquesa y celadón. Colores originales sin cambios.'),
    dict(h3, id='h3', kind='reference', secondary=None, note='Referencia elegida: pizarra, índigo gris y malva. Colores originales sin cambios.'),
    variant('a1', 'Marea glacial', h1, ['#162F3D','#244A63','#376C8B','#5795AD','#7CB9C5','#AAD8D6','#DAEEE7'], 'Hija de H1. Más azul y hielo, menos verde. Precisa sin perder profundidad.'),
    variant('a2', 'Jade sumergido', h1, ['#18352F','#285347','#3C7563','#61947C','#8FBA9B','#BCD7B5','#E1ECD4'], 'Hija de H1. Verde mineral que se ilumina hacia el liquen; no neón.'),
    variant('a3', 'Ópalo lunar', h3, ['#282D42','#454D6C','#657497','#8C9CBC','#B6C0D6','#D4D8E7','#EDECF2'], 'Hija de H3. Más plata azulada, menos malva: un espectro frío más silencioso.'),
    variant('a4', 'Ópalo rosa', h3, ['#30283D','#50415E','#75607E','#9A829F','#BFA8BB','#DDC6D2','#F0E2E6'], 'Hija de H3. Del índigo rojizo al rosa ceniza. Más íntima, sin fucsia.'),
    variant('b1', 'Marea y cobre', h1, h1['ramp'], 'La base H1 conserva su gama; una franja cobre aparece solo junto a la apertura. Más contraste, no dos mitades de distinto color.', 'temperature', ['#865941','#C18D68','#E8C29B']),
    variant('b2', 'Ópalo y miel', h3, h3['ramp'], 'La base H3 recibe un borde de miel. Frío y cálido se distinguen sin competir por toda la superficie.', 'temperature', ['#8B703F','#C2A368','#E7D0A3']),
    variant('c1', 'Marea prismática', h1, h1['ramp'], 'H1 sigue dominando. Dos matices vecinos de la zona cálida —arcilla y arena— alternan en un borde pequeño. Mayor riqueza, mayor exigencia de dosificación.', 'split', ['#D0A19A','#D7BE8C']),
    variant('c2', 'Ópalo botánico', h3, h3['ramp'], 'H3 sigue dominando. Salvia y liquen aparecen solo en la apertura. Es la más arriesgada: podría acercarse al verde/morado genérico si se expande.', 'split', ['#A6C4B3','#C9CD9C']),
]
groups = [
    ('referencias', '00 / Las referencias', 'H1 y H3 se conservan exactamente. Son el punto de comparación, no opciones nuevas.', items[:2]),
    ('vecinos', '01 / Colores vecinos', 'Cuatro variantes de continuidad cromática. Cambian los matices de la escena; el fondo y el texto conservan la base H1 o H3 para aislar esa decisión.', items[2:6]),
    ('temperatura', '02 / Frío con una luz cálida', 'Gama dominante más contrapunto localizado. Es contraste de temperatura; no afirmamos que sean complementarios exactos en una rueda de color.', items[6:8]),
    ('bifurcada', '03 / Dominante con dos contrapuntos', 'Inspiración en armonías complementarias divididas, interpretada con colores desaturados. Dos matices secundarios en la apertura, no tres acentos iguales por toda la interfaz.', items[8:]),
]
source = (ROOT / 'h1-harmony.svg').read_text()
css_colors = []
cards = {}
for p in items:
    code = p['id']
    if p['kind'] == 'reference':
        image = f'{code}-harmony.svg'
        count = 0
    else:
        count = 0
        def recolor(match):
            circle = match.group(0)
            old = re.search(r'fill="(#[A-Fa-f0-9]+)"', circle)[1]
            index = h1['ramp'].index(old)
            fill = p['ramp'][index]
            # The source's brightest populated band is not the last ramp entry.
            # Larger discs mark the lit fold; keep the secondary color localized.
            radius = float(re.search(r'r="([\d.]+)"', circle)[1])
            if p['secondary'] and radius >= 1.8:
                y = float(re.search(r'cy="([\d.]+)"', circle)[1])
                colors = p['secondary']
                fill = colors[min(len(colors)-1, int(y / 620 * len(colors)))]
            return circle.replace(old, fill)
        svg = re.sub(r'<circle\b[^>]+/>', recolor, source)
        svg = re.sub(r'<title>.*?</title>', f'<title>{escape(p["name"])}</title>', svg)
        svg = svg.replace(f'stroke="{h1["ramp"][2]}"', f'stroke="{p["ramp"][2]}"')
        image = f'atlas-{code}.svg'
        (ROOT / image).write_text(svg)
        count = sum(c not in p['ramp'] for c in re.findall(r'<circle[^>]+fill="([^"]+)"', svg))
    p['secondaryDotCount'] = count
    css_colors.append(f'.atlas-{code}' + '{' + ';'.join(f'--{k}:{p[k]}' for k in ['bg','panel','ink','muted','accent']) + '}')
    all_colors = p['ramp'] + (p['secondary'] or [])
    for i, color in enumerate(all_colors):
        css_colors.append(f'.atlas-{code} .s{i}' + '{background:' + color + '}')
    chips = ''.join(f'<span class="s{i}" title="{color}"></span>' for i, color in enumerate(p['ramp']))
    secondary = ''
    if p['secondary']:
        secondary = '<div class="secondary"><span>Contrapunto localizado</span><div>' + ''.join(f'<i class="s{i+7}" title="{color}"></i>' for i, color in enumerate(p['secondary'])) + '</div></div>'
    cards[code] = f'''<article class="option atlas-{code}" id="{code}" aria-labelledby="title-{code}">
<header class="option-head"><h3 id="title-{code}">{code.upper()} / {p['name']}</h3><a href="#{code}" aria-label="Enlace a {p['name']}">↗</a></header>
<div class="preview"><header><span class="wordmark">Joyan</span><span class="label">NO FATE.</span></header><div class="composition"><div class="copy"><p class="label">CRITERIO HUMANO</p><p class="headline">Alguien tiene<br>que mirar a<br>las máquinas<span>.</span></p><p class="support">Construir juntos.<br>Sin renunciar al criterio.</p></div><img src="{image}" width="680" height="620" alt="Pliegue de puntos en la gama {p['name']}."></div><footer class="label">OBSERVAR · CONSTRUIR · RESPONDER</footer></div>
<div class="ramp" aria-label="Gama dominante de {p['name']}">{chips}</div>{secondary}<p class="note">{p['note']}</p><details><summary>Ver valores y uso</summary><p>Fondo {p['bg']} · texto {p['ink']} · énfasis {p['accent']}.</p><p>Gama: {' · '.join(p['ramp'])}.</p><p>Secundarios: {' · '.join(p['secondary'] or []) or 'ninguno'}. Tonos oscuros reservados para ilustración; no aprobados como texto.</p></details></article>'''

(ROOT / 'atlas.json').write_text(json.dumps(items, indent=2, ensure_ascii=False) + '\n')
(ROOT / 'atlas-colors.css').write_text('\n'.join(css_colors) + '\n')
sections = ''.join(f'<section class="family" id="{gid}" aria-labelledby="title-{gid}"><header class="family-head"><h2 id="title-{gid}">{title}</h2><p>{desc}</p></header><div class="options">' + ''.join(cards[p['id']] for p in members) + '</div></section>' for gid, title, desc, members in groups)
(ROOT / 'atlas.html').write_text(f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Joyan / atlas de armonías para el equipo</title><link rel="stylesheet" href="atlas.css"><link rel="stylesheet" href="atlas-colors.css"></head>
<body><header class="page-head"><a class="wordmark" href="harmonies.html">Joyan</a><a href="harmonies.html">Volver a las armonías originales ↗</a></header><main>
<section class="intro"><p class="label">ESTUDIO 05 / PARA REVISAR EN EQUIPO</p><h1>Una identidad.<br>Distintas relaciones de color.</h1><p>H1 y H3 como referencias, ocho alternativas y cuatro grupos. No son todas las paletas posibles: es una selección para comparar continuidad, contraste y cantidad de color sin cambiar la escena.</p><nav aria-label="Familias">{''.join(f'<a href="#{gid}">{title}</a>' for gid,title,_,_ in groups)}</nav></section>
{sections}
<section class="decision"><p class="label">CÓMO REVISARLO</p><h2>Primero la familia. Después el matiz.</h2><ol><li>Cada persona elige dos códigos, sin leer primero las elecciones del resto.</li><li>Anoten qué les representa, qué les parece genérico y qué les cansa.</li><li>Comparen los resultados. Una opción debe funcionar quieta, en móvil y fuera del hero.</li><li>Prueben las dos finalistas en la página completa antes de aprobar la identidad.</li></ol><p><strong>Mi recomendación:</strong> empezar por H1, H3, A1 y A3. B1/B2 permiten comprobar si una luz cálida mejora el carácter; C1/C2 son pruebas de contraste, no una recomendación de sumar más color.</p><p>Monocromáticas y neutras ya están en el <a href="tonal.html">estudio tonal</a>. Tríadas y tétradas con acentos de igual peso quedan fuera por ahora: volverían a la dispersión que rechazaste. No son incorrectas; son menos adecuadas para este brief.</p><p class="disclaimer">Propuestas, no paletas aprobadas. Las categorías son criterios de dirección artística, no certificaciones geométricas de color. Sin animación ni cambios a la landing o al OG. Los siete tonos modelan la escena; no son siete acentos de interfaz.</p></section>
</main><footer class="page-foot">JOYAN / ATLAS DE COLOR · Compartí códigos y motivos, no solo “me gusta”.</footer></body></html>\n''')
print(f'Generated atlas: {len(items)} options, {len(groups)} groups; H1/H3 referenced unchanged.')
