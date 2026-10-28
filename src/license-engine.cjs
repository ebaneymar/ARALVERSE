'use strict';
// Offline licensing. Only the public verification key ships with the game.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {publicKey:PUBLIC_KEY}=require('./license-public-key.json');
const DAY_MS=86400000,TRIAL_MS=7*DAY_MS,CLOCK_TOLERANCE_MS=5*60000;
const FILE_NAME='device-license-v1.json',SIGNING_PREFIX='ARALVERSE_LICENSE_V1\n';
const DEVICE_RE=/^AV-(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/;
function digest(value){return crypto.createHash('sha256').update(String(value)).digest()}
function makeDeviceCode(identity){return 'AV-'+digest('ARALVERSE_DEVICE_V1|'+identity).toString('hex').slice(0,32).toUpperCase().match(/.{8}/g).join('-')}
function command(exe,args){try{const r=spawnSync(exe,args,{encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:65536});return r.status===0?String(r.stdout||'').trim():''}catch(_){return ''}}
function detectDeviceIdentity(preferredCodes=[]){
  if(process.platform==='win32'){
    const guid=command('reg.exe',['query','HKLM\\SOFTWARE\\Microsoft\\Cryptography','/v','MachineGuid']).split(/REG_SZ\s+/)[1]?.trim();
    const fallback=guid?'windows:'+guid.toLowerCase():'';
    // Keep a previously selected Windows identity when firmware access recovers.
    if(fallback&&preferredCodes.includes(makeDeviceCode(fallback)))return fallback;
    const uuid=command('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command','(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID']).toUpperCase();
    if(/^[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/.test(uuid)&&!/^0+(?:-0+)*$/.test(uuid)&&!/^F+(?:-F+)*$/.test(uuid))return 'smbios:'+uuid;
    if(fallback)return fallback;
  }
  if(process.platform==='darwin'){
    const data=command('ioreg',['-rd1','-c','IOPlatformExpertDevice']);
    const uuid=data.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/)?.[1];if(uuid)return 'mac:'+uuid;
  }
  for(const name of ['/etc/machine-id','/var/lib/dbus/machine-id'])try{const id=fs.readFileSync(name,'utf8').trim();if(id)return 'machine:'+id}catch(_){}
  const macs=Object.values(os.networkInterfaces()).flat().filter(x=>x&&!x.internal&&x.mac&&x.mac!=='00:00:00:00:00:00').map(x=>x.mac).sort();
  if(macs.length)return 'fallback:'+os.hostname()+'|'+macs.join('|');
  throw Error('Could not read a stable device identity. Restart Windows and try again.');
}
function windowsRegistryStore(){
  if(process.platform!=='win32')return null;
  const key='HKCU\\Software\\ARALVERSE\\Licensing';
  return {
    read(){return command('reg.exe',['query',key,'/v','StateV1']).split(/REG_SZ\s+/)[1]?.trim()||null},
    write(value){return !!command('reg.exe',['add',key,'/v','StateV1','/t','REG_SZ','/d',value,'/f'])}
  };
}
function verifyActivationKey(input,deviceCode,publicKey=PUBLIC_KEY,now=Date.now()){
  const key=String(input||'').replace(/\s+/g,'');
  if(key.length>4096)throw Error('The activation key is too long.');
  const parts=key.split('.');
  if(parts.length!==3||parts[0]!=='AV1'||!/^[A-Za-z0-9_-]+$/.test(parts[1])||!/^[A-Za-z0-9_-]{86}$/.test(parts[2]))throw Error('Enter a valid ARALVERSE activation key.');
  if(!crypto.verify(null,Buffer.from(SIGNING_PREFIX+parts[1]),publicKey,Buffer.from(parts[2],'base64url')))throw Error('This activation key is not valid.');
  let data;try{data=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'))}catch(_){throw Error('This activation key is not valid.')}
  if(data.app!=='ARALVERSE'||data.schema!==1||typeof data.licenseId!=='string'||!data.licenseId||data.licenseId.length>100)throw Error('This key is not for ARALVERSE.');
  if(!DEVICE_RE.test(data.deviceCode)||data.deviceCode!==deviceCode)throw Error('This key belongs to a different device. Copy the device code shown here and request a matching key.');
  if(!Number.isFinite(data.issuedAt)||data.issuedAt<0)throw Error('This activation key is not valid.');
  if(data.expiresAt!==null&&(!Number.isFinite(data.expiresAt)||data.expiresAt<=now))throw Error('This activation key has expired.');
  return {key,licenseId:data.licenseId,issuedAt:data.issuedAt,expiresAt:data.expiresAt};
}
class LicenseManager {
  constructor(options){
    this.now=options.now||Date.now;this.publicKey=options.publicKey||PUBLIC_KEY;
    const identity=options.identity||detectDeviceIdentity();this.deviceCode=makeDeviceCode(identity);
    this.macKey=digest('ARALVERSE_STATE_V1|'+identity);this.roots=[...new Set(options.roots||[])];
    this.registry=options.registry===undefined?windowsRegistryStore():options.registry;
    this.lastPersisted=0;this.storageError=false;this.corrupt=false;
    const found=this.readRecords();
    if(found.records.length)this.state=this.merge(found.records);
    else{this.corrupt=found.seen;const now=this.now();this.state={schema:1,deviceCode:this.deviceCode,trialStartedAt:now,lastSeenAt:now,activationKey:''}}
    if(!this.corrupt&&!this.persist())this.storageError=true;
  }
  payload(state){return {schema:1,deviceCode:this.deviceCode,trialStartedAt:state.trialStartedAt,lastSeenAt:state.lastSeenAt,activationKey:state.activationKey||''}}
  encode(state){const data=this.payload(state);const mac=crypto.createHmac('sha256',this.macKey).update(JSON.stringify(data)).digest('hex');return JSON.stringify({...data,mac})}
  decode(raw){
    const data=JSON.parse(raw);
    if(data.schema!==1||data.deviceCode!==this.deviceCode||!Number.isFinite(data.trialStartedAt)||!Number.isFinite(data.lastSeenAt)||data.trialStartedAt<0||data.lastSeenAt<data.trialStartedAt||typeof data.activationKey!=='string'||data.activationKey.length>4096||!/^[a-f0-9]{64}$/.test(data.mac||''))throw Error('Invalid license state');
    const expected=crypto.createHmac('sha256',this.macKey).update(JSON.stringify(this.payload(data))).digest();
    if(!crypto.timingSafeEqual(expected,Buffer.from(data.mac,'hex')))throw Error('License state was modified');
    return this.payload(data);
  }
  readRecords(){
    const records=[];let seen=false;
    for(const root of this.roots)for(const suffix of ['', '.bak']){
      const file=path.join(root,FILE_NAME+suffix);if(!fs.existsSync(file))continue;seen=true;
      try{records.push(this.decode(fs.readFileSync(file,'utf8')))}catch(_){}
    }
    try{const raw=this.registry?.read();if(raw){seen=true;records.push(this.decode(raw))}}catch(_){}
    return {records,seen};
  }
  validKey(key){try{return verifyActivationKey(key,this.deviceCode,this.publicKey,this.now())}catch(_){return null}}
  merge(records){
    const result=this.payload(records[0]);
    result.trialStartedAt=Math.min(...records.map(x=>x.trialStartedAt));result.lastSeenAt=Math.max(...records.map(x=>x.lastSeenAt));
    const valid=records.map(x=>this.validKey(x.activationKey)).filter(Boolean).sort((a,b)=>b.issuedAt-a.issuedAt);
    result.activationKey=valid[0]?.key||records.find(x=>x.activationKey)?.activationKey||'';return result;
  }
  persist(){
    // Merge other running instances before writing; an older window cannot erase an activation.
    const existing=this.readRecords().records;this.state=this.merge([this.state,...existing]);
    this.state.lastSeenAt=Math.max(this.now(),this.state.lastSeenAt);
    const raw=this.encode(this.state);let saved=0;
    for(const root of this.roots){
      let temp;
      try{
        fs.mkdirSync(root,{recursive:true});const file=path.join(root,FILE_NAME);
        temp=file+'.'+process.pid+'.'+crypto.randomBytes(4).toString('hex')+'.tmp';
        fs.writeFileSync(temp,raw,{mode:0o600});
        if(fs.existsSync(file))try{fs.copyFileSync(file,file+'.bak')}catch(_){}
        fs.renameSync(temp,file);saved++;
      }catch(_){if(temp)try{fs.rmSync(temp,{force:true})}catch(_){}}
    }
    try{if(this.registry?.write(raw))saved++}catch(_){}
    if(saved){this.lastPersisted=this.now();this.storageError=false;return true}return false;
  }
  getStatus(){
    const now=this.now();
    if(!this.corrupt&&now-this.lastPersisted>=60000&&!this.persist())this.storageError=true;
    const license=this.validKey(this.state.activationKey),endsAt=this.state.trialStartedAt+TRIAL_MS;
    const base={deviceCode:this.deviceCode,trialStartedAt:this.state.trialStartedAt,trialEndsAt:endsAt,remainingDays:Math.max(0,Math.ceil((endsAt-Math.max(now,this.state.lastSeenAt))/DAY_MS)),licenseId:license?.licenseId||null,expiresAt:license?.expiresAt??null};
    if(license)return {...base,state:'activated',canPlay:true,activated:true,remainingDays:0,message:'Activated for this device'};
    if(this.corrupt)return {...base,state:'activation_required',canPlay:false,activated:false,message:'Activation data needs attention. Enter your activation key to continue.'};
    if(this.storageError)return {...base,state:'storage_error',canPlay:false,activated:false,message:'Activation could not be saved on this device. Check folder permissions and restart ARALVERSE.'};
    if(now+CLOCK_TOLERANCE_MS<this.state.lastSeenAt)return {...base,state:'clock_error',canPlay:false,activated:false,message:'The device clock moved backwards. Set the correct date and time, or enter your activation key.'};
    const allowed=Math.max(now,this.state.lastSeenAt)<endsAt;
    return {...base,state:allowed?'trial':'expired',canPlay:allowed,activated:false,message:allowed?base.remainingDays+' day'+(base.remainingDays===1?'':'s')+' left in your free trial':'Your 7-day trial has ended. Enter an activation key to continue playing.'};
  }
  activate(input){
    let license;try{license=verifyActivationKey(input,this.deviceCode,this.publicKey,this.now())}catch(error){return {ok:false,error:error.message,status:this.getStatus()}}
    const previous={...this.state};const wasCorrupt=this.corrupt;this.state.activationKey=license.key;this.corrupt=false;
    if(!this.persist()){this.state=previous;this.corrupt=wasCorrupt;this.storageError=true;return {ok:false,error:'The key is valid, but activation could not be saved. Check folder permissions and try again.',status:this.getStatus()}}
    return {ok:true,status:this.getStatus()};
  }
}
function createDesktopLicenseManager(app){
  const roots=[];
  if(process.platform==='win32'){
    if(process.env.LOCALAPPDATA)roots.push(path.join(process.env.LOCALAPPDATA,'ARALVERSE','Licensing'));
    if(process.env.PROGRAMDATA)roots.push(path.join(process.env.PROGRAMDATA,'ARALVERSE','Licensing'));
  }
  roots.push(path.join(app.getPath('userData'),'Licensing'));
  const registry=windowsRegistryStore(),preferred=[];
  for(const root of roots)for(const suffix of ['', '.bak'])try{preferred.push(JSON.parse(fs.readFileSync(path.join(root,FILE_NAME+suffix),'utf8')).deviceCode)}catch(_){}
  try{const raw=registry?.read();if(raw)preferred.push(JSON.parse(raw).deviceCode)}catch(_){}
  return new LicenseManager({roots,identity:detectDeviceIdentity(preferred),registry});
}
module.exports={LicenseManager,createDesktopLicenseManager,makeDeviceCode,verifyActivationKey,DAY_MS,TRIAL_MS,SIGNING_PREFIX};
