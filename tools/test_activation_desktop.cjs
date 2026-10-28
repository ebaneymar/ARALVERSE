'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {EventEmitter}=require('node:events'),{createRequire}=require('node:module');
(async()=>{
 const appDir=path.resolve(process.argv[2]||'aralverse_1581/app'),root=fs.mkdtempSync(path.join(os.tmpdir(),'aralverse-desktop-test-'));
 try{
  const handlers=new Map(),events=new Map(),app=new EventEmitter();let windowInstance,bridge,copied='';
  app.disableHardwareAcceleration=()=>{};app.commandLine={appendSwitch(){}};app.getPath=()=>path.join(root,'Profile');app.whenReady=()=>Promise.resolve();app.quit=()=>{};
  class Window extends EventEmitter{constructor(){super();windowInstance=this;this.webContents={send(){},setAudioMuted(){},setWindowOpenHandler(){},on(){}}}setMenuBarVisibility(){}loadFile(){return Promise.resolve()}maximize(){}isDestroyed(){return false}}
  Window.getAllWindows=()=>windowInstance?[windowInstance]:[];
  const electron={app,BrowserWindow:Window,ipcMain:{on:(n,f)=>events.set(n,f),handle:(n,f)=>handlers.set(n,f)},shell:{openPath:async()=>{}},clipboard:{writeText:value=>{copied=value}}};
  const mainRequire=createRequire(path.join(appDir,'main.js'));
  const context={require:name=>name==='electron'?electron:mainRequire(name),__dirname:appDir,__filename:path.join(appDir,'main.js'),Buffer,console,setTimeout,clearTimeout,process:{...process,execPath:path.join(root,'ARALVERSE.exe'),resourcesPath:path.join(root,'resources'),on(){}}};
  vm.runInNewContext(fs.readFileSync(path.join(appDir,'main.js'),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  fs.mkdirSync(path.join(root,'Data'),{recursive:true});const dataFile=path.join(root,'Data','ARALVERSE_Data.json'),saved=JSON.stringify({version:1,localStorage:{classroom:'keep my players'}});fs.writeFileSync(dataFile,saved);
  const local=new Map(),storage={get length(){return local.size},key:i=>[...local.keys()][i],getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,value)};
  const ipcRenderer={invoke:async(name,...args)=>handlers.get(name)({sender:windowInstance.webContents},...args),sendSync:(name,...args)=>{const event={sender:windowInstance.webContents};events.get(name)?.(event,...args);return event.returnValue},send(){}};
  vm.runInNewContext(fs.readFileSync(path.join(appDir,'preload.js'),'utf8'),{require:()=>({ipcRenderer,contextBridge:{exposeInMainWorld:(_name,value)=>{bridge=value}}}),localStorage:storage,window:{addEventListener(){}},console,setInterval:()=>0});
  assert.equal(typeof bridge.activation.status,'function');const status=await bridge.activation.status();assert.equal(status.state,'trial');assert.equal(status.remainingDays,7);
  await bridge.activation.copyDeviceCode();assert.equal(copied,status.deviceCode);
  assert.equal((await bridge.activation.activate('invalid')).ok,false);
  assert.throws(()=>handlers.get('aralverse:activation-status')({sender:{}}),/ARALVERSE window/,'IPC rejects other senders');
  assert.equal(fs.readFileSync(dataFile,'utf8'),saved,'Activation does not rewrite classroom data');
  assert.equal(local.get('classroom'),'keep my players');
  app.emit('before-quit');console.log('PASS: packaged main/preload activation IPC, device-code copy, sender checks and untouched classroom data.');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
