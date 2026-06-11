from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SIZES = (16, 48, 128)
CANVAS = 128


def scale(value: float, size: int) -> float:
    return value / CANVAS * size


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def crc(chunk_type: bytes, data: bytes) -> bytes:
    return struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)


class Canvas:
    def __init__(self, size: int) -> None:
        self.size = size
        self.data = bytearray(size * size * 4)

    def blend(self, x: int, y: int, color: tuple[int, int, int, int]) -> None:
        if x < 0 or y < 0 or x >= self.size or y >= self.size:
            return
        idx = (y * self.size + x) * 4
        sr, sg, sb, sa = color
        if sa <= 0:
            return
        if sa >= 255:
            self.data[idx:idx + 4] = bytes((sr, sg, sb, 255))
            return
        da = self.data[idx + 3]
        inv = 255 - sa
        out_a = sa + da * inv // 255
        if out_a == 0:
            return
        for i, src in enumerate((sr, sg, sb)):
            dst = self.data[idx + i]
            self.data[idx + i] = min(255, (src * sa + dst * da * inv // 255) // out_a)
        self.data[idx + 3] = out_a

    def rounded_background(self) -> None:
        size = self.size
        radius = scale(30, size)
        x0 = y0 = scale(8, size)
        x1 = y1 = scale(120, size)
        top = (14, 165, 233)
        mid = (37, 99, 235)
        bottom = (23, 37, 84)
        for y in range(size):
            t = y / max(size - 1, 1)
            color = mix(top, mid, t / 0.55) if t <= 0.55 else mix(mid, bottom, (t - 0.55) / 0.45)
            for x in range(size):
                if inside_rounded_rect(x + 0.5, y + 0.5, x0, y0, x1, y1, radius):
                    self.blend(x, y, color + (255,))
                    if ((x - scale(24, size)) / scale(62, size)) ** 2 + ((y - scale(20, size)) / scale(36, size)) ** 2 < 1:
                        self.blend(x, y, (255, 255, 255, 28))

    def fill_polygon(self, points: list[tuple[float, float]], color: tuple[int, int, int, int]) -> None:
        min_x = max(0, math.floor(min(x for x, _ in points)))
        max_x = min(self.size - 1, math.ceil(max(x for x, _ in points)))
        min_y = max(0, math.floor(min(y for _, y in points)))
        max_y = min(self.size - 1, math.ceil(max(y for _, y in points)))
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                if point_in_polygon(x + 0.5, y + 0.5, points):
                    self.blend(x, y, color)

    def fill_rounded_rect(self, box: tuple[float, float, float, float], radius: float, color: tuple[int, int, int, int]) -> None:
        x0, y0, x1, y1 = box
        for y in range(max(0, math.floor(y0)), min(self.size - 1, math.ceil(y1)) + 1):
            for x in range(max(0, math.floor(x0)), min(self.size - 1, math.ceil(x1)) + 1):
                if inside_rounded_rect(x + 0.5, y + 0.5, x0, y0, x1, y1, radius):
                    self.blend(x, y, color)

    def fill_ellipse(self, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int]) -> None:
        for y in range(max(0, math.floor(cy - ry)), min(self.size - 1, math.ceil(cy + ry)) + 1):
            for x in range(max(0, math.floor(cx - rx)), min(self.size - 1, math.ceil(cx + rx)) + 1):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    self.blend(x, y, color)

    def stroke_line(self, points: list[tuple[float, float]], width: float, color: tuple[int, int, int, int]) -> None:
        radius = width / 2
        min_x = max(0, math.floor(min(x for x, _ in points) - radius))
        max_x = min(self.size - 1, math.ceil(max(x for x, _ in points) + radius))
        min_y = max(0, math.floor(min(y for _, y in points) - radius))
        max_y = min(self.size - 1, math.ceil(max(y for _, y in points) + radius))
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                p = (x + 0.5, y + 0.5)
                if any(distance_to_segment(p, points[i], points[i + 1]) <= radius for i in range(len(points) - 1)):
                    self.blend(x, y, color)
                elif any(math.hypot(p[0] - px, p[1] - py) <= radius for px, py in points):
                    self.blend(x, y, color)


def inside_rounded_rect(x: float, y: float, x0: float, y0: float, x1: float, y1: float, r: float) -> bool:
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2


def point_in_polygon(x: float, y: float, points: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(points) - 1
    for i in range(len(points)):
        xi, yi = points[i]
        xj, yj = points[j]
        if (yi > y) != (yj > y):
            x_intersect = (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi
            if x < x_intersect:
                inside = not inside
        j = i
    return inside


def distance_to_segment(p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
    px, py = p
    ax, ay = a
    bx, by = b
    dx = bx - ax
    dy = by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def draw_train(canvas: Canvas) -> None:
    size = canvas.size
    pts = [
        (scale(36, size), scale(33, size)),
        (scale(36, size), scale(75, size)),
        (scale(38, size), scale(84, size)),
        (scale(46, size), scale(95, size)),
        (scale(55, size), scale(103, size)),
        (scale(64, size), scale(107, size)),
        (scale(73, size), scale(103, size)),
        (scale(82, size), scale(95, size)),
        (scale(90, size), scale(84, size)),
        (scale(92, size), scale(75, size)),
        (scale(92, size), scale(33, size)),
    ]
    canvas.fill_polygon([(x, y + scale(5, size)) for x, y in pts], (8, 47, 107, 54))
    canvas.fill_polygon(pts, (246, 251, 255, 255))
    canvas.fill_rounded_rect(
        (scale(44, size), scale(35, size), scale(84, size), scale(62, size)),
        scale(6, size),
        (18, 62, 138, 255),
    )
    canvas.fill_rounded_rect(
        (scale(49, size), scale(41, size), scale(79, size), scale(55, size)),
        scale(3, size),
        (59, 130, 246, 255),
    )
    canvas.stroke_line(
        [(scale(54, size), scale(75, size)), (scale(74, size), scale(75, size))],
        max(2, scale(6, size)),
        (37, 99, 235, 255),
    )
    for cx in (scale(49, size), scale(79, size)):
        canvas.fill_ellipse(cx, scale(70, size), scale(5, size), scale(5, size), (251, 191, 36, 255))
    canvas.stroke_line(
        [(scale(49, size), scale(89, size)), (scale(79, size), scale(89, size))],
        max(1, scale(4, size)),
        (148, 163, 184, 255),
    )


def draw_badge(canvas: Canvas) -> None:
    size = canvas.size
    if size <= 64:
        return
    canvas.fill_ellipse(scale(91, size), scale(34, size), scale(15, size), scale(15, size), (34, 197, 94, 255))
    canvas.stroke_line(
        [
            (scale(84, size), scale(34, size)),
            (scale(89, size), scale(39, size)),
            (scale(99, size), scale(28, size)),
        ],
        max(4, scale(5, size)),
        (255, 255, 255, 255),
    )


def downsample(src: Canvas, out_size: int) -> bytearray:
    factor = src.size // out_size
    out = bytearray(out_size * out_size * 4)
    for y in range(out_size):
        for x in range(out_size):
            acc = [0, 0, 0, 0]
            for yy in range(factor):
                for xx in range(factor):
                    idx = ((y * factor + yy) * src.size + (x * factor + xx)) * 4
                    for c in range(4):
                        acc[c] += src.data[idx + c]
            idx_out = (y * out_size + x) * 4
            count = factor * factor
            out[idx_out:idx_out + 4] = bytes(round(v / count) for v in acc)
    return out


def write_png(path: Path, size: int, rgba: bytearray) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw.extend(rgba[y * size * 4:(y + 1) * size * 4])
    payload = zlib.compress(bytes(raw), level=9)
    chunks = []
    for chunk_type, data in [
        (b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)),
        (b"IDAT", payload),
        (b"IEND", b""),
    ]:
        chunks.append(struct.pack(">I", len(data)) + chunk_type + data + crc(chunk_type, data))
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"".join(chunks))


def render(size: int) -> bytearray:
    factor = 4 if size < 128 else 2
    work = Canvas(size * factor)
    work.rounded_background()
    draw_train(work)
    draw_badge(work)
    return downsample(work, size)


def main() -> None:
    for size in SIZES:
        out = ROOT / f"icon{size}.png"
        write_png(out, size, render(size))
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
