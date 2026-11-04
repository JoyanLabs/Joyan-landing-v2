"""Transition study: the dark ground does not end in a line; the dots dissolve.

Rows of dots shrink and change from emission (light on ink) to absorption
(ink on paper) across a band, so the two grounds are joined by the material
itself instead of by a horizontal edge. Static SVG + CSS only: this is the
art direction for the live engine, which will do the same per frame.
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent

DARK = dict(bg='#10191C', ink='#E4EEEA', accent='#94CCBB',
            ramp=['#183039', '#244C5B', '#346E7B', '#4D9199', '#73B7B0', '#A8D3BA', '#D5E5CF'])
PAPER = dict(bg='#F2EFE7', ink='#15191A', accent='#1C6B61',
             ramp=['#1B2B2C', '#2A4342', '#3B5B59', '#547674', '#7C9895', '#ADC0BB', '#D8DFDA'])

W, H = 1200, 520          # the dissolve band
COLS, ROWS = 74, 34


def band():
    """One dot per cell: radius and colour interpolate from emission to ink."""
    dots = []
    for j in range(ROWS):
        v = j / (ROWS - 1)
        # ease so the change is slow at both ends and quick in the middle band
        t = min(1.0, max(0.0, (v - 0.18) / 0.64))
        t = t * t * (3 - 2 * t)
        for i in range(COLS):
            u = i / (COLS - 1)
            edge = .5 + .12 * math.sin(u * math.pi * 1.6)
            ridge = math.exp(-abs(v - edge) * 6)
            # the field thins as it dissolves: dots keep their place, lose body
            body = (1 - t) ** 1.6
            radius = (1.6 + ridge * 1.5 + .5 * math.sin(u * 7.3)) * (0.35 + body)
            if radius < 0.45:
                continue
            level = min(6, max(0, round((.25 + ridge * .5 + .3 * math.sin(u * 5.1 + v * 2.2)) * 6)))
            dark = DARK['ramp'][level]
            paper = PAPER['ramp'][6 - level]   # absorption runs the other way
            x = 26 + (W - 52) * u
            y = 14 + (H - 28) * v
            dots.append((x, y, radius, dark, paper, t))
    return dots


def svg(dots):
    """Two dot layers cross-faded per row: emission on top, ink underneath."""
    emit, ink = [], []
    for x, y, r, dark, paper, t in dots:
        emit.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{dark}" opacity="{(1 - t):.3f}"/>')
        if t > 0.02:
            ink.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="{paper}" opacity="{t:.3f}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
            f'role="img" aria-label="La retícula de puntos se disuelve: arriba emite luz sobre tinta, abajo se vuelve tinta sobre papel.">'
            f'{"".join(emit)}{"".join(ink)}</svg>\n')


(ROOT / 'transition-band.svg').write_text(svg(band()))

# Footer strip: dots on a slow breathing cycle. CSS drives it; the markup is inert.
pulse = ''.join(
    f'<i style="--d:{i * 0.09:.2f}s; --h:{(0.55 + 0.45 * math.sin(i * 0.7)):.2f}"></i>' for i in range(38)
)

(ROOT / 'transition.html').write_text(f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Joyan ─ el suelo no cambia con una línea</title><link rel="stylesheet" href="transition.css"></head>
<body>
<section class="hero">
  <p class="label">ESTUDIO 09 · LA COSTURA</p>
  <h1>Alguien tiene que<br>mirar a las máquinas.</h1>
  <p class="lede">La portada emite luz. El cuerpo absorbe tinta. Entre los dos no hay una línea: hay puntos que se disuelven.</p>
</section>

<div class="seam" aria-hidden="false">
  <div class="seam-dark"></div>
  <img src="transition-band.svg" width="1200" height="520" alt="La retícula de puntos se disuelve: arriba emite luz sobre tinta, abajo se vuelve tinta sobre papel.">
  <div class="seam-paper"></div>
</div>

<section class="body">
  <p class="label">01 / UNA FORMA DE HACER</p>
  <h2>Construir juntos.<br><span>Sin delegar el juicio.</span></h2>
  <p>La costura no es decoración: es la prueba de que los dos suelos pertenecen al mismo material. Si la página necesitara un borde recto para separarlos, serían dos páginas pegadas.</p>
</section>

<footer class="foot">
  <div class="pulse" aria-hidden="true">{pulse}</div>
  <div class="foot-row"><span class="firma">Joyan</span><p>© Joyan — no fate.</p><p class="label">H1 MAREA MINERAL</p></div>
</footer>
</body></html>
''')

(ROOT / 'transition.css').write_text('''@font-face{font-family:Michroma;src:url('fonts/michroma-400.woff2') format('woff2');font-display:swap}
@font-face{font-family:Archivo;src:url('typo/fonts/archivo-latin.woff2') format('woff2');font-display:swap;font-weight:100 900}
*{box-sizing:border-box}
body{margin:0;background:#F2EFE7;color:#15191A;font-family:Archivo,system-ui,sans-serif;font-size:17px;line-height:1.7}
p,h1,h2{margin:0}
.label{font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.12em;color:#1C6B61}
.hero{background:#10191C;color:#E4EEEA;padding:64px 6vw 0}
.hero .label{color:#94CCBB}
h1{font-family:Michroma,sans-serif;font-weight:400;font-size:clamp(32px,5.4vw,76px);line-height:1.06;letter-spacing:-.03em;margin:22px 0}
.lede{color:#ACC3C1;max-width:56ch;padding-bottom:56px}

/* la costura: el oscuro entrega sus puntos al papel, sin borde */
.seam{position:relative;background:#F2EFE7}
.seam-dark{position:absolute;inset:0 0 auto 0;height:34%;background:#10191C}
.seam img{position:relative;display:block;width:100%;height:auto;margin-top:-1px}
.seam-paper{height:60px;background:#F2EFE7}

.body{padding:0 6vw 72px}
h2{font-family:Archivo,sans-serif;font-weight:500;font-size:clamp(26px,3vw,42px);line-height:1.12;letter-spacing:-.03em;margin:18px 0 20px}
h2 span{color:#4B5658}
.body p{max-width:60ch;color:#4B5658}

/* pie con respiración de puntos */
.foot{background:#10191C;color:#E4EEEA;padding:0 6vw 34px}
.pulse{display:flex;justify-content:space-between;align-items:flex-end;height:86px;padding-bottom:26px;border-bottom:1px solid #182A30}
.pulse i{display:block;width:3px;height:calc(var(--h) * 26px);border-radius:50%;background:#94CCBB;opacity:.55;animation:breathe 4.2s ease-in-out infinite;animation-delay:var(--d)}
@keyframes breathe{0%,100%{transform:scaleY(.35);opacity:.28}50%{transform:scaleY(1);opacity:.75}}
.foot-row{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-top:22px}
.firma{font-family:Michroma,sans-serif;font-size:20px}
.foot p{font-size:12px;color:#ACC3C1}
.foot .label{color:#94CCBB}
@media(prefers-reduced-motion:reduce){.pulse i{animation:none;transform:scaleY(.6);opacity:.5}}
@media(max-width:760px){.seam img{margin-top:0}.hero{padding-top:40px}h1{font-size:clamp(28px,8.4vw,44px)}.foot-row{flex-direction:column;align-items:flex-start;gap:8px}}
''')
print('Transition study written: transition.html + transition-band.svg')
