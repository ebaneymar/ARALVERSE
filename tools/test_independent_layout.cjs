'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.ARALVERSE_PLAYWRIGHT||'playwright');
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<2,`${message}: ${actual} != ${expected}`);
(async()=>{
 const root=path.resolve(process.argv[2]);
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'application/octet-stream');
  fs.createReadStream(file).on('error',()=>{res.statusCode=404;res.end()}).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.ARALVERSE_BROWSER?{executablePath:process.env.ARALVERSE_BROWSER}:{})});
  const page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{if(window.top!==window)return;window.mathAPangDesktop={isDesktop:true,saveNow:async()=>({ok:true}),activation:{status:async()=>({state:'trial',canPlay:true,activated:false,remainingDays:7,deviceCode:'AV-00000000-00000000-00000000-00000000',trialEndsAt:Date.now()+604800000}),activate:async()=>({ok:false}),copyDeviceCode:async()=>({ok:true})},updater:{info:async()=>({version:'1.5.87',configured:false,config:{autoCheck:false}}),onProgress:()=>()=>{}},openDataFolder:async()=>({ok:true}),exit(){}}});
  await page.goto('http://127.0.0.1:'+server.address().port+'/game.html');
  await page.waitForFunction(()=>window.AVActivation1581?.getStatus().canPlay);
  await page.evaluate(()=>{
   ARAL_STORAGE.setItem('independent-classroom-sentinel','keep my classroom');
   ARAL_STORAGE.setItem('mqCurriculumSelectionV190',JSON.stringify({term:'2',subject:'math',topic:'m2_subtraction'}));
   AVQuestionEditor1551.importQuestions(AVQuestionEditor1551.currentSelection(),[{rowNumber:2,fields:{prompt:'Independent objects: 7 - 2 = ?',choices:['5','4','6'],correct:0,context:''}}]);
  });
  async function launch(mode='petFeeding'){
   await page.evaluate(mode=>launchGame(mode),mode);
   await page.waitForFunction(()=>document.getElementById('gameFrame').contentWindow?.AVLayoutEditor1580);
   const frame=page.frames().find(f=>f.parentFrame());await frame.waitForFunction(()=>document.readyState==='complete');await frame.evaluate(()=>document.fonts.ready);
   if(mode==='petFeeding'){
    await frame.evaluate(()=>AVSinglePlayerQuestions1582.setSource('edited'));await frame.locator('#petStart').click();
    await frame.waitForFunction(()=>AVLayoutEditor1580.screen==='petGame');
   }
   return frame;
  }
  let frame=await launch();
  const watched=['#petQuestionArea','#petQuestion','#petHeroActor','#petAnimalActor','#petFoodBowl','#petThought','#petEnergyMeter','#petHungerMeter','#petSummary'];
  async function rects(selectors=watched){return frame.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return[selector,{x:r.x,y:r.y,width:r.width,height:r.height}]})),selectors)}
  async function unchanged(before,label){const after=await rects(Object.keys(before));for(const selector of Object.keys(before))for(const key of ['x','y','width','height'])near(after[selector][key],before[selector][key],`${label}: ${selector} ${key}`)}
  async function edit(selector,field,value){await frame.locator('.avle-toolbar select').selectOption(selector);const input=frame.locator('[data-field='+field+']');await input.fill(String(value));await input.press('Tab');await page.waitForTimeout(50)}
  await page.locator('#avleLauncher1580').click();await frame.waitForSelector('.avle-toolbar');
  assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().paused),true);
  assert.equal(await frame.locator('.avle-toolbar select option[value="#petArena"]').textContent(),'Scene background');
  assert.equal(await frame.locator('.avle-toolbar select option[value="#petSceneCanvas"]').count(),0,'The group is not selected accidentally');
  await frame.locator('[data-groups]').check();await frame.locator('.avle-toolbar select').selectOption('#petSceneCanvas');
  await frame.locator('[data-groups]').uncheck();
  assert.equal(await frame.locator('.avle-toolbar select').inputValue(),'#petArena','Turning group editing off returns to a single object');
  const initial=await rects(),bg=await frame.locator('#petArena').boundingBox();
  await edit('#petArena','h',Math.round(bg.height+90));await unchanged(initial,'Background height');
  await edit('#petArena','w',Math.round(bg.width-130));await unchanged(initial,'Background width');
  await edit('#petArena','x',Math.round(bg.x+25));await edit('#petArena','y',Math.round(bg.y+18));await unchanged(initial,'Background move');
  await frame.locator('[data-action=undo]').click();await unchanged(initial,'Undo background move');
  await frame.locator('[data-action=redo]').click();await unchanged(initial,'Redo background move');
  await frame.locator('.avle-toolbar select').selectOption('#petArena');
  const dragRect=await frame.locator('#petArena').boundingBox(),handle=await frame.locator('.avle-handle[data-dir=se]').boundingBox();
  await page.mouse.move(handle.x+7,handle.y+7);await page.mouse.down();await page.mouse.move(handle.x-28,handle.y-18,{steps:8});await page.mouse.up();
  near((await frame.locator('#petArena').boundingBox()).width,dragRect.width-35,'Resize with a real corner handle');
  await unchanged(initial,'Dragging a background resize handle');
  const movedBg=await frame.locator('#petArena').boundingBox(),point={x:movedBg.x+movedBg.width*.5,y:movedBg.y+30};
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+12,point.y+10,{steps:8});await page.mouse.up();
  near((await frame.locator('#petArena').boundingBox()).x,movedBg.x+12,'Drag the background itself');
  await unchanged(initial,'Dragging only the background');
  await frame.locator('[data-action=reset]').click();await unchanged(initial,'Reset just the background');
  await frame.locator('[data-action=undo]').click();await unchanged(initial,'Undo background reset');
  const questionParts=await rects(['#petQuestion','#petAnswers','#petFeedback','#petSummary','#petArena','#petHeroActor','#petFoodBowl']);
  const panel=await frame.locator('#petQuestionBackdrop').boundingBox();
  await edit('#petQuestionBackdrop','h',Math.round(panel.height+65));
  await edit('#petQuestionBackdrop','w',Math.round(panel.width-80));await unchanged(questionParts,'Question backdrop resize');
  const choices=await rects(['#petAnswers button:nth-of-type(2)','#petAnswers button:nth-of-type(3)','#petFeedback','#petSummary','#petArena']);
  const a=await frame.locator('#petAnswers button').first().boundingBox();
  await edit('#petAnswers > button:nth-of-type(1)','h',Math.round(a.height+48));await unchanged(choices,'Answer height');
  await edit('#petAnswers > button:nth-of-type(1)','w',Math.round(a.width+45));await unchanged(choices,'Answer width');
  const questionBelow=await rects(['#petAnswers','#petFeedback','#petSummary']);
  await edit('#petQuestion','w',350);await unchanged(questionBelow,'Narrow question wraps without pushing answers');
  await frame.locator('[data-action=reset]').click();await unchanged(questionBelow,'Reset only the question');
  const savedBg=await frame.locator('#petArena').boundingBox();
  await frame.locator('[data-action=save]').click();assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().paused),false);
  const saved=await page.evaluate(()=>ARAL_STORAGE.getItem('avManualLayouts1580'));assert.ok(saved.includes('#petQuestionBackdrop'));
  await page.locator('#avleLauncher1580').click();await edit('#petArena','h',300);await frame.locator('[data-action=cancel]').click();
  near((await frame.locator('#petArena').boundingBox()).height,savedBg.height,'Cancel restores the saved background size');
  await page.reload();await page.waitForFunction(()=>window.AVActivation1581?.getStatus().canPlay);frame=await launch();
  near((await frame.locator('#petArena').boundingBox()).height,savedBg.height,'Independent sizes persist after restart');
  const qAfterRestart=await rects(['#petQuestionArea','#petHeroActor','#petFoodBowl']);
  await page.locator('#avleLauncher1580').click();await edit('#petArena','h',Math.round(savedBg.height-40));await unchanged(qAfterRestart,'Edit after restart');
  await frame.locator('[data-action=cancel]').click();
  assert.equal(await page.evaluate(()=>ARAL_STORAGE.getItem('independent-classroom-sentinel')),'keep my classroom');
  // A legacy question-panel entry becomes a background entry without rewriting the saved data.
  await page.evaluate(()=>ARAL_STORAGE.setItem('avManualLayouts1580',JSON.stringify({'petFeeding:petGame':{fullWidth:false,items:{'#petQuestionArea':{dx:.01,dy:0,w:.8,h:.3}}}})));
  const legacy=await page.evaluate(()=>ARAL_STORAGE.getItem('avManualLayouts1580'));
  frame=await launch();await page.locator('#avleLauncher1580').click();
  assert.ok(await frame.evaluate(()=>AVLayoutEditor1580.layout.items['#petQuestionBackdrop']));
  await frame.locator('[data-action=cancel]').click();assert.equal(await page.evaluate(()=>ARAL_STORAGE.getItem('avManualLayouts1580')),legacy,'Preview/cancel never rewrites old saved layouts');
  frame=await launch('tournament');
  await frame.evaluate(()=>{roster=[{id:'free-a',name:'Ana',image:MQ_BATTLE_PLACEHOLDER},{id:'free-b',name:'Ben',image:MQ_BATTLE_PLACEHOLDER}];blue=[{...roster[0],hp:100}];red=[{...roster[1],hp:100}];bi=ri=0;round=1;paused=false;locked=false;show('battle');update();begin()});
  await frame.waitForFunction(()=>AVLayoutEditor1580.screen==='battle');
  await page.locator('#avleLauncher1580').click();const redBefore=await rects(['#redSide']);const blueBox=await frame.locator('#blueSide').boundingBox();
  await edit('#blueSide','h',Math.round(blueBox.height+45));await unchanged(redBefore,'Other battle player stays in place');
  await frame.locator('[data-action=cancel]').click();
  assert.deepEqual(errors,[]);
  console.log('PASS: background move/resize leaves characters, meters, and question panel fixed; panel background and answer/text sizes are independent; Undo/Redo, Reset, Cancel, Save/restart, legacy layouts, classroom data, and other battle players are preserved.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
