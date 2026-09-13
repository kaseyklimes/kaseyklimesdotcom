"""Reproduce the Bishop series' non-generative color grade.

Requires Pillow, numpy, and ImageMagick (for HEIC decoding).
Usage: python3 scripts/grade-bishop.py [--preview] [--source-dir PATH]
Originals remain untouched. Full-resolution intermediate grades go to the
system temporary directory; grain-bishop.py exports the final website assets.
"""
import argparse
from pathlib import Path
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageCms, ImageOps


ROOT = Path(__file__).resolve().parents[1]
# Source, destination, contrast, shadow recovery, exposure (stops).
PHOTOS = [
    ('Bishop 12 (1).jpg', 'bishop-vehicles-film.jpg', 1.07, 0.005, -0.03),
    ('Bishop 10.jpg', 'bishop-boulders-film.jpg', 1.00, 0.035, 0.00),
    ('Bishop 6 (1).jpg', 'bishop-climber-observer-film.jpg', 1.03, 0.018, 0.00),
    ('Bishop 21.jpg', 'bishop-climber-film.jpg', 1.00, 0.055, 0.04),
    ('IMG_8587.HEIC', 'bishop-packing-film.jpg', 1.00, 0.018, -0.06),
]
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))


def open_source(path):
    if path.suffix.lower() == '.heic':
        with tempfile.TemporaryDirectory(prefix='bishop-grade-') as tmp:
            decoded = Path(tmp) / 'decoded.png'
            subprocess.run(['magick', str(path), '-auto-orient', '-depth', '8', str(decoded)], check=True)
            im = Image.open(decoded)
            im.load()
    else:
        im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    profile = im.info.get('icc_profile')
    if profile:
        from io import BytesIO
        im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(BytesIO(profile)), SRGB, outputMode='RGB')
    return im.convert('RGB')


def grade(im, contrast, recovery, exposure):
    # Pointwise transforms only: no resampling, blur, synthesis, or added grain.
    result = Image.new('RGB', im.size)
    for top in range(0, im.height, 256):
        bottom = min(top + 256, im.height)
        rgb = np.asarray(im.crop((0, top, im.width, bottom)), dtype=np.float32) / 255
        rgb *= 2 ** exposure
        lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        rgb += (recovery * np.maximum(1 - lum / 0.65, 0) ** 2)[..., None]
        rgb = (rgb - 0.45) * contrast + 0.45
        # Gentle toe and shoulder, retaining dark anchors and creamy whites.
        rgb = np.interp(rgb, [0, .025, .08, .18, .35, .50, .70, .85, 1],
                        [.014, .027, .072, .164, .338, .50, .704, .846, .968]).astype(np.float32)
        lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        shadows = np.clip((.55 - lum) / .55, 0, 1) ** 1.5
        lights = np.clip((lum - .35) / .65, 0, 1)
        rgb += shadows[..., None] * np.array([.006, .009, -.005], dtype=np.float32)
        rgb += lights[..., None] * np.array([.014, .005, -.015], dtype=np.float32)
        # Restrain digital blue and move it gently toward the references' cyan.
        blue = np.clip((rgb[..., 2] - rgb[..., 0] - .015) / .30, 0, 1)
        rgb += blue[..., None] * np.array([-.007, .020, -.032], dtype=np.float32)
        lum = rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)
        rgb = lum[..., None] + .96 * (rgb - lum[..., None])
        result.paste(Image.fromarray(np.uint8(np.clip(rgb, 0, 1) * 255 + .5)), (0, top))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=Path.home() / 'Downloads')
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    out = Path(tempfile.gettempdir()) / ('bishop-grade-preview' if args.preview else 'bishop-grade-masters')
    out.mkdir(parents=True, exist_ok=True)
    for source, name, contrast, recovery, exposure in PHOTOS:
        im = open_source(args.source_dir / source)
        if args.preview:
            im.thumbnail((1400, 1400))
            im.save(out / name.replace('-film', '-original'), quality=94)
        rendered = grade(im, contrast, recovery, exposure)
        rendered.save(out / name, quality=94, subsampling=0, icc_profile=SRGB.tobytes())
        print(f'{out / name}: {rendered.width} x {rendered.height}')


if __name__ == '__main__':
    main()
