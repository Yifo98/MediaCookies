#!/usr/bin/env python3
"""Build transparent MediaCookies · 凭 icon assets from an approved RGB master.

The ImageGen master is rendered on white because the white opening is the logo's
negative space. This script removes the white matte, prepares a compact toolbar
crop, and exports deterministic RGBA PNG derivatives.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


RESAMPLING = Image.Resampling.LANCZOS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("master", type=Path, help="Approved opaque RGB master PNG")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Repository root")
    return parser.parse_args()


def remove_white_matte(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    pixels = []

    for red, green, blue, _ in rgba.get_flattened_data():
        contrast = max(255 - red, 255 - green, 255 - blue)
        alpha = max(0, min(255, round((contrast - 5) * 4.25)))

        if alpha == 0:
            pixels.append((255, 255, 255, 0))
            continue

        if alpha >= 245:
            pixels.append((red, green, blue, 255))
            continue

        normalized = alpha / 255
        unmatted = tuple(
            max(0, min(255, round(255 - (255 - channel) / normalized)))
            for channel in (red, green, blue)
        )
        pixels.append((*unmatted, alpha))

    rgba.putdata(pixels)
    return rgba


def alpha_bbox(image: Image.Image, threshold: int) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value >= threshold else 0)
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("The approved master contains no visible artwork")
    return bbox


def square_crop(image: Image.Image, bbox: tuple[int, int, int, int], padding: float) -> Image.Image:
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    side = max(width, height)
    side = round(side * (1 + 2 * padding))
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    crop_box = (
        round(center_x - side / 2),
        round(center_y - side / 2),
        round(center_x + side / 2),
        round(center_y + side / 2),
    )

    canvas = Image.new("RGBA", (side, side), (255, 255, 255, 0))
    source_box = (
        max(0, crop_box[0]),
        max(0, crop_box[1]),
        min(image.width, crop_box[2]),
        min(image.height, crop_box[3]),
    )
    target = (source_box[0] - crop_box[0], source_box[1] - crop_box[1])
    canvas.alpha_composite(image.crop(source_box), target)
    return canvas


def fit_on_canvas(image: Image.Image, size: int, artwork_size: int) -> Image.Image:
    resized = image.resize((artwork_size, artwork_size), RESAMPLING)
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    offset = ((size - artwork_size) // 2, (size - artwork_size) // 2)
    canvas.alpha_composite(resized, offset)
    return canvas


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def main() -> None:
    args = parse_args()
    root = args.root.resolve()
    master = Image.open(args.master)
    transparent = remove_white_matte(master)

    presentation_crop = square_crop(transparent, alpha_bbox(transparent, 18), 0.035)
    toolbar_source = transparent.copy()
    toolbar_alpha = toolbar_source.getchannel("A")
    ray_cutoff = round(toolbar_source.height * 0.775)
    toolbar_alpha.paste(0, (0, ray_cutoff, toolbar_source.width, toolbar_source.height))
    toolbar_source.putalpha(toolbar_alpha)
    toolbar_crop = square_crop(toolbar_source, alpha_bbox(toolbar_source, 40), 0.045)

    source_dir = root / "docs/brand/assets/source"
    icons_dir = root / "docs/brand/assets/icons"
    save(master.convert("RGB"), source_dir / "qidu-pass-imagegen-master.png")
    save(presentation_crop.resize((1024, 1024), RESAMPLING), source_dir / "qidu-pass-transparent-master.png")
    save(toolbar_crop.resize((512, 512), RESAMPLING), icons_dir / "qidu-pass-toolbar-512.png")
    save(presentation_crop.resize((512, 512), RESAMPLING), icons_dir / "qidu-pass-presentation-512.png")

    # Keep the existing public filenames stable for docs and downstream tooling.
    save(toolbar_crop.resize((512, 512), RESAMPLING), icons_dir / "passage-mark-toolbar-512.png")
    save(presentation_crop.resize((512, 512), RESAMPLING), icons_dir / "passage-mark-presentation-512.png")

    icon_sizes = {16: 15, 32: 30, 48: 45, 128: 92}
    for size, artwork_size in icon_sizes.items():
        save(fit_on_canvas(toolbar_crop, size, artwork_size), root / f"icons/icon{size}.png")
        save(fit_on_canvas(toolbar_crop, size, artwork_size), root / f"icons/toolbar/icon{size}.png")

    save(fit_on_canvas(presentation_crop, 128, 112), root / "icons/presentation/icon128.png")


if __name__ == "__main__":
    main()
