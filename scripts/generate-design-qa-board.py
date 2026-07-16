#!/usr/bin/env python3
"""Build a deterministic side-by-side board for design-direction QA."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


CANVAS = (1920, 1080)
PANEL = (872, 880)
BACKGROUND = "#F7F3EE"
INK = "#1C2130"
MUTED = "#6D7280"
VIOLET = "#6630D7"


def fit_panel(image: Image.Image) -> Image.Image:
    fitted = ImageOps.contain(image.convert("RGB"), (PANEL[0] - 64, PANEL[1] - 64))
    panel = Image.new("RGB", PANEL, "#FFFDF9")
    panel.paste(fitted, ((PANEL[0] - fitted.width) // 2, (PANEL[1] - fitted.height) // 2))
    return panel


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = ["DejaVuSans-Bold.ttf", "Arial Bold.ttf"] if bold else ["DejaVuSans.ttf", "Arial.ttf"]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", type=Path)
    parser.add_argument("actual", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    canvas = Image.new("RGB", CANVAS, BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text((72, 50), "MediaCookies · QIDU direction QA", fill=INK, font=font(34, True))
    draw.text((72, 94), "Reference direction board and the production extension UI", fill=MUTED, font=font(20))

    positions = [(72, 160), (976, 160)]
    labels = ["REFERENCE", "ACTUAL · OPERA NEON"]
    images = [Image.open(args.reference), Image.open(args.actual)]
    for (x, y), label, image in zip(positions, labels, images, strict=True):
        panel = fit_panel(image)
        canvas.paste(panel, (x, y))
        draw.rounded_rectangle((x, y, x + PANEL[0], y + PANEL[1]), radius=28, outline="#DED8E5", width=2)
        draw.text((x + 28, y + 24), label, fill=VIOLET, font=font(16, True))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
