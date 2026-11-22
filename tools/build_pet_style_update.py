"""Build v1.5.98 from the exact published v1.5.82 package."""
import argparse
from datetime import date
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile
from tournament_assets import package_tournament, tournament_template
from classroom_questions import add_editor_hints, add_import_hints

VERSION = '1.5.98'
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


def add_bayanihan_boss(game, root, files):
    classic, _, _ = packed_source(game, 'BOSS_SOURCE')
    engines = []
    for name in ('mq-curriculum-engine-v190', 'aral-barangay-battle-engine-v120'):
        match = re.search(fr'<script id="{name}">[\s\S]*?</script>', classic['template'])
        assert match, 'Missing classroom curriculum script: ' + name
        engines.append(match.group())
    template = (root / 'src/bayanihan-boss.html').read_text(encoding='utf-8')
    template = once(template, '__BAYANIHAN_CURRICULUM__', '\n'.join(engines))
    packed = encode({'avPacked1540': True, 'template': template})
    game = once(game, 'const BOSS_SOURCE = ', 'const BAYANIHAN_BOSS_SOURCE = ' + packed + ';\nconst BOSS_SOURCE = ')
    tile = '''<button type="button" class="mode-card" id="bayanihanBossMode" style="--av-i:3" onclick="launchGame('bayanihanBoss')">
        <span class="mode-art" aria-hidden="true"><img src="assets/bayanihan-cloud.webp" alt=""></span>
        <strong>BAYANIHAN BOSS</strong><small>Itaas ang sagot. Bawat batang tama ay 10 damage sa boss.</small>
        <span class="mode-play">PLAY →</span></button>'''
    marker = '<button class="mode-card boss-card"'
    game = once(game, marker, tile + '\n      ' + marker)
    styles = '''<style>
#modeMenu #bayanihanBossMode .mode-art{position:relative;background:radial-gradient(ellipse at center,#4e617f,#202b4d)!important;overflow:hidden}
#modeMenu #bayanihanBossMode .mode-art img{display:block;width:100%;height:100%;object-fit:contain}
</style>'''
    game = once(game, '</head>', styles + '\n</head>')
    for prefix, branch in [
        ('const html = decodeHtml(', 'mode === "bayanihanBoss" ? BAYANIHAN_BOSS_SOURCE : '),
        ('label.textContent = ', 'mode === "bayanihanBoss" ? "Bayanihan Boss" : '),
        ('const modeName=', 'mode==="bayanihanBoss"?"BAYANIHAN BOSS":'),
    ]:
        existing = prefix + ('mode==="petFeeding"?' if prefix == 'const modeName=' else 'mode === "petFeeding" ?')
        game = once(game, existing, prefix + branch + existing[len(prefix):])
    for name in ('bayanihan-boss.js', 'bayanihan-boss.css'):
        files['app/assets/' + name] = (root / 'src' / name).read_bytes()
    files['app/assets/bayanihan-cloud.webp'] = (root / 'src/assets/bayanihan-cloud.webp').read_bytes()
    return game


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
    replacement = '''<button type="button" id="petFeedingMode1582" class="mode-card av-pet-mode1582" style="--av-i:1" onclick="launchGame('petFeeding')" aria-label="Play Pakainin ang mga Alaga. Single Player, Growing Pets, Import Questions.">
<span class="mode-art av-pet-art1585" aria-hidden="true"><img src="assets/pet-mode-card-1583.webp" alt="" loading="eager"></span><span class="mode-icon" aria-hidden="true">💛</span>
<strong>PAKAININ ANG MGA ALAGA</strong><small>Sagutin ang mga tanong para pakainin at palakihin ang alaga.</small>
<span class="badges"><span class="badge">Single Player</span><span class="badge">Growing Pets</span><span class="badge">Import Questions</span></span><span class="mode-play">PLAY →</span></button>'''
    game = game[:tile.start()] + replacement + game[tile.end():]
    menu_style = '''<style id="av-pet-card1585">
#modeMenu #petFeedingMode1582 .av-pet-art1585{background-image:none!important;overflow:hidden!important}
#modeMenu #petFeedingMode1582 .av-pet-art1585 img{position:absolute!important;inset:0 0 0 auto!important;display:block!important;width:210%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;object-position:right center!important;pointer-events:none!important}
</style>'''
    head = re.search(r'<head\b[^>]*>', game)
    assert head and head.start() < game.index('<body')
    game = game[:head.end()] + '<link rel="stylesheet" href="assets/classroom-projector-1593.css">' + game[head.end():]
    game = once(game, '</head>', menu_style + '\n</head>')
    game = once(game, '</body>', '<script src="assets/classroom-projector-1593.js"></script>\n</body>')
    importer = re.search(r'<script id="av-question-import-v1554">([\s\S]*?)</script>', game)
    assert importer, 'The shared Excel and CSV importer was not found.'
    game = game[:importer.start(1)] + add_import_hints(importer.group(1), once) + game[importer.end(1):]
    editor = re.search(r'<script id="av-question-editor-v1551">([\s\S]*?)</script>', game)
    assert editor, 'The shared Question Editor was not found.'
    editor_source = once(add_editor_hints(editor.group(1), once), 'api.open=openEditor;', (root / 'src/question-editor-bulk-1591.js').read_text() + '\n' + (root / 'src/question-editor-order-1592.js').read_text() + '\napi.open=openEditor;')
    game = game[:editor.start(1)] + editor_source + game[editor.end(1):]
    other_modes = ['PVE_SOURCE','PVP_SOURCE','TOURNAMENT_SOURCE','TEAM_TOURNAMENT_SOURCE','BOSS_SOURCE','PROGRESS_SOURCE']
    preserved_ranges = [packed_source(game,name)[1:] for name in other_modes]
    game = re.sub(r'1\.5\.82', lambda match: match.group() if any(start <= match.start() < end for start,end in preserved_ranges) else VERSION, game)
    tournament, start, end = packed_source(game, 'TOURNAMENT_SOURCE')
    tournament['template'] = tournament_template(tournament['template'], once)
    game = game[:start] + encode(tournament) + game[end:]
    package_tournament(files, root)
    game = add_bayanihan_boss(game, root, files)
    files['app/game.html'] = game.encode('utf-8')
    files['app/main.js'] = once(files['app/main.js'].decode(), '"1.5.82"', json.dumps(VERSION)).encode()
    package = json.loads(files['app/package.json']); package['version'] = VERSION
    files['app/package.json'] = (json.dumps(package, indent=2) + '\n').encode()
    for source, destination in [('pet-feeding.js','pet-feeding-1583.js'),('pet-feeding.css','pet-feeding-1583.css'),('pet-fonts.js','pet-fonts-1583.js'),('single-player-questions.js','single-player-questions-1582.js')]:
        files['app/assets/' + destination] = (root / 'src' / source).read_bytes()
    for name in ['pet-garden-1583.webp','pet-food-1583.webp','puppy-emotions-1583.webp','pet-mode-card-1583.webp']:
        files['app/assets/' + name] = (root / 'src/assets' / name).read_bytes()
    for prop in ['grass', 'grass-sprig', 'cricket-leaf', 'cricket']:
        name = f'pet-{prop}-1594.webp'
        files['app/assets/' + name] = (root / 'src/assets' / name).read_bytes()
    for prop in ['empty-bowl', 'branch', 'puddle', 'splash']:
        name = f'pet-{prop}-1593.webp'
        files['app/assets/' + name] = (root / 'src/assets' / name).read_bytes()
    for extension in ['css', 'js']:
        files[f'app/assets/classroom-projector-1593.{extension}'] = (root / f'src/classroom-projector.{extension}').read_bytes()
    files['app/assets/layout-editor-1580.js'] = (root / 'src/layout-editor-1587.js').read_bytes()
    for name in ['app/preload.js','app/assets/license-engine.cjs','app/assets/license-public-key.json','app/assets/activation-ui-1581.js']:
        assert files[name] == original[name], 'Preserve existing data/licensing/tools: ' + name
    # Keep device validation intact; hide only the floating activated badge.
    activation_ui = files['app/assets/activation-ui-1581.js'].decode('utf-8')
    activation_ui = once(activation_ui, ' function paint(){', ''' function paint(){
  const badge=$('avActivationBadge1581');
  if(badge){badge.hidden=status.activated;if(status.activated)badge.style.setProperty('display','none','important');else badge.style.removeProperty('display')}
''')
    files['app/assets/activation-ui-1581.js'] = activation_ui.encode('utf-8')
    # The cooperative activity uses a new template. Preserve existing battle templates.
    for name in (mode for mode in other_modes if mode != 'TOURNAMENT_SOURCE'):
        assert packed_source(files['app/game.html'].decode(),name)[0] == packed_source(original['app/game.html'].decode(),name)[0], name
    files['UPLOAD_INSTRUCTIONS.txt'] = f'ARALVERSE {VERSION}\nPublish this ZIP together with its exact update-manifest.json.\n'.encode()
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
        'Start Game → Bayanihan Boss lets the class raise their letter answers to a projected multiple-choice question. Choose a lesson and enter the number of participating pupils.',
        'Reveal the correct choice, count the pupils who got it right, then apply the attack. Each correct pupil deals 10 damage. Zero correct deals zero damage. The teacher advances each question.',
        'Bayanihan Boss supports built-in lessons and imported or teacher-edited questions. Choose an easy, medium or hard boss scaled to the size of your class.',
        'Layout now supports multi-select with Ctrl-click, Command-click, or the Multi-select objects control. Drag the selection or use the arrow keys to move it together.',
        'Each tournament HP bar moves with its player name, rank emblem, team tab, and gold plate. Enable Select small parts inside an object to edit an individual piece.',
        'The Avengers Series adds ten Tournament skins in both avatar styles. Each Tournament match medal unlocks one skin, starting with Iron Guard. Select Tournament skins on a player to equip it or switch back to their uniform.',
        'The blue player now has a blue HP fill with a dark track that shows the health lost.',
        'Tournament battles use the schoolyard layout with full-height players, live name and HP panels at the top, reward counters alongside, and questions, answer choices and timer below.',
        'Select Lalaki or Babae on each roster card to set a polo with shorts or a blouse with a pleated skirt. The choice is saved per student and shown beside their name.',
        'Face fitting now blends the actual jaw, neck and hair into the collar. Adjust head size and placement for each pupil on the device.',
        'Pakainin ang mga Alaga gives the puppy kibble, the carabao fresh grass, and the owl crickets on a leaf. The character tosses the matching food.',
        'Tournament players appear as full-body characters with their own roster faces. Facial landmarks align each photo to the uniform and the edges blend on the device.',
        'In the Tournament roster, choose Iayos ang mukha to preview the face, adjust its landmarks, or change the uniform. A missing photo shows a neutral silhouette.',
        'Pang-projector enlarges questions and answers across game modes. Gamit ng guro opens the classroom controls. Correct and incorrect choices show a check or cross.',
        'In Pakainin ang mga Alaga, enable Pahiwatig muna for a clue on the first miss. Enter optional clues in the Excel/CSV Pahiwatig column or in Question Editor.',
        'Each pet celebrates its fifth feeding. Use Balikan natin after Busog na to revisit a question that needed a clue and reveal the answer for discussion.',
        'Imported / added questions now play in saved list order. Use Up / Down in Question Editor to reorder them. Excel / CSV imports keep their row order, and new single-player activities start at the first question.',
        'Question Editor now has Select all, Delete selected and Delete all for imported / teacher-added questions in the selected lesson. Search selection covers all matches, including later pages. Built-ins and other lessons are retained.',
        'After activation, the floating Activated - this device badge is hidden. Activation status and device details remain available in Settings.',
        'LAYOUT adds Pick object to clear the editor panel, hover outlines with object names, larger resize handles, and Alt-click to select an object underneath. Clicking no longer moves objects accidentally.',
        'Removed the idle answer instruction, keyboard-hint line, and feeding/score/attempt footer from Pakainin ang mga Alaga.',
        'Use Hide object / Show object in LAYOUT, or Delete while selecting an object, to hide it and restore it later. Hidden objects stay in the object list; Undo and saved layouts include their visibility.',
        'Move and resize one object without pushing nearby objects. The scene background, character, pet, food bowl, and question-box background are separate editable layers.',
        'Resizing text or a button keeps its original space in the layout. Save, Undo/Redo, Reset, and Cancel work with the independent object positions.',
        'Feed the puppy with a blue food bowl. The puppy becomes happy after feeding, grows with correct answers, and looks sad when hungry.',
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
