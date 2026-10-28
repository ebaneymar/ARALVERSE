'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {LicenseManager,TRIAL_MS,DAY_MS,SIGNING_PREFIX}=require('../src/license-engine.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'aralverse-license-test-'));
const pair=crypto.generateKeyPairSync('ed25519');let clock=Date.UTC(2026,9,28,12),counter=0;
function manager(id='device-a',dirs,extra={}){return new LicenseManager({identity:id,roots:dirs||[path.join(root,'case-'+counter++)],registry:null,now:()=>clock,publicKey:pair.publicKey,...extra})}
function key(deviceCode,extra={}){const data={schema:1,app:'ARALVERSE',deviceCode,licenseId:crypto.randomUUID(),issuedAt:clock,expiresAt:null,...extra},body=Buffer.from(JSON.stringify(data)).toString('base64url');return 'AV1.'+body+'.'+crypto.sign(null,Buffer.from(SIGNING_PREFIX+body),pair.privateKey).toString('base64url')}
try{
 const dirs=[path.join(root,'primary'),path.join(root,'shared')],first=manager('device-a',dirs),initial=first.getStatus();
 assert.equal(initial.state,'trial');assert.equal(initial.remainingDays,7);assert.equal(initial.canPlay,true);
 clock+=2*DAY_MS;const updated=manager('device-a',dirs);assert.equal(updated.getStatus().trialEndsAt,initial.trialEndsAt,'Update does not reset trial');
 clock=initial.trialEndsAt-1;assert.equal(updated.getStatus().canPlay,true);clock++;assert.equal(updated.getStatus().state,'expired','Trial ends at exactly seven days');
 assert.equal(updated.activate('fake-key').ok,false);assert.equal(updated.getStatus().trialEndsAt,initial.trialEndsAt);
 const valid=key(initial.deviceCode);assert.equal(updated.activate(valid).ok,true);assert.equal(updated.getStatus().activated,true);
 const other=manager('device-b');assert.equal(other.activate(valid).ok,false,'Key is device bound');assert.equal(other.getStatus().state,'trial');
 const forged=valid.split('.');forged[1]=Buffer.from(JSON.stringify({schema:1,app:'ARALVERSE',deviceCode:other.deviceCode,licenseId:'forged',issuedAt:clock,expiresAt:null})).toString('base64url');assert.equal(other.activate(forged.join('.')).ok,false,'Signature is verified');
 clock+=3650*DAY_MS;assert.equal(manager('device-a',dirs).getStatus().activated,true,'Permanent activation survives restart and later versions');
 fs.rmSync(dirs[0],{recursive:true});assert.equal(manager('device-a',dirs).getStatus().activated,true,'Secondary record restores activation');
 const d=[path.join(root,'rollback')];const before=manager('rollback',d);const seen=clock;clock-=2*DAY_MS;assert.equal(manager('rollback',d).getStatus().state,'clock_error');
 assert.equal(before.activate(key(before.deviceCode)).ok,true,'Activation is available even when the clock needs attention');clock=seen;
 const brokenDir=path.join(root,'broken');fs.mkdirSync(brokenDir);fs.writeFileSync(path.join(brokenDir,'device-license-v1.json'),'{"trialStartedAt":0}');
 const broken=manager('broken',[brokenDir]);assert.equal(broken.getStatus().canPlay,false,'Corruption does not create a new trial');assert.equal(broken.activate(key(broken.deviceCode)).ok,true,'Valid key recovers a damaged record');
 const concurrentDirs=[path.join(root,'concurrent')],old=manager('concurrent',concurrentDirs),newer=manager('concurrent',concurrentDirs);
 assert.equal(newer.activate(key(newer.deviceCode)).ok,true);old.persist();assert.equal(manager('concurrent',concurrentDirs).getStatus().activated,true,'Older running instance cannot erase activation');
 const unwritable=path.join(root,'regular-file');fs.writeFileSync(unwritable,'test');const noStorage=manager('readonly',[unwritable]);assert.equal(noStorage.getStatus().state,'storage_error');assert.equal(noStorage.activate(key(noStorage.deviceCode)).ok,false,'Failed persistence is not reported as activation');
 const expiring=manager('expires');assert.equal(expiring.activate(key(expiring.deviceCode,{expiresAt:clock-1})).ok,false);
 let registryRecord=null;const registry={read:()=>registryRecord,write:value=>{registryRecord=value;return true}};
 const reg=manager('registry',[],{registry});const regEnd=reg.getStatus().trialEndsAt;clock+=DAY_MS;assert.equal(manager('registry',[],{registry}).getStatus().trialEndsAt,regEnd,'Registry anchor retains trial');
 console.log('PASS: seven-day boundary, update/restart persistence, signatures, device binding, permanent keys, clock rollback, corruption recovery, mirrored storage, concurrent instances and save failures.');
}finally{fs.rmSync(root,{recursive:true,force:true})}
