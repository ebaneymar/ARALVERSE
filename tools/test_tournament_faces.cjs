'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const fixture='data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,'fixtures/tournament-portrait.webp')).toString('base64');

async function verifyTournament(page) {
  await page.evaluate(()=>launchGame('tournament'));
  await page.waitForFunction(()=>document.getElementById('gameFrame').contentDocument?.readyState==='complete'&&document.getElementById('gameFrame').contentWindow?.AVTournamentPlayers1594);
  const f=page.frames().find(frame=>frame.parentFrame());
  const second=await f.evaluate(async url=>{
    const img=new Image();img.src=url;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    ctx.fillStyle='#432d22';ctx.beginPath();ctx.arc(img.width*.58,img.height*.57,3,0,2*Math.PI);ctx.fill();
    return canvas.toDataURL('image/png');
  },fixture);
  await f.evaluate(async image=>{
    await fetch('/api/roster/save',{method:'POST',body:JSON.stringify({roster:[{id:'test-1',name:'Manlalaro A',image},{id:'test-2',name:'Manlalaro B',image:''}]})});
    await mqDiskLoadTournamentRoster();
  },fixture);
  await f.locator('#tournamentSetup.active').waitFor();
  const card=id=>f.locator('.t-player-card[data-student-id="'+id+'"]');
  await card('test-1').getByRole('button',{name:/Iayos ang mukha/}).click();
  await f.locator('#avFacePreview[data-face-state=ready]').waitFor({timeout:25000});
  assert.equal(await f.locator('#avFaceZoom').isVisible(),true);
  if(process.env.ARALVERSE_TOURNAMENT_SHOTS)await page.screenshot({path:process.env.ARALVERSE_TOURNAMENT_SHOTS+'-fit.png'});
  await f.locator('#avFaceLook').selectOption('teal');await f.locator('#avFaceSave').click();
  await card('test-2').getByRole('button',{name:/Iayos ang mukha/}).click();
  await f.locator('#avFacePreview[data-face-state=missing]').waitFor();
  await f.locator('#avPackPanel summary').click();
  await f.locator('#avPackFile').setInputFiles({name:'class-photos.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'ARALVERSE_CLASS_PHOTOS',version:1,photos:[{label:'Test photo',image:second}]}))});
  await f.locator('#avPackGrid button').click();await f.locator('#avFacePreview[data-face-state=ready]').waitFor();
  await f.locator('#avFaceLook').selectOption('yellow');await f.locator('#avFacePreview[data-face-state=ready]').waitFor();
  const autoPins=await f.evaluate(async url=>{const api=AVTournamentPortraits1594;return (await api.fit(await api.photo(url))).pins;},second);
  const src=f.locator('#avFaceSource');
  await f.locator('#avFaceManual').click();
  const rect=await src.boundingBox();
  for(const [x,y] of autoPins)await src.click({position:{x:rect.width*x,y:rect.height*y}});
  await f.locator('#avFacePreview[data-face-state=ready]').waitFor();await f.locator('#avFaceSave').click();
  await f.locator('#avFaceDialog1594').waitFor({state:'hidden'});
  const stored=await f.evaluate(()=>({a:roster[0].image,b:roster[1].image,fit:JSON.parse(ARAL_STORAGE.getItem('avTournamentAppearance1594:test-2'))}));
  assert.equal(stored.a,fixture);assert.equal(stored.b,second);assert.equal(stored.fit.pins.length,5);assert.equal(stored.fit.look,'yellow');
  for(const id of ['test-1','test-2']){await card(id).focus();await card(id).press('Enter');}
  await f.locator('#tShuffleBracket').uncheck();await f.locator('#tStartTournament').click();
  await f.locator('#tournamentBracket.active').waitFor();await f.locator('#tNextMatch').click();
  await f.locator('#battle.active').waitFor();
  await f.locator('#bluePhoto[data-face-state=ready]').waitFor();await f.locator('#redPhoto[data-face-state=ready]').waitFor();
  await f.evaluate(()=>stopTimer());
  for(const [side,id,name] of [['blue','test-1','Manlalaro A'],['red','test-2','Manlalaro B']]){
    const actor=f.locator('#'+side+'Photo');assert.equal(await actor.getAttribute('data-player-id'),id);
    const info=await actor.evaluate(e=>({w:e.naturalWidth,h:e.naturalHeight,fit:getComputedStyle(e).objectFit,border:getComputedStyle(e).borderTopWidth}));
    assert.ok(info.h>2*info.w);assert.equal(info.fit,'contain');assert.equal(info.border,'0px');
    assert.match(await f.locator('#'+side+'Name').textContent(),new RegExp(name));
    assert.match(await f.locator('#'+side+'HpText').textContent(),/100/);
  }
  assert.ok(await f.locator('#answers button').first().isVisible());
  if(process.env.ARALVERSE_TOURNAMENT_SHOTS)await page.screenshot({path:process.env.ARALVERSE_TOURNAMENT_SHOTS+'-battle.png'});
  const original=await f.locator('#redPhoto').getAttribute('src');
  await f.evaluate(()=>{const a=blue[0];blue=[red[0]];red=[a];blue[0].hp=65;update();});
  await f.locator('#redPhoto[data-player-id="test-1"][data-face-state=ready]').waitFor();
  assert.notEqual(await f.locator('#redPhoto').getAttribute('src'),original);assert.match(await f.locator('#blueHpText').textContent(),/65/);
  await f.evaluate(()=>{blue=[{id:'empty',name:'Bagong manlalaro',image:'',hp:100}];update();});
  await f.locator('#bluePhoto[data-face-state=missing]').waitFor();assert.ok(await f.locator('#blueFaceNote1594').isVisible());
  return f;
}
module.exports={verifyTournament};
if(require.main===module)(async()=>{
  const {chromium}=require(process.env.ARALVERSE_PLAYWRIGHT||'playwright');
  const root=path.resolve(process.argv[2]);
  const server=http.createServer((req,res)=>{
    const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream'));
    fs.createReadStream(file).on('error',()=>res.writeHead(404).end()).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.ARALVERSE_BROWSER?{executablePath:process.env.ARALVERSE_BROWSER}:{})});
    const page=await browser.newPage({viewport:{width:1366,height:768}});page.setDefaultTimeout(12000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{if(window===window.top)window.mathAPangDesktop={isDesktop:true,saveNow:async()=>({ok:true}),activation:{status:async()=>({state:'trial',canPlay:true,activated:false,remainingDays:7})},updater:{info:async()=>({version:'1.5.94',configured:false,config:{autoCheck:false}}),onProgress:()=>()=>{}}};});
    await page.goto('http://127.0.0.1:'+server.address().port+'/game.html');await page.waitForFunction(()=>window.AVActivation1581?.getStatus().canPlay);
    await page.evaluate(()=>ARAL_STORAGE.setItem('mqCurriculumSelectionV190',JSON.stringify({term:'2',subject:'math',topic:'m2_subtraction'})));
    await verifyTournament(page);assert.deepEqual(errors,[]);
    console.log('PASS: roster photo assignments, offline landmarks, five-point adjustment, both full-body players, swaps, HP, questions and missing-photo fallback.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
