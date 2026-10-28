"""Build ARALVERSE 1.5.80 from the published 1.5.79 package, preserving artwork."""
import argparse
import hashlib
import io
import json
import re
import zipfile
from datetime import date
from pathlib import Path

VERSION = '1.5.80'
BASE_SHA256 = '9cb990aec74cf0a586d5dcc7c63cc3fbd66f2563fb74051ab679fb18ee64a722'


def build(base, editor, destination):
    raw = base.read_bytes()
    if hashlib.sha256(raw).hexdigest() != BASE_SHA256:
        raise ValueError('The base package does not match published ARALVERSE 1.5.79.')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        files = {i.filename: archive.read(i) for i in archive.infolist() if not i.is_dir()}
    game = files['app/game.html'].decode('utf-8')
    marker = re.search(r'const BOSS_SOURCE\s*=\s*', game)
    start = marker.end()
    packed, count = json.JSONDecoder().raw_decode(game[start:])
    boss = packed['template']
    boss = boss.replace('let roster=[],selected=[]', 'let avBossLayoutPaused1580=false,avBossLayoutPending1580=false;\nlet roster=[],selected=[]', 1)
    boss = boss.replace('function nextQuestion(){', 'function nextQuestion(){\n  if(avBossLayoutPaused1580){avBossLayoutPending1580=true;return;}', 1)
    boss = boss.replace('function answer(btn,a){', 'function answer(btn,a){\n  if(avBossLayoutPaused1580)return;', 1)
    boss = boss.replace('window.answer=function(btn,a){', 'window.answer=function(btn,a){\n    if(avBossLayoutPaused1580)return;', 1)
    old = 'const avBossDeadline=performance.now()+timeLeft*1000;clearInterval(timer);timer=setInterval(()=>{'
    new = '''let avBossDeadline=performance.now()+timeLeft*1000;
  let avLayoutStarted1580=0;
  window.AVLayoutSession1580={
    begin(){if(avBossLayoutPaused1580)return;avBossLayoutPaused1580=true;avLayoutStarted1580=performance.now()},
    end(){if(!avBossLayoutPaused1580)return;const elapsed=performance.now()-avLayoutStarted1580;avBossDeadline+=elapsed;startAt+=elapsed;avBossLayoutPaused1580=false;if(avBossLayoutPending1580){avBossLayoutPending1580=false;nextQuestion()}}
  };
  clearInterval(timer);timer=setInterval(()=>{if(avBossLayoutPaused1580)return;'''
    if boss.count(old) != 1:
        raise ValueError('Unexpected Class Boss clock implementation.')
    boss = boss.replace(old, new, 1)
    packed['template'] = boss
    # Embedded documents must never terminate the outer HTML script element.
    encoded = json.dumps(packed, ensure_ascii=True, separators=(',', ':')).replace('</', '<\\/')
    game = game[:start] + encoded + game[start+count:]
    game = game.replace('1.5.79', VERSION)
    end = game.rfind('</body>')
    game = game[:end] + '<script src="assets/layout-editor-1580.js"></script>\n' + game[end:]
    files['app/game.html'] = game.encode('utf-8')
    files['app/main.js'] = files['app/main.js'].replace(b'"1.5.79"', b'"1.5.80"')
    pkg = json.loads(files['app/package.json'])
    pkg['version'] = VERSION
    files['app/package.json'] = (json.dumps(pkg, indent=2) + '\n').encode()
    files['app/assets/layout-editor-1580.js'] = editor.read_bytes()
    files['UPLOAD_INSTRUCTIONS.txt'] = b'ARALVERSE 1.5.80\nPublish this ZIP and its exact generated update-manifest.json together.\nUse Settings / Display > Edit Layout, or the in-game LAYOUT toolbar button.\nDrag cards and boxes. Resize using corners, edges or width/height fields.\nSave stores the layout per mode and screen on this device. Cancel discards changes.\n'
    destination.mkdir(parents=True, exist_ok=True)
    package = destination / f'ARALVERSE_Update_{VERSION}.zip'
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
    data = buffer.getvalue()
    package.write_bytes(data)
    sha = hashlib.sha256(data).hexdigest()
    manifest = {
        'app': 'ARALVERSE', 'version': VERSION, 'published': str(date.today()), 'packageType': 'app',
        'downloadUrl': f'https://raw.githubusercontent.com/ebaneymar/ARALVERSE/main/{package.name}?sha256={sha}',
        'sha256': sha, 'size': len(data),
        'notes': [
            'New Move & Resize Objects setting and in-game Layout button. Drag player cards, question boxes, answer buttons, photos, HP bars and other game objects to new places.',
            'Resize from all eight handles or enter exact X, Y, width and height. Optional full width reduces empty side margins. Select whole cards or their individual parts.',
            'Save keeps a separate layout for each mode and screen on this device. Undo, Redo, Reset Object, Reset Screen and Cancel are included. Game clocks pause while editing; existing player data, questions and artwork are preserved.'
        ]
    }
    (destination / 'update-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    with zipfile.ZipFile(package) as archive:
        assert archive.testzip() is None
        for path in ['app/game.html', 'app/main.js', 'app/preload.js', 'app/package.json', 'app/assets/layout-editor-1580.js']:
            assert path in archive.namelist(), path
    print(json.dumps({'package': str(package), 'sha256': sha, 'size': len(data)}))


if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', type=Path, default=root / 'ARALVERSE_Update_1.5.79.zip')
    parser.add_argument('--editor', type=Path, default=root / 'src/layout-editor.js')
    parser.add_argument('--output', type=Path, default=root)
    args = parser.parse_args()
    build(args.base, args.editor, args.output)
