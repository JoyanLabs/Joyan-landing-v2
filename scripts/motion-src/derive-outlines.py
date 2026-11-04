#!/usr/bin/env python3
"""One-time derivation of the OG card's text OUTLINES (WU30).

Why this exists
---------------
The OG generator (`scripts/generate-dither.mjs`) must stay browser-free AND
portable: it must not depend on a font being installed for fontconfig/librsvg to
resolve, the way `scripts/dither-src/wordmark.svg` did with its `<text>` element.
So the two text runs on the card are converted ONCE, here, into plain SVG paths
and committed under `public/assets/brand/`. The generator then only ever
rasterises committed outlines.

Inputs are the fonts the repository ALREADY ships/uses (no new font, nothing
downloaded):
  * the wordmark  -> public/fonts/michroma-400.woff2  (Michroma, OFL 1.1)
  * the tagline   -> node_modules/@fontsource-variable/jetbrains-mono/files/
                     jetbrains-mono-latin-wght-normal.woff2 (JetBrains Mono
                     Variable, OFL 1.1; the mono role the site already uses)

This script is NOT part of `pnpm check` and is not a project dependency: it
needs python3 + fontTools and is re-run only if the outlines themselves change.
Command:

    python3 scripts/motion-src/derive-outlines.py

It writes the two SVGs and prints the geometry (bbox + advance) each one carries.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "assets" / "brand"

# The card's two text runs. The wordmark is the name exactly as the page sets
# it; the tagline is the shipped ES watcher line (the OG is one shared asset and
# config.yaml documents ES as the default locale).
WORDMARK = "Joyan"
TAGLINE = "Alguien tiene que mirar a las máquinas."
PROMPT = ">"  # the terminal prompt, the card's ONE amber attention mark


def glyph_paths(font: TTFont, text: str, tracking: float = 0.0):
    """Return (paths, bbox) for `text`, as SVG path data in a y-down space."""
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    hmtx = font["hmtx"]
    paths: list[str] = []
    pen = BoundsPen(glyphset)
    bounds = TransformPen(pen, (1, 0, 0, -1, 0, 0))
    x = 0.0
    for char in text:
        name = cmap[ord(char)]
        transform = (1, 0, 0, -1, x, 0)
        glyph_pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.1f}")
        glyphset[name].draw(TransformPen(glyph_pen, transform))
        d = glyph_pen.getCommands()
        if d:
            paths.append(d)
            glyphset[name].draw(TransformPen(bounds, (1, 0, 0, 1, x, 0)))
        x += hmtx[name][0] + tracking
    if pen.bounds is None:
        raise SystemExit(f"no outline bounds for {text!r}")
    return paths, pen.bounds


def write_svg(dest: Path, paths: list[str], bounds, label: str) -> None:
    min_x, min_y, max_x, max_y = bounds
    width = max_x - min_x
    height = max_y - min_y
    body = "\n  ".join(f'<path d="{d}"/>' for d in paths)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{min_x:.1f} {min_y:.1f} {width:.1f} {height:.1f}" '
        f'width="{width:.1f}" height="{height:.1f}" role="img" aria-label="{label}">\n'
        f'  <!-- {label} — derived outlines, see scripts/motion-src/derive-outlines.py -->\n'
        f'  <g fill="#ffffff">\n  {body}\n  </g>\n</svg>\n'
    )
    dest.write_text(svg, encoding="utf-8")
    print(f"{dest.relative_to(ROOT)}: {len(paths)} path(s), {width:.0f}x{height:.0f} font units, "
          f"{dest.stat().st_size} B")


def main() -> int:
    michroma = TTFont(ROOT / "public" / "fonts" / "michroma-400.woff2")
    jetbrains = TTFont(ROOT / "node_modules" / "@fontsource-variable" / "jetbrains-mono" /
                       "files" / "jetbrains-mono-latin-wght-normal.woff2")
    for font, name in ((michroma, "Michroma"), (jetbrains, "JetBrains Mono")):
        print(f"{name}: {font['name'].getDebugName(1)} {font['name'].getDebugName(5)}, "
              f"upm {font['head'].unitsPerEm}")

    word_paths, word_bounds = glyph_paths(michroma, WORDMARK)
    write_svg(OUT_DIR / "joyan-wordmark-michroma-outlines.svg", word_paths, word_bounds, WORDMARK)

    tag_paths, tag_bounds = glyph_paths(jetbrains, TAGLINE)
    write_svg(OUT_DIR / "og-tagline-mono-outlines.svg", tag_paths, tag_bounds, TAGLINE)

    prompt_paths, prompt_bounds = glyph_paths(jetbrains, PROMPT)
    write_svg(OUT_DIR / "og-prompt-mono-outlines.svg", prompt_paths, prompt_bounds, PROMPT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
