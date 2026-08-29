"""LogBook icon set — the hero check-in circle at 9:00, layered-calm palette.

Renders at 4x supersampling for clean antialiasing. Previews land beside this
script; nothing touches assets/ until the design is approved.
"""
from PIL import Image, ImageDraw

ZINC_950 = "#09090B"   # deeper than canvas for icon depth
ZINC_900 = "#18181B"   # dark canvas
ZINC_100 = "#F4F4F5"   # light canvas / hand color on dark
EMERALD_D = "#059669"  # light-mode accent
EMERALD_L = "#34D399"  # dark-mode accent (luminous on zinc)
SS = 4                 # supersample factor


def draw_mark(draw, cx, cy, r, ring, hand, dot, ring_w, hand_w):
    """The check-in circle with hands at 9:00 — hour left, minute up."""
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ring, width=ring_w)
    # Minute hand: straight up. Hour hand: pointing at 9 (left), shorter.
    for angle_deg, length in ((90, 0.74), (180, 0.52)):
        import math
        a = math.radians(angle_deg)
        x2, y2 = cx + length * r * math.cos(a), cy - length * r * math.sin(a)
        draw.line([cx, cy, x2, y2], fill=hand, width=hand_w)
        for ex, ey in ((cx, cy), (x2, y2)):  # rounded ends
            hr = hand_w / 2
            draw.ellipse([ex - hr, ey - hr, ex + hr, ey + hr], fill=hand)
    dr = hand_w * 0.9
    draw.ellipse([cx - dr, cy - dr, cx + dr, cy + dr], fill=dot)


def render(size, bg, ring, hand, dot, mark_ratio=0.66, ring_ratio=0.075):
    im = Image.new("RGBA", (size * SS, size * SS), bg)
    d = ImageDraw.Draw(im)
    r = size * SS * mark_ratio / 2
    draw_mark(d, size * SS / 2, size * SS / 2, r, ring, hand, dot,
              ring_w=int(size * SS * ring_ratio), hand_w=int(size * SS * 0.052))
    return im.resize((size, size), Image.LANCZOS)


def render_mark_only(size, ring, hand, dot, mark_ratio=0.50):
    """Transparent background, mark inside the Android adaptive safe zone."""
    return render(size, (0, 0, 0, 0), ring, hand, dot, mark_ratio=mark_ratio)


OUT = "/Users/rakib/Learning/LogBook/.scratch/icon-preview"

# App icon — dark zinc, luminous emerald ring
render(1024, ZINC_900, EMERALD_L, ZINC_100, EMERALD_L).save(f"{OUT}/icon.png")

# Android adaptive: fg mark on transparent (safe zone), solid zinc bg, white monochrome
render_mark_only(1024, EMERALD_L, ZINC_100, EMERALD_L, mark_ratio=0.52).save(f"{OUT}/android-icon-foreground.png")
Image.new("RGBA", (1024, 1024), ZINC_900).save(f"{OUT}/android-icon-background.png")
render_mark_only(432, "#FFFFFF", "#FFFFFF", "#FFFFFF", mark_ratio=0.55).save(f"{OUT}/android-icon-monochrome.png")

# Splash: light variant (zinc mark on #F4F4F5) and dark variant (emerald on #18181B)
render(1024, (0, 0, 0, 0), ZINC_900, ZINC_900, EMERALD_D, mark_ratio=0.30).save(f"{OUT}/splash-icon.png")
render(1024, (0, 0, 0, 0), EMERALD_L, ZINC_100, EMERALD_L, mark_ratio=0.30).save(f"{OUT}/splash-icon-dark.png")

# Favicon from the icon
render(48, ZINC_900, EMERALD_L, ZINC_100, EMERALD_L).save(f"{OUT}/favicon.png")

# ── Approval previews: iOS squircle mask on both canvases ──
for name, bg_hex in (("preview-light", ZINC_100), ("preview-dark", ZINC_950)):
    icon = Image.open(f"{OUT}/icon.png").convert("RGBA")
    canvas = Image.new("RGBA", (1400, 1000), bg_hex)
    mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, icon.width, icon.height], radius=int(1024 * 0.225), fill=255)
    off = ((1000 - 500) // 2, (1000 - 500) // 2)
    scaled = icon.resize((500, 500), Image.LANCZOS)
    m = mask.resize((500, 500), Image.LANCZOS)
    canvas.paste(scaled, ((1400 - 500) // 2, off[0]), m)
    canvas.convert("RGB").save(f"{OUT}/{name}.png")

print("rendered to", OUT)
