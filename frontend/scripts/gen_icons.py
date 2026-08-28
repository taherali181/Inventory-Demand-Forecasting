#!/usr/bin/env python3
"""
Generate the raster app icons from the Restock monogram.

Run once, commit the output. NOT a build step -- CI never needs Pillow.

    python3 scripts/gen_icons.py

Writes public/favicon.ico, logo192.png, logo512.png, logo-maskable-512.png.

Why draw with primitives instead of rasterizing public/favicon.svg: this box has
no SVG rasterizer (no ImageMagick, rsvg-convert, inkscape, cairosvg or sharp) --
only Pillow. The geometry below is kept deliberately in step with favicon.svg;
if you change one, change both.

Everything is drawn at 4x and downsampled with LANCZOS, because Pillow's draw
primitives are not themselves antialiased.
"""
import pathlib

from PIL import Image, ImageDraw

PUBLIC = pathlib.Path(__file__).resolve().parent.parent / "public"

ACCENT = (99, 102, 241, 255)   # #6366F1
FG = (255, 255, 255, 255)
SS = 4                          # supersample factor


def draw_mark(size, tile_ratio=1.0, radius_ratio=0.25):
    """Render the monogram at `size` px. tile_ratio<1 insets the tile (maskable)."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    tile = S * tile_ratio
    off = (S - tile) / 2
    d.rounded_rectangle(
        [off, off, off + tile - 1, off + tile - 1],
        radius=tile * radius_ratio,
        fill=ACCENT,
    )

    # The R is drawn as a STROKED centreline, not as overlapping filled rects.
    # Filled rects need the counter punched back out in the tile colour, which
    # breaks the moment the tile is recoloured and reads as a blob at small
    # sizes. A stroke keeps an even weight everywhere and stays legible at 16px.
    #
    # Coordinates are on the same 0..32 grid as public/favicon.svg.
    u = tile / 32.0

    def p(x, y):
        return (off + x * u, off + y * u)

    W_GRID = 3.0                    # stroke weight, in grid units
    w = W_GRID * u                  # ...and in pixels
    r = w / 2.0

    def stroke(a, b):
        d.line([p(*a), p(*b)], fill=FG, width=max(1, round(w)))

    def joint(pt):
        """Round cap/join. PIL lines are butt-ended, so corners need this."""
        cx, cy = p(*pt)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=FG)

    STEM_X, TOP_Y, BASE_Y = 11.0, 8.5, 23.5
    BOWL_CX, BOWL_BOT = 15.5, 16.0
    BOWL_R = (BOWL_BOT - TOP_Y) / 2.0        # 3.75

    stroke((STEM_X, TOP_Y), (STEM_X, BASE_Y))          # stem
    stroke((STEM_X, TOP_Y), (BOWL_CX, TOP_Y))          # bowl top
    stroke((BOWL_CX, BOWL_BOT), (STEM_X, BOWL_BOT))    # bowl bottom
    stroke((14.0, BOWL_BOT), (19.5, BASE_Y))           # leg

    # Bowl's right half-round. PIL: 0deg is 3 o'clock, angles increase clockwise,
    # so 270 -> 90 sweeps the right side.
    #
    # PIL's `width` grows INWARD from the bounding box, so the bbox has to be
    # the OUTER edge (BOWL_R + W/2), not the centreline. Passing BOWL_R here
    # draws the stroke from radius 3.75 all the way in to 0.75 and swallows the
    # counter.
    cy = TOP_Y + BOWL_R
    outer = BOWL_R + W_GRID / 2.0
    d.arc(
        [*p(BOWL_CX - outer, cy - outer), *p(BOWL_CX + outer, cy + outer)],
        start=270, end=90, fill=FG, width=max(1, round(w)),
    )

    for pt in ((STEM_X, TOP_Y), (BOWL_CX, TOP_Y), (BOWL_CX, BOWL_BOT),
               (STEM_X, BOWL_BOT), (STEM_X, BASE_Y), (14.0, BOWL_BOT),
               (19.5, BASE_Y)):
        joint(pt)

    return img.resize((size, size), Image.LANCZOS)


def main():
    PUBLIC.mkdir(exist_ok=True)

    for name, size in (("logo192.png", 192), ("logo512.png", 512)):
        draw_mark(size).save(PUBLIC / name)
        print(f"wrote {name}")

    # Android maskable: tile at 60% so the mark clears the 20% safe zone, on a
    # full-bleed accent field.
    m = Image.new("RGBA", (512, 512), ACCENT)
    m.alpha_composite(draw_mark(512, tile_ratio=0.60, radius_ratio=0.22))
    m.save(PUBLIC / "logo-maskable-512.png")
    print("wrote logo-maskable-512.png")

    # Pillow writes a genuine multi-resolution ICO from one image.
    draw_mark(256).save(
        PUBLIC / "favicon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)],
    )
    print("wrote favicon.ico")


if __name__ == "__main__":
    main()
