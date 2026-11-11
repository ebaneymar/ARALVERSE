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
  await frame.locator('#petAnswers [data-choice="5"]').click();await frame.waitForFunction(()=>AVPetFeeding1582.getState().feeds===1);
  assert.equal(await frame.locator('#petHungerText').textContent(),'80 / 100');
  assert.ok(await frame.locator('#petHeroImage').evaluate(image=>image.complete&&image.naturalHeight>image.naturalWidth));
  await page.evaluate(()=>mathAPangDesktop.saveNow());
  const saved=JSON.parse(fs.readFileSync(path.join(folder,'Data/ARALVERSE_Data.json'),'utf8'));
  assert.ok(Object.entries(saved.localStorage).some(([key,value])=>key.endsWith('avQuestionEditorV1')&&value.includes('Native feeding question')),'Imported questions reach the real desktop save file');
  await running.close();running=null;
  console.log('PASS: real Windows EXE opens the feeding mode, loads rear-view character art, feeds/grows the pet, and saves imported questions through the native bridge.');
 }finally{if(running)await running.close().catch(()=>{});fs.rmSync(temporary,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
