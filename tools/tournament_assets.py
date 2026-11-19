"""Package the uniform plates and pinned offline face-landmark detector."""
import base64
import hashlib
import json
import shutil
import subprocess
import tarfile


PACKAGE = '@vladmandic/face-api@1.7.15'
ARCHIVE = 'vladmandic-face-api-1.7.15.tgz'
INTEGRITY = 'WDMmK3CfNLo8jylWqMoQgf4nIst3M0fzx1dnac96wv/dvMTN4DxC/Pq1DGtduDk1lktCamQ3MIDXFnvrdHTXDw=='


def b64(data):
    return base64.b64encode(data).decode('ascii')


def assignment(name, value):
    return ('window.' + name + '=' + json.dumps(value, separators=(',', ':')) + ';\n').encode()


def package_tournament(files, root):
    cache = root / '.build/tournament-vendor'
    cache.mkdir(parents=True, exist_ok=True)
    archive = cache / ARCHIVE
    if not archive.exists():
        subprocess.run([shutil.which('npm') or 'npm', 'pack', '--silent', '--ignore-scripts',
                        '--pack-destination', str(cache), PACKAGE], check=True)
    assert b64(hashlib.sha512(archive.read_bytes()).digest()) == INTEGRITY, 'Unexpected face detector archive'
    prefix = 'app/assets/'
    with tarfile.open(archive, 'r:gz') as dependency:
        def member(name):
            return dependency.extractfile('package/' + name).read()
        files[prefix + 'tournament-detector-1594.js'] = member('dist/face-api.js')
        files[prefix + 'tournament-detector-LICENSE.txt'] = (
            member('LICENSE') + b'\n' + (root / 'src/assets/tournament-third-party-notices.txt').read_bytes()
        )
        models = {}
        for net, name in [('tinyFaceDetector', 'tiny_face_detector'), ('faceLandmark68TinyNet', 'face_landmark_68_tiny')]:
            manifest = json.loads(member('model/' + name + '_model-weights_manifest.json'))
            assert len(manifest) == 1 and manifest[0]['paths'] == [name + '_model.bin']
            models[net] = {'weights': manifest[0]['weights'], 'data': b64(member('model/' + name + '_model.bin'))}
        files[prefix + 'tournament-landmarks-1594.js'] = assignment('AVTournamentWeights1594', models)
    art = {look: 'data:image/webp;base64,' + b64((root / f'src/assets/tournament-{look}-1594.webp').read_bytes())
           for look in ('teal', 'yellow')}
    files[prefix + 'tournament-art-1594.js'] = assignment('AVTournamentArt1594', art)
    for source in ('tournament-portraits.js', 'tournament-players.js', 'tournament-players.css'):
        stem, extension = source.rsplit('.', 1)
        files[prefix + stem + '-1594.' + extension] = (root / 'src' / source).read_bytes()


def tournament_template(template, once):
    assets = ('<link rel="stylesheet" href="assets/tournament-players-1594.css">'
              '<script src="assets/tournament-art-1594.js"></script>'
              '<script src="assets/tournament-portraits-1594.js"></script>'
              '<script src="assets/tournament-players-1594.js"></script>')
    template = once(template, '<head>', '<head>' + assets)
    start = '  $("bluePhoto").onerror=function(){this.onerror=null;this.src=MQ_BATTLE_PLACEHOLDER};'
    end = '  $("redPhoto").src=mqBattleImage(r);'
    left = template.index(start)
    right = template.index(end, left) + len(end)
    assert template[left:right].count('\n') == 3
    return once(template, template[left:right], '  AVTournamentPlayers1594.paint("blue", b);\n  AVTournamentPlayers1594.paint("red", r);')
