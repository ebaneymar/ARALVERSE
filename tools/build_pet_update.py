"""Build the pet-feeding update from the verified published v1.5.81 app."""
import argparse
from datetime import date
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

VERSION = '1.5.82'
BASE_SHA256 = '68ec2cb186ddccf56f3487a94dce7ad07b0989caa17574a0f2fe504b1ed29022'


def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError('Unexpected base implementation: ' + old[:100])
    return text.replace(old, new, 1)


def encode(value):
    return json.dumps(value, ensure_ascii=True, separators=(',', ':')).replace('</', '<\\/')


def source(game, name):
    match = re.search(r'const ' + name + r'\s*=\s*', game)
    value, end = json.JSONDecoder().raw_decode(game, match.end())
    return value, match.end(), end


def build(base, root, output):
    raw = base.read_bytes()
    if hashlib.sha256(raw).hexdigest() != BASE_SHA256:
        raise ValueError('Use the exact published v1.5.81 base package.')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        files = {entry.filename: archive.read(entry) for entry in archive.infolist() if not entry.is_dir()}
    original_license = files['app/assets/license-engine.cjs']
    original_public_key = files['app/assets/license-public-key.json']
    game = files['app/game.html'].decode('utf-8')
    packed, start, end = source(game, 'PVE_SOURCE')
    adventure = packed['template']
    engine = re.search(r'<script id="mq-curriculum-engine-v190">([\s\S]*?)</script>', adventure)
    if not engine:
        raise ValueError('The existing curriculum engine was not found.')
    template = (root / 'src/pet-feeding.html').read_text(encoding='utf-8')
    feeding = once(template, '__AV_CURRICULUM_ENGINE__', '<script id="mq-curriculum-engine-v190">' + engine.group(1) + '</script>')
    adventure = re.sub(r'<html\b', '<html data-av-mode="pve"', adventure, count=1)
    close = adventure.rfind('</body>')
    adventure = adventure[:close] + '<script src="assets/single-player-questions-1582.js"></script>\n' + adventure[close:]
    packed['template'] = adventure
    game = game[:start] + encode(packed) + game[end:]
    index = game.index('const PVE_SOURCE')
    game = game[:index] + 'const PET_FEEDING_SOURCE = ' + encode({'avPacked1540': True, 'template': feeding}) + ';\n' + game[index:]
    game = once(game, 'mode === "pve" ? PVE_SOURCE :', 'mode === "petFeeding" ? PET_FEEDING_SOURCE : mode === "pve" ? PVE_SOURCE :')
    game = once(game, 'label.textContent = mode === "pve"', 'label.textContent = mode === "petFeeding" ? "💛 Pakainin ang mga Alaga — Single Player" : mode === "pve"')
    game = once(game, 'const modeName=mode==="pve"?"ADVENTURE":', 'const modeName=mode==="petFeeding"?"ALAGA · SINGLE PLAYER":mode==="pve"?"ADVENTURE":')
    anchor = '<button class="mode-card pvp-card" style="--av-i:1" onclick="showTeamModeMenu()">'
    tile = '''<button type="button" id="petFeedingMode1582" class="mode-card av-pet-mode1582" style="--av-i:1" onclick="launchGame('petFeeding')">
<span class="mode-icon" aria-hidden="true">💛</span><strong>PAKAININ ANG MGA ALAGA</strong><small>Sagutin, magpakain, at palakihin ang alaga. Pumili ng tauhan at gamitin ang sariling mga tanong.</small><span class="badges"><span class="badge">Single Player</span><span class="badge">Growing Pets</span><span class="badge">Import Questions</span></span><span class="mode-play">PLAY →</span></button>
'''
    game = once(game, anchor, tile + anchor)
    marker = re.search(r'<script id="av-question-editor-v1551">([\s\S]*?)</script>', game)
    editor = marker.group(1)
    editor = once(editor, 'function nextQuestion(original,win){', 'function nextQuestion(original,win,options){')
    editor = once(editor, "if(getSource(selection,data)==='builtin'){", "if((options?.source||getSource(selection,data))==='builtin'){")
    editor = once(editor, '  revision++;\n  try{window.mathAPangDesktop', "  revision++;\n  window.dispatchEvent(new CustomEvent('avquestionschanged1582'));\n  try{window.mathAPangDesktop")
    editor = once(editor, 'if(additions.length)mutate(s,state=>state.manual.push(...additions));', "if(additions.length){mutate(s,state=>state.manual.push(...additions));window.dispatchEvent(new CustomEvent('avquestionsimported1582',{detail:{lesson:s,added:additions.length}}));}")
    editor = once(editor, 'function assertLivePool(data){', '''function assertLivePool(data){
  let singlePlayer=false;
  try{singlePlayer=!!document.getElementById('gameFrame')?.contentWindow?.AVSinglePlayerQuestions1582?.isActiveEdited()}catch(_){}
  if(singlePlayer&&!editedRows(currentSelection(),data).length)throw Error('Keep at least one imported / edited question while this activity is running, or finish the activity first.');''')
    editor = once(editor, 'function openEditor(){\n  if(dialog.open)return;', '''function openEditor(){
  if(dialog.open)return;
  try{const fw=document.getElementById('gameFrame')?.contentWindow;if(fw?.AVQECanOpen1582&&!fw.AVQECanOpen1582()){alert('Please wait for the current action to finish before opening questions.');return}}catch(_){}''')
    # On a fresh launch the hidden lesson controls can still have their defaults.
    # Single Player imports must use the activity's saved lesson instead.
    editor = once(editor, "  selected={term:term?.value||'1',subject:CURRICULUM.subjects[subject?.value]?subject.value:'math',topic:topic?.value||''};", """  selected={term:term?.value||'1',subject:CURRICULUM.subjects[subject?.value]?subject.value:'math',topic:topic?.value||''};
  try{if(document.getElementById('gameFrame')?.contentWindow?.AVSinglePlayerQuestions1582){const current=currentSelection();selected={...current,subject:CURRICULUM.subjects[current.subject]?current.subject:'math'}}}catch(_){}""")
    editor = once(editor, "if(mode==='tournament'){", "if(['tournament','pve','petFeeding'].includes(mode)){")
    editor = editor.replace('Teacher questions for Tournament', 'Teacher questions for Single Player and Tournament')
    editor = editor.replace('Choose Use Edited Questions in Tournament setup to play them.', 'Choose Imported / Edited Questions in Single Player, or Edited Questions in Tournament, to play them.')
    editor = editor.replace('Choose Use Edited Questions under Tournament Questions in Tournament setup to play saved edits and teacher-added questions.', 'Choose a lesson, then import or edit its questions. Select Imported / Edited Questions in Single Player or Edited Questions in Tournament to use them.')
    editor = editor.replace('Use Edited Questions plays this saved version in Tournament.', 'Imported / Edited Questions plays this version in Single Player; Edited Questions plays it in Tournament.')
    game = game[:marker.start(1)] + editor + game[marker.end(1):]
    game = game.replace('1.5.81', VERSION)
    files['app/game.html'] = game.encode('utf-8')
    files['app/main.js'] = files['app/main.js'].replace(b'"1.5.81"', b'"1.5.82"')
    package = json.loads(files['app/package.json']); package['version'] = VERSION
    files['app/package.json'] = (json.dumps(package, indent=2) + '\n').encode()
    for source_name, target in [('single-player-questions.js','single-player-questions-1582.js'),('pet-feeding.js','pet-feeding-1582.js')]:
        files['app/assets/' + target] = (root / 'src' / source_name).read_bytes()
    for name in ['nina-back-1582.webp', 'pet-feeding-1582.webp']:
        files['app/assets/' + name] = (root / 'src/assets' / name).read_bytes()
    # Preserve existing layouts, while keeping live meter fills out of resize selection.
    layout = files['app/assets/layout-editor-1580.js'].decode('utf-8')
    layout = once(layout, "el.matches('#blueHp,#redHp,#hpFill,", "el.matches('#petEnergyFill,#petHungerFill,#blueHp,#redHp,#hpFill,")
    files['app/assets/layout-editor-1580.js'] = layout.encode('utf-8')
    assert files['app/assets/license-engine.cjs'] == original_license
    assert files['app/assets/license-public-key.json'] == original_public_key
    files['UPLOAD_INSTRUCTIONS.txt'] = b'ARALVERSE 1.5.82\nPublish this ZIP and its exact update-manifest.json together.\nNew mode: Pakainin ang mga Alaga. Nina is a selectable character, alongside teacher-added characters.\nCorrect answers feed and grow the pet. Imported / Edited Questions are available in both Single Player activities.\nDevice licensing, saved classroom data, and existing modes are retained.\n'
    output.mkdir(parents=True, exist_ok=True)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in files.items():
            info = zipfile.ZipInfo(name, date_time=(2026,11,11,0,0,0)); info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compresslevel=9)
    raw = buffer.getvalue(); path = output / f'ARALVERSE_Update_{VERSION}.zip'; path.write_bytes(raw)
    digest = hashlib.sha256(raw).hexdigest()
    manifest = {'app':'ARALVERSE','version':VERSION,'published':str(date.today()),'packageType':'app',
      'downloadUrl':f'https://raw.githubusercontent.com/ebaneymar/ARALVERSE/main/{path.name}?sha256={digest}',
      'sha256':digest,'size':len(raw),'notes':[
       'New Single Player mode: Pakainin ang mga Alaga. Choose a puppy, owl, or carabao; correct answers feed the pet, make it jump happily, and help it grow until Busog.',
       'Choose Nina in her story outfit (yellow shirt, blue shorts, yellow hair bow, brown sandals), viewed from behind, or add a different character and activity name.',
       'Import Excel/CSV questions from both Classic Adventure and the new feeding activity. Built-in and imported/edited question sources are selectable per activity and lesson.',
       'The existing device trial, activation, classroom saves, questions, other game modes, and manual layout editor are retained.'
      ]}
    (output / 'update-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        assert archive.testzip() is None
        assert not any(any(word in name.lower() for word in ['password','owner-key','private-key']) for name in archive.namelist())
    print(json.dumps({'version':VERSION,'package':str(path),'size':len(raw),'sha256':digest}))


if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', type=Path, default=root / 'ARALVERSE_Update_1.5.81.zip')
    parser.add_argument('--output', type=Path, default=root)
    args = parser.parse_args(); build(args.base, root, args.output)
