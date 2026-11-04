"""Michroma as the headline face, tuned. Reading stays in Archivo.

Michroma is wide: at 92 px the widest headline line takes 737 px of a 900 px
column (81.9%). Lowering the ceiling to 80 px and tightening the tracking
brings it to roughly 70%, which is the point where the block stops eating the
sentence. Everything else is unchanged from the hybrid slice.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'slice-hibrido.html').read_text()

OVERRIDES = '''
@font-face{font-family:"Michroma";src:url('typo/fonts/michroma-400.woff2') format('woff2');font-display:swap;font-weight:400}
@font-face{font-family:"Archivo";src:url('typo/fonts/archivo-latin.woff2') format('woff2');font-display:swap;font-weight:100 900}
.tipo-m{--reading:Archivo,system-ui,sans-serif}
.tipo-m h1{font-family:"Michroma",sans-serif;font-weight:400;font-size:clamp(38px,5.6vw,80px);line-height:1.06;letter-spacing:-.03em}
.tipo-m h2{font-family:"Michroma",sans-serif;font-weight:400;font-size:clamp(24px,2.6vw,38px);line-height:1.2;letter-spacing:-.02em}
.tipo-m .poster-title{font-family:"Michroma",sans-serif;font-size:clamp(24px,2.6vw,38px);line-height:1.25;letter-spacing:-.02em}
.tipo-m .lede{font-family:var(--reading);font-size:18px}
.tipo-m .two p,.tipo-m .list p,.tipo-m .notes-copy p,.tipo-m .hero-foot p,.tipo-m .foot p{font-family:var(--reading)}
.tipo-m .two p{font-size:17px;line-height:1.7;max-width:60ch}
.tipo-m .list p{font-size:14px}
.tipo-m .notes-copy p{font-size:15px}
@media(max-width:900px){
.tipo-m h1{font-size:clamp(28px,8.2vw,46px)}
.tipo-m h2{font-size:clamp(20px,5.4vw,30px)}
.tipo-m .two p{font-size:16px}
}
'''

(ROOT / 'tipo-michroma.css').write_text(
    '/* Michroma as display, tuned ceiling. Reading in Archivo. Study only. */\n' + OVERRIDES)

variant = source.replace(
    '<link rel="stylesheet" href="slice-colors.css">',
    '<link rel="stylesheet" href="slice-colors.css">\n<link rel="stylesheet" href="tipo-michroma.css">'
).replace('<body class="g-hibrido">', '<body class="g-hibrido tipo-m">')
variant = variant.replace('<title>Joyan — rodaja vertical · Híbrido</title>',
                          '<title>Joyan — rodaja vertical · Híbrido + Michroma</title>')
variant = re.sub(r'(<a href="slice-hibrido\.html")', r'<a href="slice-hibrido-michroma.html"', variant, count=1)

(ROOT / 'slice-hibrido-michroma.html').write_text(variant)
print('Generated slice-hibrido-michroma.html (Michroma display, Archivo reading).')
