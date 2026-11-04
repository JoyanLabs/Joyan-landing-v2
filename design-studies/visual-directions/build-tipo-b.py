"""Apply the recommended typographic pairing to the hybrid slice as a variant.

Display: Instrument Serif 400. Reading: Archivo 400 at 17 px. Signature:
Michroma stays at 20 px, so the technical anchor survives the serif headline.
Generates slice-hibrido-tipo.html from slice-hibrido.html; the original is
left untouched.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'slice-hibrido.html').read_text()

OVERRIDES = '''
@font-face{font-family:"Instrument Serif";src:url('typo/fonts/instrument-serif-400-latin.woff2') format('woff2');font-display:swap;font-weight:400}
@font-face{font-family:"Archivo";src:url('typo/fonts/archivo-latin.woff2') format('woff2');font-display:swap;font-weight:100 900}
.tipo-b{--display:"Instrument Serif",Georgia,serif;--reading:Archivo,system-ui,sans-serif}
.tipo-b h1{font-family:var(--display);font-weight:400;font-size:clamp(52px,7.4vw,112px);line-height:1;letter-spacing:-.02em}
.tipo-b h2{font-family:var(--display);font-weight:400;letter-spacing:-.015em}
.tipo-b .lede{font-family:var(--reading);font-size:18px}
.tipo-b .two p,.tipo-b .list p,.tipo-b .notes-copy p,.tipo-b .hero-foot p,.tipo-b .foot p{font-family:var(--reading)}
.tipo-b .two p{font-size:17px;line-height:1.7;max-width:60ch}
.tipo-b .list p{font-size:14px}
.tipo-b .notes-copy p{font-size:15px}
.tipo-b .poster-title{font-family:var(--display);letter-spacing:-.01em}
@media(max-width:900px){
.tipo-b h1{font-size:clamp(46px,11.4vw,74px)}
.tipo-b .two p{font-size:16px}
}
'''

(ROOT / 'tipo-b.css').write_text('/* Typographic variant: Instrument Serif + Archivo. Study only. */\n' + OVERRIDES)

variant = source.replace(
    '<link rel="stylesheet" href="slice-colors.css">',
    '<link rel="stylesheet" href="slice-colors.css">\n<link rel="stylesheet" href="tipo-b.css">'
).replace('<body class="g-hibrido">', '<body class="g-hibrido tipo-b">')
variant = variant.replace('<title>Joyan — rodaja vertical · Híbrido</title>',
                          '<title>Joyan — rodaja vertical · Híbrido + tipografía B</title>')
variant = re.sub(r'(<a href="slice-hibrido\.html")', r'<a href="slice-hibrido-tipo.html"', variant, count=1)

(ROOT / 'slice-hibrido-tipo.html').write_text(variant)
print('Generated slice-hibrido-tipo.html (Instrument Serif + Archivo).')
