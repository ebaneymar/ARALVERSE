"""Build v1.5.84 from the exact published v1.5.82 package."""
import argparse
from datetime import date
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

VERSION = '1.5.84'
BASE_SHA256 = 'ede5d588f50f6c336b6ed0d2dfe644700e75761ddf29c4c1ec5307c891378c2c'


def once(text, old, new):
    assert text.count(old) == 1, 'Unexpected v1.5.82 implementation: ' + old[:80]
    return text.replace(old, new, 1)


def packed_source(game, name):
    match = re.search(r'const ' + name + r'\s*=\s*', game)
    value, end = json.JSONDecoder().raw_decode(game, match.end())
    return value, match.end(), end


def encode(value):
    return json.dumps(value, ensure_ascii=True, separators=(',', ':')).replace('</', '<\\/')


def build(base, root, output):
    raw = base.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == BASE_SHA256, 'Use the published v1.5.82 base.'
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        files = {entry.filename: archive.read(entry) for entry in archive.infolist() if not entry.is_dir()}
    original = dict(files)
    game = files['app/game.html'].decode('utf-8')
    packed, start, end = packed_source(game, 'PET_FEEDING_SOURCE')
    engine = re.search(r'<script id="mq-curriculum-engine-v190">[\s\S]*?</script>', packed['template'])
    assert engine, 'The existing curriculum engine was not found.'
    packed['template'] = once((root / 'src/pet-feeding.html').read_text(), '__AV_CURRICULUM_ENGINE__', engine.group())
    game = game[:start] + encode(packed) + game[end:]
    tile = re.search(r'<button\b[^>]*id="petFeedingMode1582"[\s\S]*?</button>', game)
    assert tile
    replacement = '''<button type="button" id="petFeedingMode1582" class="mode-card av-pet-mode1582" onclick="launchGame('petFeeding')" aria-label="Play Pakainin ang mga Alaga. Single Player, Growing Pets, Import Questions."><img src="assets/pet-mode-card-1583.webp" alt="Pakainin ang mga Alaga — Sagutin, magpakain, at palakihin ang alaga. Pumili ng tauhan at gamitin ang sariling mga tanong. PLAY." loading="eager"></button>'''
    game = game[:tile.start()] + replacement + game[tile.end():]
    menu_style = '''<style id="av-pet-card1583">
#modeMenu #petFeedingMode1582{display:block!important;grid-column:1/-1!important;width:100%!important;max-width:1100px!important;min-height:0!important;height:auto!important;padding:0!important;margin:8px auto!important;background:transparent!important;border:0!important;border-radius:25px!important;box-shadow:none!important;overflow:hidden!important;transform:none!important}
#modeMenu #petFeedingMode1582::before,#modeMenu #petFeedingMode1582::after{display:none!important}
#modeMenu #petFeedingMode1582 img{display:block!important;width:100%!important;height:auto!important;max-height:none!important;object-fit:contain!important;filter:none!important}
#modeMenu #petFeedingMode1582:hover{filter:brightness(1.025)!important}
#modeMenu #petFeedingMode1582:focus-visible{outline:4px solid #1d958c!important;outline-offset:4px!important}
</style>'''
    game = once(game, '</head>', menu_style + '\n</head>')
    other_modes = ['PVE_SOURCE','PVP_SOURCE','TOURNAMENT_SOURCE','TEAM_TOURNAMENT_SOURCE','BOSS_SOURCE','PROGRESS_SOURCE']
    preserved_ranges = [packed_source(game,name)[1:] for name in other_modes]
    game = re.sub(r'1\.5\.82', lambda match: match.group() if any(start <= match.start() < end for start,end in preserved_ranges) else VERSION, game)
    files['app/game.html'] = game.encode('utf-8')
    files['app/main.js'] = once(files['app/main.js'].decode(), '"1.5.82"', json.dumps(VERSION)).encode()
    package = json.loads(files['app/package.json']); package['version'] = VERSION
    files['app/package.json'] = (json.dumps(package, indent=2) + '\n').encode()
    for source, destination in [('pet-feeding.js','pet-feeding-1583.js'),('pet-feeding.css','pet-feeding-1583.css'),('pet-fonts.js','pet-fonts-1583.js')]:
        files['app/assets/' + destination] = (root / 'src' / source).read_bytes()
    for name in ['pet-garden-1583.webp','pet-food-1583.webp','puppy-emotions-1583.webp','pet-mode-card-1583.webp']:
        files['app/assets/' + name] = (root / 'src/assets' / name).read_bytes()
    for name in ['app/preload.js','app/assets/license-engine.cjs','app/assets/license-public-key.json','app/assets/activation-ui-1581.js','app/assets/layout-editor-1580.js','app/assets/single-player-questions-1582.js']:
        assert files[name] == original[name], 'Preserve existing data/licensing/tools: ' + name
    # Other game modes remain byte-identical to the published base.
    for name in other_modes:
        assert packed_source(files['app/game.html'].decode(),name)[0] == packed_source(original['app/game.html'].decode(),name)[0], name
    files['UPLOAD_INSTRUCTIONS.txt'] = b'ARALVERSE 1.5.84\nPublish this ZIP together with its exact update-manifest.json.\nPakainin ang mga Alaga: illustrated scene, matching mode card, food bowl, puppy emotions, and saved font controls.\n'
    output.mkdir(parents=True, exist_ok=True)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in files.items():
            entry = zipfile.ZipInfo(name, date_time=(2026,11,12,0,0,0)); entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, data, compresslevel=9)
    raw = buffer.getvalue(); package = output / f'ARALVERSE_Update_{VERSION}.zip'; package.write_bytes(raw)
    digest = hashlib.sha256(raw).hexdigest()
    manifest = {'app':'ARALVERSE','version':VERSION,'published':str(date.today()),'packageType':'app',
      'downloadUrl':f'https://raw.githubusercontent.com/ebaneymar/ARALVERSE/main/{package.name}?sha256={digest}',
      'sha256':digest,'size':len(raw),'notes':[
        'Pakainin ang mga Alaga has a new illustrated game-mode card and a wide, cheerful Philippine schoolyard scene based on the supplied designs.',
        'Feed the pet with a blue food bowl instead of hearts. The puppy becomes happy after feeding, grows with correct answers, and looks sad when hungry.',
        'Use FONT in the activity to preview and save font family, title/question/answer/label sizes, boldness, and text color. Cancel or restore defaults anytime.',
        'Answer with A, B, or C for the left, middle, or right choice. Press Enter for the next question or retry. Shortcuts also work when focus is on the launcher.',
        'Other game modes, imported questions, classroom saves, manual layouts, device trial, and activation are retained.'
      ]}
    (output / 'update-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    with zipfile.ZipFile(package) as archive: assert archive.testzip() is None
    print(json.dumps({'version':VERSION,'package':str(package),'size':len(raw),'sha256':digest}))


if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(); parser.add_argument('--base',type=Path,default=root/'ARALVERSE_Update_1.5.82.zip'); parser.add_argument('--output',type=Path,default=root/'.build/pet-style-release')
    args = parser.parse_args(); build(args.base,root,args.output)
