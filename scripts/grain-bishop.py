"""Add subtle, reproducible grain to the graded Bishop photographs.

Run with python3 scripts/grain-bishop.py (requires Pillow and numpy).
Uses the existing grade as its source and writes new versioned assets.
The texture is visually guided by daphne.jpg, not an exact film-stock model.
"""
import hashlib
from pathlib import Path
import tempfile

import numpy as np
from PIL import Image


IMAGES = Path(__file__).resolve().parents[1] / 'public/images'


def add_grain(im, seed):
    rng = np.random.default_rng(seed)
    # Predominantly luminance grain, with a little neighboring-pixel correlation.
    # The photograph itself is never blurred, resampled, or sharpened.
    noise = rng.standard_normal((im.height + 2, im.width + 2), dtype=np.float32)
    texture = (0.6 * noise[1:-1, 1:-1]
               + 0.1 * (noise[:-2, 1:-1] + noise[2:, 1:-1]
                        + noise[1:-1, :-2] + noise[1:-1, 2:])) / np.sqrt(0.4)
    del noise
    output = Image.new('RGB', im.size)
    for top in range(0, im.height, 256):
        bottom = min(top + 256, im.height)
        rgb = np.asarray(im.crop((0, top, im.width, bottom)), dtype=np.float32)
        lum = (rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)) / 255
        # Softly taper at the tonal extremes; retain the existing black/white points.
        strength = 5.5 * (0.5 + 0.5 * np.sin(np.pi * lum))
        grain = texture[top:bottom, :, None]
        chroma = rng.standard_normal(rgb.shape, dtype=np.float32)
        chroma -= (chroma @ np.array([.2126, .7152, .0722], dtype=np.float32))[..., None]
        rgb += strength[..., None] * (grain + 0.16 * chroma)
        output.paste(Image.fromarray(np.uint8(np.clip(rgb, 0, 255) + .5)), (0, top))
    return output


if __name__ == '__main__':
    sources = sorted((Path(tempfile.gettempdir()) / 'bishop-grade-masters').glob('bishop-*-film.jpg'))
    if len(sources) != 5:
        raise SystemExit(f'Expected five graded sources, found {len(sources)}')
    for source in sources:
        destination = IMAGES / (source.stem + '-grain-v1.jpg')
        if destination.exists():
            raise SystemExit(f'{destination.name} already exists; use a new version name for revisions')
        im = Image.open(source)
        profile = im.info.get('icc_profile')
        seed = int.from_bytes(hashlib.sha256(source.name.encode()).digest()[:8], 'big')
        result = add_grain(im.convert('RGB'), seed)
        result.save(destination, quality=96, subsampling=0, icc_profile=profile)
        print(f'{destination.name}: {result.width} x {result.height}')
