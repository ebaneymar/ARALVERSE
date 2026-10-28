'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const {chromium}=require(process.env.ARALVERSE_PLAYWRIGHT||'playwright');
const {LicenseManager,TRIAL_MS,SIGNING_PREFIX,makeDeviceCode}=require('../src/license-engine.cjs');
(async()=>{
 const root=path.resolve(process.argv[2]||'aralverse_1581/app'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'aralverse-ui-test-'));
 const pair=crypto.generateKeyPairSync('ed25519');let clock=Date.UTC(2026,9,28,12),copyCount=0,dataCount=0;
 const service=new LicenseManager({identity:'activation-ui-test',roots:[path.join(temporary,'license')],registry:null,now:()=>clock,publicKey:pair.publicKey});
 function sign(deviceCode){const payload={schema:1,app:'ARALVERSE',deviceCode,licenseId:crypto.randomUUID(),issuedAt:clock,expiresAt:null},body=Buffer.from(JSON.stringify(payload)).toString('base64url');return 'AV1.'+body+'.'+crypto.sign(null,Buffer.from(SIGNING_PREFIX+body),pair.privateKey).toString('base64url')}
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/__license/')){
   let value;if(url.pathname.endsWith('/status'))value=service.getStatus();
   else if(url.pathname.endsWith('/activate')){const chunks=[];for await(const chunk of req)chunks.push(chunk);value=service.activate(JSON.parse(Buffer.concat(chunks)).key)}
   else if(url.pathname.endsWith('/copy')){copyCount++;value={ok:true}}
   else{dataCount++;value={ok:true}}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return;
  }
  let target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(url.pathname==='/owner-manager.html'&&process.env.ARALVERSE_OWNER_MANAGER)target=path.resolve(process.env.ARALVERSE_OWNER_MANAGER);
  else if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
  res.setHeader('Content-Type',target.endsWith('.html')?'text/html; charset=utf-8':target.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream');fs.createReadStream(target).on('error',()=>{res.statusCode=404;res.end()}).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.ARALVERSE_BROWSER?{executablePath:process.env.ARALVERSE_BROWSER}:{})});
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   if(window.top!==window)return;
   const request=(route,data)=>fetch('/__license/'+route,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{}).then(r=>r.json());
   window.mathAPangDesktop={isDesktop:true,activation:{status:()=>request('status'),activate:key=>request('activate',{key}),copyDeviceCode:()=>request('copy')},openDataFolder:()=>request('data'),exit(){},updater:{info:async()=>({version:'1.5.81',configured:true,config:{manifestUrl:'https://example.invalid/update-manifest.json',autoCheck:false}}),check:async()=>({ok:true,status:'current',currentVersion:'1.5.81'}),onProgress:()=>()=>{}}};
  });
  const url='http://127.0.0.1:'+server.address().port;await page.goto(url+'/game.html');await page.waitForFunction(()=>window.AVActivation1581?.getStatus().state==='trial');
  assert.equal(await page.locator('#avImageUpdate').evaluate(e=>e.nextElementSibling.id),'avActivationSettings1581','Activation follows Check for Updates');
  assert.match(await page.locator('#avActivationBadge1581').textContent(),/7 days left/);
  await page.evaluate(()=>ARAL_STORAGE.setItem('activation-test-classroom','unchanged'));
  await page.evaluate(()=>launchGame('tournament'));await page.waitForFunction(()=>!!document.getElementById('gameFrame').contentWindow?.AVLayoutEditor1580);assert.equal(await page.locator('#gameShell').isVisible(),true,'Trial allows games');
  const frame=page.frames().find(f=>f.parentFrame());await frame.waitForSelector('#tournamentSetup.active');
  await frame.evaluate(()=>{
   roster=[{id:'trial-a',name:'Ana',image:MQ_BATTLE_PLACEHOLDER},{id:'trial-b',name:'Ben',image:MQ_BATTLE_PLACEHOLDER}];
   blue=[{...roster[0],hp:100}];red=[{...roster[1],hp:100}];bi=ri=0;round=1;paused=false;locked=false;show('battle');update();begin();
  });await frame.waitForSelector('#battle.active');await frame.waitForFunction(()=>AVLayoutEditor1580.screen==='battle');
  clock+=TRIAL_MS+1;await page.evaluate(()=>AVActivation1581.refresh());await page.waitForSelector('#avActivationDialog1581[open]');
  assert.equal(await frame.evaluate(()=>paused),true,'An expiring trial pauses the running match');
  assert.equal(await page.locator('#avActClose1581').isEnabled(),false,'Expired game remains gated');
  await page.locator('#avActData1581').click();assert.equal(dataCount,1,'Saved data stays accessible');
  await page.locator('#avActCopy1581').click();assert.equal(copyCount,1);
  await page.locator('#avActKey1581').fill(sign(makeDeviceCode('wrong-device')));await page.locator('#avActSubmit1581').click();await page.waitForFunction(()=>document.getElementById('avActMessage1581').textContent.includes('different device'));
  await page.screenshot({path:path.join(temporary,'activation-preview.png')});
  if(process.env.ARALVERSE_UI_SCREENSHOT)fs.copyFileSync(path.join(temporary,'activation-preview.png'),process.env.ARALVERSE_UI_SCREENSHOT);
  await page.locator('#avActUpdate1581').click();await page.waitForSelector('#mqUpdateOverlay.show');assert.equal(await page.locator('#avActivationDialog1581').isVisible(),false,'Updater can open while expired');
  await page.evaluate(()=>{document.getElementById('mqUpdateOverlay').classList.remove('show');AVActivation1581.open(false)});await page.waitForSelector('#avActivationDialog1581[open]');
  await page.locator('#avActKey1581').fill(sign(service.deviceCode));await page.locator('#avActSubmit1581').click();await page.waitForFunction(()=>AVActivation1581.getStatus().activated);
  assert.equal(await page.locator('#avActClose1581').isEnabled(),true);assert.equal(service.getStatus().activated,true);
  assert.equal(await frame.evaluate(()=>paused),true,'Activation does not resume a match behind the dialog');
  await page.locator('#avActClose1581').click();await frame.waitForFunction(()=>!paused,null,{timeout:2000});
  assert.equal(await frame.evaluate(()=>paused),false,'Closing the activated dialog resumes play');
  await page.evaluate(()=>returnToModes());await page.evaluate(()=>launchGame('pve'));await page.waitForFunction(()=>!!document.getElementById('gameFrame').contentWindow?.AVLayoutEditor1580);assert.equal(await page.locator('#gameShell').isVisible(),true,'Activation unlocks play');
  await page.reload();await page.waitForFunction(()=>window.AVActivation1581?.getStatus().activated);assert.match(await page.locator('#avActivationBadge1581').textContent(),/Activated/);
  assert.equal(await page.evaluate(()=>ARAL_STORAGE.getItem('activation-test-classroom')),'unchanged','Activation preserves classroom storage');assert.deepEqual(errors,[]);
  if(process.env.ARALVERSE_OWNER_MANAGER&&process.env.ARALVERSE_OWNER_PASSWORD_FILE){
   const owner=await browser.newPage();await owner.goto(url+'/owner-manager.html');
   const password=fs.readFileSync(process.env.ARALVERSE_OWNER_PASSWORD_FILE,'utf8').match(/Unlock password:\s*(\S+)/)[1];
   await owner.locator('#password').fill(password);await owner.locator('#unlock').click();await owner.waitForSelector('#generator:not([hidden])');
   const device=makeDeviceCode('owner-manager-interoperability');await owner.locator('#device').fill(device);await owner.locator('#generate').click();await owner.waitForFunction(()=>document.getElementById('key').value.startsWith('AV1.'));
   const issued=await owner.locator('#key').inputValue();
   const real=new LicenseManager({identity:'owner-manager-interoperability',roots:[path.join(temporary,'real-owner')],registry:null});assert.equal(real.activate(issued).ok,true,'Private owner manager and shipped public verification key match');
   await owner.locator('#lock').click();assert.equal(await owner.locator('#key').inputValue(),'');
  }
  console.log('PASS: trial and activation UI, settings position, expired-game gate, invalid/device-mismatched keys, updater/data access, permanent unlock and persistence.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temporary,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
