'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('./windows/node_modules/playwright');
(async()=>{
 const stage=path.resolve(process.argv[2]),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'aral-pet-native-')),folder=path.join(temporary,'ARALVERSE');let running;
 try{
  fs.cpSync(path.join(stage,'dist/win-unpacked'),folder,{recursive:true});
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  running=await electron.launch({executablePath:path.join(folder,'ARALVERSE.exe'),env,timeout:90000});
  const page=await running.firstWindow();await page.waitForFunction(()=>window.AVActivation1581?.getStatus().canPlay,null,{timeout:60000});
  await page.evaluate(()=>{
   ARAL_STORAGE.setItem('mqCurriculumSelectionV190',JSON.stringify({term:'2',subject:'math',topic:'m2_subtraction'}));
   const api=AVQuestionEditor1551;api.importQuestions(api.currentSelection(),[{rowNumber:2,fields:{prompt:'Native feeding question: 7 - 2 = ?',choices:['5','4','6'],correct:0,context:''}}]);
   return launchGame('petFeeding');
  });
  await page.waitForFunction(()=>document.getElementById('gameFrame').contentWindow?.AVPetFeeding1582);
  const frame=page.frames().find(f=>f.parentFrame());await frame.evaluate(()=>AVSinglePlayerQuestions1582.setSource('edited'));
  await frame.locator('#petStart').click();await frame.waitForSelector('body[data-phase=question]');
  assert.equal(await frame.locator('#petQuestion').textContent(),'Native feeding question: 7 - 2 = ?');
  const answerIndex=await frame.locator('#petAnswers button').evaluateAll(buttons=>buttons.findIndex(button=>button.dataset.choice==='5'));
  await frame.locator('#petQuestion').click();await page.keyboard.press('abc'[answerIndex]);
  await frame.waitForFunction(()=>AVPetFeeding1582.getState().feeds===1);
  assert.equal(await frame.locator('#petHungerText').textContent(),'80 / 100');
  assert.ok(await frame.locator('#petHeroImage').evaluate(image=>image.complete&&image.naturalHeight>image.naturalWidth));
  assert.ok(await frame.locator('#petFoodBowl img').evaluate(image=>image.complete&&image.naturalWidth>0));
  await frame.locator('#petFonts').click();await frame.locator('#petFont-family').selectOption('century');
  await frame.locator('#petFont-question').fill('42');await frame.locator('#petFontSave').click();
  await frame.locator('#petFontDialog').waitFor({state:'hidden'});
  await frame.locator('#petQuestion').click();await page.keyboard.press('Enter');
  assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().phase),'question','Enter advances in the real Windows app');
  const questionBefore=await frame.locator('#petQuestionArea').boundingBox(),backgroundBefore=await frame.locator('#petArena').boundingBox();
  await page.locator('#avleLauncher1580').click();await frame.locator('.avle-toolbar select').selectOption('#petArena');
  const backgroundHeight=frame.locator('[data-field=h]');await backgroundHeight.fill(String(Math.round(backgroundBefore.height+30)));await backgroundHeight.press('Tab');
  assert.ok(Math.abs((await frame.locator('#petQuestionArea').boundingBox()).y-questionBefore.y)<2,'Resizing the background does not move the question panel in the Windows app');
  await frame.locator('[data-action=save]').click();
  await page.evaluate(()=>mathAPangDesktop.saveNow());
  const saved=JSON.parse(fs.readFileSync(path.join(folder,'Data/ARALVERSE_Data.json'),'utf8'));
  assert.ok(Object.entries(saved.localStorage).some(([key,value])=>key.endsWith('avQuestionEditorV1')&&value.includes('Native feeding question')),'Imported questions reach the real desktop save file');
  assert.ok(Object.entries(saved.localStorage).some(([key,value])=>key.endsWith('avPetFeedingFontsV1')&&JSON.parse(value).question===42),'Font preferences reach the real desktop save file');
  assert.ok(Object.entries(saved.localStorage).some(([key,value])=>key.endsWith('avManualLayouts1580')&&value.includes('#petArena')),'Independent object layouts reach the real desktop save file');
  await running.close();running=null;
  console.log('PASS: real Windows EXE opens, feeds/grows with a letter key, advances with Enter, resizes the background independently, and saves questions, fonts, and layouts through the native bridge.');
 }finally{
  if(running)await running.close().catch(()=>{});
  // Windows may retain a short-lived handle after Electron has exited.
  // Cleanup must not replace the result of the actual application assertions.
  try{fs.rmSync(temporary,{recursive:true,force:true,maxRetries:10,retryDelay:150})}
  catch(error){if(['EPERM','EBUSY','ENOTEMPTY'].includes(error.code))console.warn('Windows is still releasing the temporary test folder; runner cleanup will remove it.');else throw error}
 }
})().catch(error=>{console.error(error);process.exitCode=1});
