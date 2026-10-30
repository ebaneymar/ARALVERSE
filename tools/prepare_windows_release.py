"""Stage the verified, complete app for a fresh Windows installation."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import zipfile

VERSION = '1.5.81'
BASE_SHA256 = '68ec2cb186ddccf56f3487a94dce7ad07b0989caa17574a0f2fe504b1ed29022'


def prepare(base, manifest_path, output):
    raw = base.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if digest != BASE_SHA256 or manifest['sha256'] != digest:
        raise ValueError('The Windows build requires the exact verified v1.5.81 update.')
    if manifest['version'] != VERSION or manifest['size'] != len(raw):
        raise ValueError('Review the published version before building Windows installers.')
    app = output / 'app'
    if app.exists():
        raise FileExistsError('Use a fresh staging directory; never overwrite an installed app.')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        bad = archive.testzip()
        if bad:
            raise ValueError('Invalid update archive: ' + bad)
        for entry in archive.infolist():
            path = PurePosixPath(entry.filename)
            if path.is_absolute() or '..' in path.parts or '\\' in entry.filename:
                raise ValueError('Unsafe archive path: ' + entry.filename)
            if not path.parts or path.parts[0] != 'app' or entry.is_dir():
                continue
            target = output.joinpath(*path.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(entry))
    required = [
        'game.html', 'main.js', 'preload.js', 'package.json',
        'assets/ARALVERSE.ico', 'assets/license-engine.cjs',
        'assets/license-public-key.json', 'assets/activation-ui-1581.js',
        'assets/layout-editor-1580.js',
    ]
    for name in required:
        if not (app / name).is_file():
            raise ValueError('Incomplete Windows app: ' + name)
    package = json.loads((app / 'package.json').read_text(encoding='utf-8'))
    if package['version'] != VERSION or package['main'] != 'main.js':
        raise ValueError('Unexpected desktop entry point or version.')
    files = [p for p in app.rglob('*') if p.is_file()]
    if any(any(word in p.name.lower() for word in ['password', 'owner', 'private', 'activation_manager']) for p in files):
        raise ValueError('A private owner file must never be included in the game.')
    info = {'version': VERSION, 'sourceSha256': digest, 'appFiles': len(files),
            'electronVersion': '44.10.0', 'architecture': 'x64'}
    (output / 'release.json').write_text(json.dumps(info, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(info))


if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', type=Path, default=root / f'ARALVERSE_Update_{VERSION}.zip')
    parser.add_argument('--manifest', type=Path, default=root / 'update-manifest.json')
    parser.add_argument('--output', type=Path, default=root / '.build/windows')
    args = parser.parse_args()
    prepare(args.base, args.manifest, args.output)

