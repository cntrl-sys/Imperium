#!/usr/bin/env python3
"""Generate deterministic, crisp pixel-art unit sheets used by Imperivm."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "units" / "shared"
W, H = 1024, 1536
DIRS = 5
ANIMS = {"idle": 4, "walk": 6, "attack": 5, "damage": 3}
TINT = {"shadow": "#280028", "base": "#ff00ff", "light": "#ff6eff"}

UNITS = {
    "soldier": ("human", "steel", "sword"),
    "archer": ("human", "leather", "bow"),
    "worker": ("human", "ochre", "pick"),
    "minotaur": ("beast", "bronze", "axe"),
    "hunter": ("human", "forest", "spear"),
    "dragon-war": ("dragon", "jade", "claw"),
    "dragon-express": ("dragon", "jade", "wing"),
    "dragon-trade": ("dragon", "jade", "satchel"),
    "warship": ("ship", "navy", "spear"),
    "merchant_ship": ("ship", "navy", "cargo"),
}

def rect(x, y, w, h, color, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" {extra}/>'

def art(kind, material, tool, frame, anim, direction):
    # All forms are composed on a 32x48 pixel grid; the browser scales with
    # nearest-neighbour rendering, preserving crisp edges at game size.
    shift = ((-1 if frame % 2 else 1) * 2) if anim == "walk" else 0
    bounce = (frame % 2) if anim == "idle" else 0
    hit = (2 if anim == "attack" and frame >= 2 else 0) + (2 if anim == "damage" else 0)
    metal = {"steel":"#9caabd", "leather":"#876448", "ochre":"#b8873d", "bronze":"#c68c49", "forest":"#647450", "jade":"#53ad88", "navy":"#445b79"}[material]
    dark, edge, skin = "#242b35", "#121820", "#d5a77e"
    p = []
    if kind == "ship":
        # Compact three-quarter hull, sail and pennant.
        p += [rect(-16, 8, 32, 4, "#713e2d"), rect(-13, 12, 26, 3, "#4b3029"),
              rect(-8, -14, 2, 22, "#503e2f"), rect(-6, -12, 12, 16, "#e8dfc5"),
              rect(-4, -10, 8, 12, "#cfc6ad"), rect(-8, -15, 7, 2, "#b8473e")]
        p += [rect(-13, 9, 5, 2, "#a36a42"), rect(7, 9, 5, 2, "#a36a42")]
        if tool == "cargo":
            p += [rect(-5, 4, 7, 5, "#9e6c3e"), rect(3, 5, 6, 4, "#b88a51"), rect(-4, 5, 5, 1, "#d7b56d")]
        else:
            p += [rect(8, 2, 2, 7, "#594936"), rect(10, 2, 2, 7, "#594936")]
        return ''.join(p)
    if kind == "dragon":
        flap = 0 if anim == "idle" else (frame % 3 - 1) * 2
        p += [rect(-12, -7-flap, 10, 3, "#32735d"), rect(-17, -11-flap, 7, 4, "#32735d"),
              rect(2, -7+flap, 10, 3, "#32735d"), rect(10, -11+flap, 7, 4, "#32735d"),
              rect(-9, -5, 18, 10, "#42a77f"), rect(-5, -2, 10, 5, "#e0bd72"),
              rect(6, -8, 8, 4, "#42a77f"), rect(12, -10, 5, 4, "#42a77f"),
              rect(15, -8, 2, 2, "#f0d76a"), rect(-8, 4, 3, 6, "#28735e"), rect(4, 4, 3, 6, "#28735e"),
              rect(-13, -4, 5, 2, "#28735e")]
        if tool == "satchel": p += [rect(3, -1, 5, 6, "#a67443"), rect(4, 0, 3, 1, "#e0bd72")]
        if tool == "claw": p += [rect(10, -2-hit, 6, 2, "#e4d5be")]
        return ''.join(p)
    # Bipeds use the same silhouette language across factions; cloth markers
    # are deliberately exact RGB colors for reliable runtime nation tinting.
    cloak = TINT["base"]
    if direction in (0,): # back view: broad cloak and rear of helmet
        p += [rect(-9, -5-bounce, 18, 19, cloak), rect(-11, -2, 22, 13, TINT["shadow"]),
              rect(-8, -4, 16, 3, TINT["light"])]
    else:
        p += [rect(-8, -5-bounce, 16, 17, cloak), rect(-8, -5, 4, 15, TINT["shadow"]),
              rect(4, -5, 4, 15, TINT["light"])]
    p += [rect(-7, 12+shift, 5, 9, dark), rect(2, 12-shift, 5, 9, dark),
          rect(-8, 20+shift, 7, 3, edge), rect(1, 20-shift, 8, 3, edge),
          rect(-6, 13+shift, 2, 5, "#414c57"), rect(3, 13-shift, 2, 5, "#414c57"),
          rect(-9, 21+shift, 8, 2, "#8e7553"), rect(0, 21-shift, 9, 2, "#8e7553")]
    p += [rect(-7, -15-bounce, 14, 11, skin), rect(-7, -11-bounce, 14, 2, "#b87f63"),
          rect(-9, -19-bounce, 18, 7, metal), rect(-8, -18-bounce, 15, 2, "#d1d5c7"),
          rect(-7, -21-bounce, 14, 3, edge), rect(-4, -17-bounce, 2, 2, "#f5e8c5"),
          rect(3, -17-bounce, 2, 2, "#f5e8c5"), rect(-9, -13-bounce, 2, 3, "#9f7159"),
          rect(7, -13-bounce, 2, 3, "#9f7159")]
    if direction == 2:
        p += [rect(7, -14-bounce, 3, 2, "#e0b28d"), rect(4, -17-bounce, 2, 2, "#514638")]
    elif direction in (1, 3):
        p += [rect(4, -17-bounce, 2, 2, "#514638")]
    if direction == 0:
        p += [rect(-6, -14, 12, 10, metal)]
    # Shoulder plates and belt anchor the silhouette.
    p += [rect(-11, -4, 5, 5, metal), rect(6, -4, 5, 5, metal), rect(-7, 8, 14, 2, "#d4b765"),
          rect(-10, -3, 3, 2, "#d5d7ce"), rect(7, -3, 3, 2, "#d5d7ce"),
          rect(-5, -2, 2, 8, "#f4d98d"), rect(3, 1, 2, 5, "#73533b"),
          rect(-2, -4, 4, 2, "#d4d2bd"), rect(-2, 5, 4, 2, "#232b31"),
          rect(-6, -3, 2, 9, TINT["light"]), rect(5, -2, 1, 8, TINT["shadow"]),
          rect(-4, 0, 2, 1, "#eee3c7"), rect(2, 2, 2, 1, "#eee3c7"),
          rect(-1, -2, 2, 2, "#d6bd79"), rect(-1, 4, 2, 2, "#d6bd79")]
    if tool == "sword":
        p += [rect(-14, 0, 7, 8, "#42586a"), rect(-13, 1, 5, 6, "#8097a1"),
              rect(-12, 2, 3, 4, "#394b5a"), rect(-15, 3, 2, 2, "#cfb978")]
    elif tool == "pick":
        p += [rect(-13, -6, 5, 9, "#8e6540"), rect(-12, -7, 3, 2, "#b38a5c"),
              rect(-5, -1, 10, 10, "#a57d4b"), rect(-4, 0, 8, 2, "#d1ac70"),
              rect(-2, 1, 2, 7, "#705137")]
    elif tool == "spear":
        p += [rect(-12, -6, 4, 4, "#526346"), rect(8, -3, 4, 3, "#738358"),
              rect(-4, -6, 2, 2, "#bbc2a2"), rect(2, 7, 2, 2, "#bbc2a2")]
    if kind == "beast":
        p += [rect(-14, -16, 5, 5, "#d9c9a8"), rect(9, -16, 5, 5, "#d9c9a8"),
              rect(-12, -10, 24, 14, "#a76d3e"), rect(-3, -4, 6, 3, "#d7ad70")]
    arm_y = -1 - hit + (shift if anim == "walk" else 0)
    if tool == "bow":
        p += [rect(10, -8, 2, 18, "#ad7642"), rect(12, -7, 1, 16, "#e7d9b8"),
              rect(-14, arm_y, 5, 3, skin), rect(-11, arm_y-2, 2, 9, "#ad7642"), rect(-13, arm_y+1, 4, 2, "#e7d9b8"),
              rect(9, -9, 4, 2, "#d3a958"), rect(13, -7, 1, 5, "#f3ead4"),
              rect(4, 1, 3, 4, "#9f754e"), rect(5, 2, 1, 2, "#d7b17c")]
    elif tool == "pick":
        p += [rect(10, -13-hit, 2, 24, "#805736"), rect(6, -15-hit, 12, 3, "#b7c1c3"),
              rect(7, -16-hit, 2, 2, "#d5dedc"), rect(-13, 1, 5, 3, skin)]
    elif tool == "spear":
        p += [rect(11, -22-hit, 2, 34, "#9b6c43"), rect(9, -24-hit, 6, 4, "#d5dedc"),
              rect(9, -20-hit, 6, 1, "#8a969b")]
    elif tool == "axe":
        p += [rect(11, -16-hit, 2, 27, "#805736"), rect(7, -17-hit, 9, 6, "#c4c9c5"),
              rect(7, -17-hit, 3, 6, "#e2e2d5")]
    else:
        p += [rect(11, -10-hit, 2, 21, "#78563d"), rect(9, -15-hit, 6, 8, "#bdc6c8"),
              rect(10, -16-hit, 4, 2, "#e7e2cc")]
    if tool == "sword": p += [rect(-14, -8, 4, 13, "#a97a48"), rect(-13, -11, 2, 4, "#d9ddda"),
                              rect(-15, -10, 4, 2, "#d9b968"), rect(-12, -10, 1, 12, "#f2f0e3"),
                              rect(-11, -8, 1, 8, "#b9c5cb"), rect(-13, 3, 3, 2, "#55402f")]
    return ''.join(p)

def generate(unit, data, anim, frames):
    kind, material, tool = data
    cw, ch = W / frames, H / DIRS
    groups = []
    for row in range(DIRS):
        for col in range(frames):
            x, y = (col + .5) * cw, (row + .5) * ch
            groups.append(f'<g transform="translate({x:.3f} {y:.3f}) scale(5)">'
                          f'<ellipse cx="0" cy="23" rx="12" ry="3" fill="#17201d" opacity=".42"/>'
                          f'{art(kind, material, tool, col, anim, row)}</g>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
           f'<title>{escape(unit)} {escape(anim)} pixel sprite sheet</title>{"".join(groups)}</svg>')
    (OUT / f"{unit}_{anim}.svg").write_text(svg, encoding="utf-8")

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for unit, data in UNITS.items():
        for anim, frames in ANIMS.items():
            generate(unit, data, anim, frames)
    print(f"Generated {len(UNITS) * len(ANIMS)} sheets in {OUT}")
