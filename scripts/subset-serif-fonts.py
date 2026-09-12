"""Rebuild Latin IBM Plex Serif assets (requires fonttools[woff] and brotli)."""
from pathlib import Path
from hashlib import sha256
import json
from fontTools import subset

root = Path(__file__).resolve().parents[1]
manifest_path = root / 'config/font-assets.json'
manifest = json.loads(manifest_path.read_text())
css_path = root / 'src/app/fonts.css'
css = css_path.read_text()
# Latin, extended Latin, punctuation, currency, and common mathematical symbols.
ranges = 'U+0000-024F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-22FF,U+FEFF,U+FFFD'
for source in sorted((root / 'public/fonts/IBM Plex Serif').glob('*.woff2')):
    if source.stem.endswith('-latin'):
        continue
    options = subset.Options()
    options.flavor = 'woff2'
    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=subset.parse_unicodes(ranges))
    subsetter.subset(font)
    output = source.with_name(source.stem + '-latin.woff2')
    subset.save_font(font, str(output), options)
    digest = sha256(output.read_bytes()).hexdigest()[:16]
    versioned = '/fonts/versioned/' + output.stem + '.' + digest + '.woff2'
    (root / ('public' + versioned)).write_bytes(output.read_bytes())
    original_key = '/' + str(source.relative_to(root / 'public'))
    subset_key = '/' + str(output.relative_to(root / 'public'))
    old_url = manifest.pop(original_key, None) or manifest.get(subset_key)
    if old_url:
        css = css.replace(old_url, versioned)
    manifest[subset_key] = versioned
    print(f'{source.name}: {source.stat().st_size:,} → {output.stat().st_size:,} bytes')
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
css_path.write_text(css)
