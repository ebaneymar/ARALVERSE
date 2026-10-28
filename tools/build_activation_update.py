"""Package the public game update. Never reads or packages an owner private key."""
import argparse
import hashlib
import io
import json
import zipfile
from datetime import date
from pathlib import Path

VERSION='1.5.81'
BASE_SHA256='c5045907340f9803db16d506b9783f6200c6338b7067d1811b3dbab970cfa3be'


def once(text, old, new):
    if text.count(old)!=1:
        raise ValueError('Unexpected base implementation: '+old[:80])
    return text.replace(old,new,1)


def build(base, root, output):
    raw=base.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=BASE_SHA256:
        raise ValueError('Use the exact published ARALVERSE 1.5.80 base package.')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        files={i.filename:archive.read(i) for i in archive.infolist() if not i.is_dir()}
    game=files['app/game.html'].decode().replace('1.5.80',VERSION)
    end=game.rfind('</body>')
    game=game[:end]+'<script src="assets/activation-ui-1581.js"></script>\n'+game[end:]
    files['app/game.html']=game.encode()
    main=files['app/main.js'].decode().replace('"1.5.80"','"1.5.81"')
    main=once(main,'const {app, BrowserWindow, ipcMain, shell} = require("electron");','const {app, BrowserWindow, ipcMain, shell, clipboard} = require("electron");')
    main=once(main,'let mainWindow=null;', '''let mainWindow=null;
let activationManager1581=null;
const {createDesktopLicenseManager}=require('./assets/license-engine.cjs');
function activationManager(){
  if(!activationManager1581)activationManager1581=createDesktopLicenseManager(app);
  return activationManager1581;
}
function activationSender1581(event){
  if(!mainWindow||event.sender!==mainWindow.webContents)throw Error('Activation is only available in the ARALVERSE window.');
}
ipcMain.handle('aralverse:activation-status',event=>{activationSender1581(event);return activationManager().getStatus()});
ipcMain.handle('aralverse:activation-key',(event,key)=>{activationSender1581(event);return activationManager().activate(key)});
ipcMain.handle('aralverse:activation-copy',event=>{activationSender1581(event);clipboard.writeText(activationManager().deviceCode);return {ok:true}});
app.on('before-quit',()=>{if(activationManager1581&&!activationManager1581.corrupt)activationManager1581.persist()});''')
    files['app/main.js']=main.encode()
    preload=files['app/preload.js'].decode()
    preload=once(preload,'  isDesktop:true,','''  isDesktop:true,
  activation:{
    status:()=>ipcRenderer.invoke('aralverse:activation-status'),
    activate:key=>ipcRenderer.invoke('aralverse:activation-key',String(key||'')),
    copyDeviceCode:()=>ipcRenderer.invoke('aralverse:activation-copy')
  },''')
    files['app/preload.js']=preload.encode()
    pkg=json.loads(files['app/package.json']);pkg['version']=VERSION
    files['app/package.json']=(json.dumps(pkg,indent=2)+'\n').encode()
    for source,target in [('license-engine.cjs','license-engine.cjs'),('license-public-key.json','license-public-key.json'),('activation-ui.js','activation-ui-1581.js')]:
        files['app/assets/'+target]=(root/'src'/source).read_bytes()
    files['UPLOAD_INSTRUCTIONS.txt']=b'ARALVERSE 1.5.81\nPublish the generated ZIP and matching update-manifest.json together.\nEach device starts one 7-day trial on its first run of this version.\nSettings > Game & Updates > Activation Key appears immediately below Check for Updates.\nDevice-specific permanent keys are issued using the separate private owner manager.\nNever publish the owner manager, its password, or private signing material.\nTrial and activation records live outside the portable game folder and are retained through updates.\nPlayer data is not deleted or modified by activation.\n'
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in files.items():archive.writestr(name,data)
    raw=buffer.getvalue();output.mkdir(parents=True,exist_ok=True)
    package=output/f'ARALVERSE_Update_{VERSION}.zip';package.write_bytes(raw)
    sha=hashlib.sha256(raw).hexdigest()
    manifest={'app':'ARALVERSE','version':VERSION,'published':str(date.today()),'packageType':'app',
      'downloadUrl':f'https://raw.githubusercontent.com/ebaneymar/ARALVERSE/main/{package.name}?sha256={sha}',
      'sha256':sha,'size':len(raw),'notes':[
       'Each device starts one 7-day trial the first time it runs v1.5.81. Updates retain the original trial and activation; they do not start a new trial.',
       'Activation Key is directly below Check for Updates in Settings. Copy the device code, request a matching key from your ARALVERSE provider, then paste it to activate this device permanently.',
       'When the trial ends, activation is required to play. Updates and saved-data access remain available. Existing players, photos, progress, questions, artwork and the v1.5.80 layout editor are preserved.'
      ]}
    (output/'update-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        assert archive.testzip() is None
        assert not any('private' in name.lower() or 'owner' in name.lower() or 'password' in name.lower() for name in archive.namelist())
    print(json.dumps({'package':str(package),'size':len(raw),'sha256':sha}))


if __name__=='__main__':
    root=Path(__file__).resolve().parent.parent
    parser=argparse.ArgumentParser();parser.add_argument('--base',type=Path,default=root/'ARALVERSE_Update_1.5.80.zip');parser.add_argument('--output',type=Path,default=root)
    args=parser.parse_args();build(args.base,root,args.output)
