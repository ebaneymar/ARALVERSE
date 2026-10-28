/* Integration checks against the real packaged game, using an isolated browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.ARALVERSE_PLAYWRIGHT || 'playwright');
const near = (a,b,label) => assert.ok(Math.abs(a-b)<3,`${label}: expected ${b}, received ${a}`);

(async () => {
  const root = path.resolve(process.argv[2] || 'aralverse_1580/app');
  const server = http.createServer((req,res) => {
    const target = path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
    res.setHeader('Content-Type',target.endsWith('.html')?'text/html; charset=utf-8':target.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream');
    fs.createReadStream(target).on('error',()=>{res.statusCode=404;res.end()}).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.ARALVERSE_BROWSER?{executablePath:process.env.ARALVERSE_BROWSER}:{})});
    const page = await browser.newPage({viewport:{width:1910,height:1080}});
    page.setDefaultTimeout(20000);
    if(process.env.ARALVERSE_LICENSE_FIXTURE==='trial')await page.addInitScript(()=>{
      if(window.top!==window)return;
      window.mathAPangDesktop={isDesktop:true,activation:{status:async()=>({state:'trial',canPlay:true,activated:false,remainingDays:7,deviceCode:'AV-00000000-00000000-00000000-00000000',trialEndsAt:Date.now()+604800000}),activate:async()=>({ok:false}),copyDeviceCode:async()=>({ok:true})},updater:{info:async()=>({version:'1.5.81',configured:false,config:{autoCheck:false}}),onProgress:()=>()=>{}},openDataFolder:async()=>{},exit(){}};
    });
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url = 'http://127.0.0.1:'+server.address().port+'/game.html';
    await page.goto(url);
    await page.waitForFunction(()=>!!window.AVLayoutEditor1580);
    const roster = JSON.stringify([{id:'layout-test-a',name:'Ana'},{id:'layout-test-b',name:'Ben'}]);
    await page.evaluate(value=>{ARAL_STORAGE.setItem('mathquest_html_roster_v3',value);ARAL_STORAGE.setItem('mqExtra',value)},roster);

    async function launch(mode) {
      await page.evaluate(mode=>window.launchGame(mode),mode);
      await page.waitForFunction(()=>!!document.getElementById('gameFrame').contentWindow?.AVLayoutEditor1580);
      const frame=page.frames().find(x=>x.parentFrame());
      await frame.waitForFunction(()=>document.readyState==='complete');
      await page.waitForTimeout(450);
      return frame;
    }
    async function battle(mode='tournament') {
      const frame=await launch(mode);
      await frame.evaluate(()=>{
        roster=[{id:'layout-test-a',name:'Ana',image:MQ_BATTLE_PLACEHOLDER},{id:'layout-test-b',name:'Ben',image:MQ_BATTLE_PLACEHOLDER}];
        blue=[{...roster[0],hp:100}];red=[{...roster[1],hp:100}];bi=ri=0;round=1;paused=false;locked=false;
        show('battle');update();begin();
      });
      await frame.waitForSelector('#battle.active');
      await frame.waitForFunction(()=>AVLayoutEditor1580.screen==='battle');
      if(await frame.locator('.mq-action-attack').count())await frame.locator('.mq-action-attack').click();
      return frame;
    }
    let frame=await battle();
    const rosterBeforeLayout=await page.evaluate(()=>ARAL_STORAGE.getItem('mqExtra'));
    const original=await frame.locator('#blueSide').boundingBox();assert.ok(original,'Blue player card is visible');
    await page.locator('#avleLauncher1580').click();
    await frame.waitForSelector('.avle-toolbar');
    assert.equal(await frame.evaluate(()=>paused),true,'Editing pauses the match');
    const time=await frame.locator('#timer').textContent();
    const question=await frame.locator('#question').textContent();
    const hp=await frame.evaluate(()=>[blue[0].hp,red[0].hp]);
    await page.waitForTimeout(650);
    assert.equal(await frame.locator('#timer').textContent(),time,'Question clock remains frozen');
    const dragStart={x:original.x+35,y:original.y+35};
    await page.mouse.move(dragStart.x,dragStart.y);await page.mouse.down();
    await page.mouse.move(dragStart.x-125,dragStart.y+18,{steps:8});await page.mouse.up();
    let moved=await frame.locator('#blueSide').boundingBox();
    near(moved.x,original.x-125,'Player card drag X');near(moved.y,original.y+18,'Player card drag Y');
    const handle=await frame.locator('.avle-handle[data-dir=se]').boundingBox();
    await page.mouse.move(handle.x+7,handle.y+7);await page.mouse.down();await page.mouse.move(handle.x+67,handle.y+42,{steps:8});await page.mouse.up();
    let resized=await frame.locator('#blueSide').boundingBox();near(resized.width,moved.width+60,'Card width resize');near(resized.height,moved.height+35,'Card height resize');near(resized.x,moved.x,'Resize keeps left edge');
    await frame.locator('[data-action=undo]').click();near((await frame.locator('#blueSide').boundingBox()).width,moved.width,'Undo resize');
    await frame.locator('[data-action=redo]').click();near((await frame.locator('#blueSide').boundingBox()).width,resized.width,'Redo resize');
    const x=frame.locator('[data-field=x]');await x.fill('24');await x.press('Tab');near((await frame.locator('#blueSide').boundingBox()).x,24,'Exact X position');
    await frame.locator('[data-wide]').check();
    const wide=await frame.locator('#fullscreen-wrapper').boundingBox();assert.ok(wide.width>1870,'Full width removes large side margins');
    const selected=frame.locator('.avle-toolbar select');await selected.selectOption('#redSide');
    const h=frame.locator('[data-field=h]');await h.fill('320');await h.press('Tab');near((await frame.locator('#redSide').boundingBox()).height,320,'Player card exact height');
    await selected.selectOption('#answers > button:nth-of-type(1)');
    const width=frame.locator('[data-field=w]');await width.fill('440');await width.press('Tab');
    near((await frame.locator('#answers > button').first().boundingBox()).width,440,'Answer button width');
    assert.equal(await frame.locator('#question').textContent(),question,'Editing leaves the question intact');
    assert.deepEqual(await frame.evaluate(()=>[blue[0].hp,red[0].hp]),hp,'Dragging does not submit answers or damage players');
    await frame.locator('[data-action=save]').click();assert.equal(await frame.locator('.avle-toolbar').count(),0);
    assert.equal(await page.evaluate(()=>ARAL_STORAGE.getItem('mqExtra')),rosterBeforeLayout,'Editing preserves the saved roster and photos');
    assert.equal(await frame.evaluate(()=>paused),false,'Save resumes a previously running match');
    const saved=await page.evaluate(()=>ARAL_STORAGE.getItem('avManualLayouts1580'));assert.ok(saved.includes('tournament:battle'));
    const savedBlue=await frame.locator('#blueSide').boundingBox();
    await frame.evaluate(()=>renderQ(q));await page.waitForTimeout(70);
    near((await frame.locator('#answers > button').first().boundingBox()).width,440,'Recreated answer buttons keep layout');
    await page.locator('#avleLauncher1580').click();await frame.locator('[data-action=resetAll]').click();await frame.locator('[data-action=cancel]').click();
    near((await frame.locator('#blueSide').boundingBox()).width,savedBlue.width,'Cancel restores saved layout');
    await frame.evaluate(()=>togglePause());
    await page.locator('#avleLauncher1580').click();await frame.locator('[data-action=save]').click();
    assert.equal(await frame.evaluate(()=>paused),true,'Manual pause stays paused after editing');
    await page.reload();await page.waitForFunction(()=>!!window.AVLayoutEditor1580);frame=await battle();
    near((await frame.locator('#blueSide').boundingBox()).width,savedBlue.width,'Layout survives restart');
    await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(90);
    near((await frame.locator('#blueSide').boundingBox()).width,savedBlue.width*1280/1910,'Layout scales with screen size');
    await page.setViewportSize({width:1910,height:1080});
    frame=await battle('pvp');
    const pvpBlue=await frame.locator('#blueSide').boundingBox();assert.ok(Math.abs(pvpBlue.width-savedBlue.width)>5,'Mode layouts stay separate');
    await page.locator('#avleLauncher1580').click();
    await page.evaluate(()=>{window.originalLayoutSave1580=ARAL_STORAGE.setItem;ARAL_STORAGE.setItem=function(key,value){if(key==='avManualLayouts1580')throw Error('Test storage failure');return window.originalLayoutSave1580.call(this,key,value)}});
    await frame.locator('[data-action=save]').click();assert.equal(await frame.locator('.avle-toolbar').count(),1,'Save failure keeps preview open');assert.match(await frame.locator('.avle-status').textContent(),/Could not save/);
    await page.evaluate(()=>{ARAL_STORAGE.setItem=window.originalLayoutSave1580;delete window.originalLayoutSave1580});await frame.locator('[data-action=cancel]').click();
    await frame.locator('#fullBtn').click();await frame.waitForFunction(()=>!!document.fullscreenElement);await frame.locator('.avle-frame-entry').click();
    assert.equal(await frame.locator('.avle-toolbar').isVisible(),true,'Editor works inside fullscreen');await frame.locator('[data-action=cancel]').click();await frame.evaluate(()=>document.exitFullscreen());
    frame=await launch('boss');
    await frame.evaluate(()=>{selected=roster.map(x=>x.id);startGame()});await frame.waitForSelector('#battle.active');
    await frame.waitForFunction(()=>AVLayoutEditor1580.screen==='battle');
    await page.locator('#avleLauncher1580').click();const bossTime=await frame.locator('#time').textContent();await page.waitForTimeout(1150);
    assert.equal(await frame.locator('#time').textContent(),bossTime,'Class Boss countdown pauses during editing');
    await frame.locator('[data-action=cancel]').click();
    // A resumed clock can reach its next one-second callback before a full
    // active second has elapsed. Wait for the displayed tick, not 1.1s of wall time.
    await frame.waitForFunction(previous=>document.getElementById('time').textContent!==previous,bossTime,{timeout:3500});
    assert.notEqual(await frame.locator('#time').textContent(),bossTime,'Class Boss countdown resumes');
    frame=await launch('teamTournament');await page.locator('#avleLauncher1580').click();assert.equal(await frame.locator('.avle-toolbar').count(),1,'Guardian mode supports editing');await frame.locator('[data-action=cancel]').click();
    frame=await launch('pve');await page.locator('#avleLauncher1580').click();assert.equal(await frame.locator('.avle-toolbar').count(),1,'Classic Adventure supports editing');await frame.locator('[data-action=cancel]').click();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(ARAL_STORAGE.getItem('mqExtra')).map(({id,name})=>({id,name}))),JSON.parse(roster),'Player identities remain unchanged across modes');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: player drag, eight-handle resizing, numeric controls, full width, Undo/Redo, Save/Cancel, pause, persistence, responsive sizing, answer regeneration and all battle modes.');
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
