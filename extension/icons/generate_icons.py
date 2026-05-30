from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parent
SIZES = (16, 48, 128)


def render_background(size: int) -> Image.Image:
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    top = (18, 168, 216)
    bottom = (17, 84, 200)

    for y in range(size):
        t = y / max(size - 1, 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,)
        draw.line((0, y, size, y), fill=color)

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=max(3, round(size * 0.22)),
        fill=255,
    )
    base.putalpha(mask)

    shine = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shine)
    sdraw.ellipse(
        (-size * 0.18, -size * 0.26, size * 0.85, size * 0.56),
        fill=(255, 255, 255, 34),
    )
    shine = shine.filter(ImageFilter.GaussianBlur(radius=max(1, size // 18)))
    return Image.alpha_composite(base, shine)


def draw_ticket(icon: Image.Image, size: int) -> None:
    left = round(size * 0.23)
    top = round(size * 0.22)
    right = round(size * 0.77)
    bottom = round(size * 0.79)
    radius = max(2, round(size * 0.045))

    ticket = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((left, top, right, bottom), radius=radius, fill=255)

    notch = max(1, round(size * 0.055))
    cy = round(size * 0.40)
    mask_draw.ellipse((left - notch, cy - notch, left + notch, cy + notch), fill=0)
    mask_draw.ellipse((right - notch, cy - notch, right + notch, cy + notch), fill=0)
    ticket.putalpha(mask)
    icon.alpha_composite(ticket)

    draw = ImageDraw.Draw(icon)

    pale = (205, 234, 255, 255)
    draw.line(
        (round(size * 0.36), round(size * 0.42), round(size * 0.64), round(size * 0.42)),
        fill=pale,
        width=max(1, round(size * 0.035)),
    )
    draw.line(
        (round(size * 0.37), round(size * 0.63), round(size * 0.63), round(size * 0.63)),
        fill=pale,
        width=max(1, round(size * 0.035)),
    )


def draw_route(icon: Image.Image, size: int) -> None:
    draw = ImageDraw.Draw(icon)
    blue = (20, 111, 235, 255)
    white = (255, 255, 255, 255)

    start = (round(size * 0.38), round(size * 0.42))
    end = (round(size * 0.64), round(size * 0.60))
    mid = (round(size * 0.49), round(size * 0.45), round(size * 0.54), round(size * 0.53))
    width = max(2, round(size * 0.05))

    draw.arc(mid, start=260, end=70, fill=blue, width=width)
    draw.line((round(size * 0.52), round(size * 0.51), end[0], end[1]), fill=blue, width=width)

    dot_r = max(2, round(size * 0.065))
    for point in (start, end):
        draw.ellipse(
            (point[0] - dot_r, point[1] - dot_r, point[0] + dot_r, point[1] + dot_r),
            fill=blue,
        )
        inner = max(1, round(size * 0.028))
        draw.ellipse(
            (point[0] - inner, point[1] - inner, point[0] + inner, point[1] + inner),
            fill=white,
        )

    draw.line(
        (round(size * 0.41), round(size * 0.72), round(size * 0.59), round(size * 0.72)),
        fill=blue,
        width=max(1, round(size * 0.035)),
    )


def draw_badge(icon: Image.Image, size: int) -> None:
    draw = ImageDraw.Draw(icon)
    r = max(2, round(size * 0.085))
    cx = round(size * 0.72)
    cy = round(size * 0.28)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 210, 77, 255))
    draw.line(
        (
            cx - r * 0.35,
            cy + r * 0.02,
            cx - r * 0.06,
            cy + r * 0.30,
            cx + r * 0.45,
            cy - r * 0.32,
        ),
        fill=(17, 84, 200, 255),
        width=max(1, round(size * 0.022)),
    )


def render_icon(size: int) -> Image.Image:
    icon = render_background(size)
    draw_ticket(icon, size)
    draw_route(icon, size)
    draw_badge(icon, size)
    return icon


def main() -> None:
    for size in SIZES:
        out = ROOT / f"icon{size}.png"
        render_icon(size).save(out)
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
