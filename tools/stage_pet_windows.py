"""Stage a verified pet-activity update for complete Windows packaging."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile


def stage(release, output):
    manifest = json.loads((release / 'update-manifest.json').read_text(encoding='utf-8'))
    assert manifest['version'] in {'1.5.82','1.5.83','1.5.84','1.5.85','1.5.86','1.5.87','1.5.88','1.5.89','1.5.90','1.5.91','1.5.92','1.5.93','1.5.94','1.5.95','1.5.96','1.5.97'}
    package = release / ('ARALVERSE_Update_' + manifest['version'] + '.zip')
    raw = package.read_bytes()
    assert len(raw) == manifest['size']
    assert hashlib.sha256(raw).hexdigest() == manifest['sha256']
    assert not (output / 'app').exists(), 'Use a fresh staging directory.'
    with zipfile.ZipFile(package) as archive:
        for entry in archive.infolist():
            if not entry.filename.startswith('app/') or entry.is_dir():
                continue
            target = (output / entry.filename).resolve()
            assert target.is_relative_to(output.resolve())
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(entry))
    for name in ['main.js','preload.js','game.html','assets/license-engine.cjs','assets/license-public-key.json','assets/layout-editor-1580.js','assets/activation-ui-1581.js','assets/single-player-questions-1582.js','assets/pet-feeding-1582.js','assets/nina-back-1582.webp','assets/pet-feeding-1582.webp']:
        assert (output / 'app' / name).is_file(), name
    if manifest['version'] in {'1.5.83','1.5.84','1.5.85','1.5.86','1.5.87','1.5.88','1.5.89','1.5.90','1.5.91','1.5.92','1.5.93','1.5.94','1.5.95','1.5.96','1.5.97'}:
        for name in ['pet-feeding-1583.js','pet-feeding-1583.css','pet-fonts-1583.js','pet-garden-1583.webp','pet-food-1583.webp','puppy-emotions-1583.webp','pet-mode-card-1583.webp']:
            assert (output / 'app/assets' / name).is_file(), name
    if manifest['version'] in {'1.5.93','1.5.94','1.5.95','1.5.96','1.5.97'}:
        for name in ['classroom-projector-1593.js','classroom-projector-1593.css','pet-empty-bowl-1593.webp','pet-branch-1593.webp','pet-puddle-1593.webp','pet-splash-1593.webp']:
            assert (output / 'app/assets' / name).is_file(), name
    if manifest['version'] in {'1.5.94','1.5.95','1.5.96','1.5.97'}:
        for name in ['tournament-art-1594.js','tournament-portraits-1594.js','tournament-players-1594.js','tournament-players-1594.css','tournament-detector-1594.js','tournament-landmarks-1594.js','tournament-detector-LICENSE.txt','pet-grass-1594.webp','pet-grass-sprig-1594.webp','pet-cricket-leaf-1594.webp','pet-cricket-1594.webp']:
            assert (output / 'app/assets' / name).is_file(), name
    if manifest['version'] in {'1.5.95','1.5.96','1.5.97'}:
        assert (output / 'app/assets/tournament-schoolyard-1595.webp').is_file()
    if manifest['version'] in {'1.5.96','1.5.97'}:
        assert len(list((output / 'app/assets/tournament-skins').glob('*.webp'))) == 20
        assert (output / 'app/assets/tournament-skins.js').is_file()
    info = {'version':manifest['version'],'sourceSha256':manifest['sha256'],'electronVersion':'44.10.0','architecture':'x64'}
    (output / 'release.json').write_text(json.dumps(info, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(info))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('release', type=Path); parser.add_argument('output', type=Path)
    args = parser.parse_args(); stage(args.release, args.output)
