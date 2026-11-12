'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.ARALVERSE_PLAYWRIGHT || 'playwright');
(async () => {
  const root = path.resolve(process.argv[2] || '.build/pet-preview/app');
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost'), file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.webp') ? 'image/webp' : 'application/octet-stream');
    fs.createReadStream(file).on('error', () => { response.statusCode = 404; response.end(); }).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-dev-shm-usage'], ...(process.env.ARALVERSE_BROWSER ? {executablePath:process.env.ARALVERSE_BROWSER} : {}) });
    const page = await browser.newPage({ viewport:{width:1366,height:900} }); page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if (window.top !== window) return;
      window.__petTrialExpired = false;
      window.mathAPangDesktop = { isDesktop:true, saveNow:async()=>({ok:true}), activation:{
        status:async()=>({state:window.__petTrialExpired?'expired':'trial',canPlay:!window.__petTrialExpired,activated:false,remainingDays:window.__petTrialExpired?0:7,deviceCode:'AV-00000000-00000000-00000000-00000000',trialEndsAt:Date.now()+604800000}),
        activate:async()=>({ok:false}),copyDeviceCode:async()=>({ok:true})},
        updater:{info:async()=>({version:'1.5.83',configured:false,config:{autoCheck:false}}),onProgress:()=>()=>{}},openDataFolder:async()=>({ok:true}),exit(){} };
    });
    const url = 'http://127.0.0.1:' + server.address().port + '/game.html';
    await page.goto(url); await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay);
    await page.evaluate(() => {
      ARAL_STORAGE.setItem('pet-test-existing-classroom','keep my pupils');
      ARAL_STORAGE.setItem('mqCurriculumSelectionV190',JSON.stringify({term:'2',subject:'math',topic:'m2_subtraction'}));
      for (const [id,value] of [['mqCurriculumTerm','2'],['mqCurriculumSubject','math']]) { const element=document.getElementById(id); element.value=value;element.dispatchEvent(new Event('change',{bubbles:true})); }
      const topic=document.getElementById('mqCurriculumTopic');topic.value='m2_subtraction';topic.dispatchEvent(new Event('change',{bubbles:true}));
    });
    async function launch(mode) {
      await page.evaluate(mode => window.launchGame(mode), mode);
      await page.waitForFunction(() => document.getElementById('gameFrame').contentWindow?.AVSinglePlayerQuestions1582);
      return page.frames().find(frame => frame.parentFrame());
    }
    await page.evaluate(()=>showMathAPangModes());
    if(process.env.ARALVERSE_PET_SCREENSHOT)await page.locator('#petFeedingMode1582').screenshot({path:process.env.ARALVERSE_PET_SCREENSHOT+'-mode.png'});
    await page.locator('#petFeedingMode1582').click();
    await page.waitForFunction(()=>document.getElementById('gameFrame').contentWindow?.AVSinglePlayerQuestions1582);
    let frame = page.frames().find(frame=>frame.parentFrame()); await frame.waitForSelector('#petSetup.active');
    assert.equal(await page.locator('#petFeedingMode1582').count(),1);
    assert.match(await page.locator('#modeLabel').textContent(),/ALAGA/,'The launcher identifies the feeding activity');
    assert.match(await frame.locator('h1').first().textContent(),/^Pakainin ang mga Alaga$/);
    assert.equal(await frame.locator('#petHeroSelect').inputValue(),'nina');
    assert.ok(await frame.locator('#petHeroPreview').evaluate(image=>image.complete&&image.naturalHeight>image.naturalWidth));
    await frame.waitForFunction(()=>document.getElementById('petFont-family').options.length>0);
    assert.ok(await page.locator('#petFeedingMode1582 img').evaluate(image=>image.complete&&image.naturalWidth>1000),'The supplied mode card loads');
    await frame.getByLabel('Single-player question source').selectOption('edited');
    await frame.locator('#petStart').click(); assert.equal(await frame.locator('#petSetup.active').count(),1,'Empty edited bank does not silently use unrelated questions');
    await frame.getByLabel('Single-player question source').selectOption('builtin');
    async function importCSV(content) {
      const chooser = page.waitForEvent('filechooser');
      await frame.locator('[data-sp-import]').first().click();
      await (await chooser).setFiles({name:'Activity_Questions.csv',mimeType:'text/csv',buffer:Buffer.from(content)});
      await page.locator('#avqeImportCount').filter({hasText:/READY|INVALID/}).waitFor();
    }
    const headers = 'Question,Choice A,Choice B,Choice C,Correct Answer,Context\n';
    await importCSV(headers+'Pet CSV question: 7 - 2 = ?,5,4,6,D,\n');
    assert.equal(await page.locator('#avqeImportSave').isDisabled(),true,'Invalid answer key cannot be saved');
    assert.equal(await page.evaluate(()=>AVQuestionEditor1551.editedRows(AVQuestionEditor1551.currentSelection()).length),0);
    await page.locator('#avqeImportCancel').click(); await page.locator('#avqeClose').click();
    await importCSV(headers+'Pet CSV question: 7 - 2 = ?,5,4,6,A,\n');
    await page.locator('#avqeImportSave').click(); await page.locator('#avqeClose').click();
    assert.equal(await frame.getByLabel('Single-player question source').inputValue(),'edited','Confirmed import selects the imported pool for this activity');
    assert.equal(await frame.locator('#petSetupStatus').textContent(),'','A successful import clears the earlier empty-bank notice');
    assert.equal(await page.evaluate(()=>AVQuestionEditor1551.editedRows(AVQuestionEditor1551.currentSelection()).length),1);
    // An import for another editor lesson must not change this activity's source.
    await frame.getByLabel('Single-player question source').selectOption('builtin');
    await frame.locator('.av-sp-questions1582 button').filter({hasText:'QUESTION EDITOR'}).click();
    await page.locator('#avqeTopic').selectOption('m2_patterns');
    await page.locator('#avqeImportFile').setInputFiles({name:'Other_Lesson.csv',mimeType:'text/csv',buffer:Buffer.from(headers+'Other-topic question: 3 + 2 = ?,5,4,6,A,\n')});
    await page.locator('#avqeImportCount').filter({hasText:/READY/}).waitFor();
    await page.locator('#avqeImportSave').click();await page.locator('#avqeClose').click();
    assert.equal(await frame.getByLabel('Single-player question source').inputValue(),'builtin','Importing another lesson preserves the current source');
    await frame.getByLabel('Single-player question source').selectOption('edited');
    if(process.env.ARALVERSE_PET_SCREENSHOT)await page.screenshot({path:process.env.ARALVERSE_PET_SCREENSHOT+'-setup.png'});
    await frame.locator('#petStart').click(); await frame.waitForSelector('body[data-phase=question]');
    assert.match(await frame.locator('#petArena').evaluate(element=>getComputedStyle(element).backgroundImage),/pet-garden-1583/);
    assert.ok(await frame.locator('#petFoodBowl img').evaluate(image=>image.complete&&image.naturalWidth>0));
    assert.equal(await frame.locator('#petFoodToken svg').count(),0,'Food replaces the heart projectile');
    assert.match(await frame.locator('#petFoodToken img').getAttribute('src'),/pet-food-1583/);
    assert.ok((await frame.locator('#fullscreen-wrapper').boundingBox()).width>1250,'The activity uses the available screen width');
    assert.equal(await frame.locator('#petQuestion').textContent(),'Pet CSV question: 7 - 2 = ?');
    const initialSize=(await frame.locator('#petGrowth').boundingBox()).width;
    await frame.locator('#petAnswers [data-choice="4"]').click();
    assert.equal(await frame.locator('#petEnergyText').textContent(),'90 / 100');
    assert.equal(await frame.locator('#petHungerText').textContent(),'100 / 100');
    assert.equal(await frame.locator('#petThought').textContent(),'Gutom pa!');
    assert.equal(await frame.locator('#petAnimalActor').getAttribute('data-mood'),'hungry');
    await frame.locator('#petNext').click(); await frame.locator('#petAnswers [data-choice="5"]').click();
    await frame.locator('#petPause').click(); await page.waitForTimeout(1100);
    assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().feeds),0,'Pausing freezes a food toss before it changes hunger/growth');
    await frame.locator('#petPause').click(); await frame.waitForFunction(()=>AVPetFeeding1582.getState().feeds===1);
    await frame.waitForFunction(()=>parseFloat(getComputedStyle(document.getElementById('petGrowth')).getPropertyValue('--pet-scale'))>.6);
    await page.waitForTimeout(700);
    assert.ok((await frame.locator('#petGrowth').boundingBox()).width>initialSize*1.1,'The pet visibly grows after a successful feeding');
    assert.equal(await frame.locator('#petHungerText').textContent(),'80 / 100');
    assert.equal(await frame.locator('#petAnimalActor').getAttribute('data-mood'),'happy');
    if(process.env.ARALVERSE_PET_SCREENSHOT)await page.screenshot({path:process.env.ARALVERSE_PET_SCREENSHOT+'-game.png'});
    // Font editing previews safely and keeps the question/score unchanged.
    const scoreBeforeFonts=await frame.evaluate(()=>AVPetFeeding1582.getState());
    await frame.locator('#petFonts').click();
    assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().paused),true);
    await frame.locator('#petFont-question').fill('50');
    assert.equal(await frame.locator('#petQuestion').evaluate(element=>getComputedStyle(element).fontSize),'50px');
    await frame.locator('#petFontCancel').click();
    assert.equal(await frame.locator('#petQuestion').evaluate(element=>getComputedStyle(element).fontSize),'36px');
    assert.deepEqual(await frame.evaluate(()=>AVPetFeeding1582.getState()),scoreBeforeFonts,'Cancel restores the font and activity state');
    await frame.locator('#petFonts').click();
    await frame.locator('#petFont-family').selectOption('century');
    await frame.locator('#petFont-question').fill('44');await frame.locator('#petFont-answer').fill('30');
    await frame.locator('#petFont-title').fill('34');await frame.locator('#petFont-label').fill('19');
    await frame.locator('#petFont-weight').selectOption('600');await frame.locator('#petFont-color').fill('#154f48');
    await frame.locator('#petFontSave').click();await frame.locator('#petFontDialog').waitFor({state:'hidden'});
    assert.equal(await frame.locator('#petQuestion').evaluate(element=>getComputedStyle(element).fontSize),'44px');
    assert.match(await frame.locator('#petQuestion').evaluate(element=>getComputedStyle(element).fontFamily),/Century Gothic/);
    assert.equal(await frame.locator('#petAnswers button').first().evaluate(element=>getComputedStyle(element).fontSize),'30px');
    await frame.locator('#petFonts').click();await frame.locator('#petFontReset').click();
    assert.equal(await frame.locator('#petQuestion').evaluate(element=>getComputedStyle(element).fontSize),'36px','Default previews the original typography');
    await frame.locator('#petFont-family').press('Escape');
    await frame.locator('#petFontDialog').waitFor({state:'hidden'});
    assert.equal(await frame.locator('#petQuestion').evaluate(element=>getComputedStyle(element).fontSize),'44px','Escape cancels a font preview');
    await frame.waitForFunction(()=>window.AVLayoutEditor1580?.screen==='petGame');
    const bowlBefore=(await frame.locator('#petFoodBowl').boundingBox()).width;
    await page.locator('#avleLauncher1580').click();await frame.waitForSelector('.avle-toolbar');
    assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().paused),true,'The redesigned scene remains editable while paused');
    await frame.locator('.avle-toolbar select').selectOption('#petFoodBowl');
    const bowlWidth=frame.locator('[data-field=w]');await bowlWidth.fill(String(Math.round(bowlBefore+20)));await bowlWidth.press('Tab');
    assert.ok((await frame.locator('#petFoodBowl').boundingBox()).width>bowlBefore+15,'The new food bowl can be resized');
    await frame.locator('.avle-toolbar select').selectOption('#petHeroActor');
    await frame.locator('[data-action=cancel]').click();
    assert.ok(Math.abs((await frame.locator('#petFoodBowl').boundingBox()).width-bowlBefore)<2,'Cancel restores the scene layout');
    await frame.locator('#petNext').click(); await frame.locator('#petQuestions').click();
    assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().paused),true,'Question editing pauses the activity');
    const blocked=await page.evaluate(()=>{
      const api=AVQuestionEditor1551,s=api.currentSelection(),row=api.editedRows(s)[0];
      try{api.deleteQuestion(s,row.id);return ''}catch(error){return error.message}
    });
    assert.match(blocked,/Keep at least one/,'The last active edited question cannot be removed mid-activity');
    await page.locator('#avqeClose').click();
    for(let count=2;count<=5;count++){
      await frame.locator('#petAnswers [data-choice="5"]').click();await frame.waitForFunction(n=>AVPetFeeding1582.getState().feeds===n,count);
      if(count<5)await frame.locator('#petNext').click();
    }
    assert.equal(await frame.locator('#petHungerText').textContent(),'0 — BUSOG!');
    assert.equal(await frame.locator('#petComplete').isVisible(),true);
    assert.deepEqual(await frame.evaluate(()=>{const s=AVPetFeeding1582.getState();return {hunger:s.hunger,feeds:s.feeds,correct:s.correct,attempts:s.attempts}}),{hunger:0,feeds:5,correct:5,attempts:6});
    await frame.locator('#petAgain').click();
    for(let n=0;n<10;n++){await frame.locator('#petAnswers [data-choice="4"]').click();if(n<9)await frame.locator('#petNext').click();}
    assert.equal(await frame.locator('#petRest').isVisible(),true,'Low energy offers rest rather than a violent loss');
    await frame.locator('#petRest').click();assert.equal(await frame.locator('#petEnergyText').textContent(),'100 / 100');
    await frame.locator('#petHome').click();
    await frame.locator('#petAddCharacter').click();await frame.locator('#petCharacterName').fill('Custom Test Hero');
    await frame.locator('#petCharacterFile').setInputFiles(path.join(root,'assets/nina-back-1582.webp'));await frame.locator('#petCharacterSave').click();
    await frame.waitForFunction(()=>document.getElementById('petHeroSelect').value!=='nina');
    const customId=await frame.locator('#petHeroSelect').inputValue();
    await frame.locator('[data-pet=owl]').click();await frame.locator('#petStart').click();
    assert.equal(await frame.locator('#petEnergyLabel').textContent(),'Lakas ni Custom Test Hero');
    assert.equal(await frame.locator('#petAnimalSprite').evaluate(el=>el.style.getPropertyValue('--pet-x')),'50%');
    await frame.locator('#petHome').click();await frame.locator('[data-pet=carabao]').click();await frame.locator('#petStart').click();
    assert.equal(await frame.locator('#petAnimalSprite').evaluate(el=>el.style.getPropertyValue('--pet-x')),'100%');
    await page.reload();await page.waitForFunction(()=>window.AVActivation1581?.getStatus().canPlay);frame=await launch('petFeeding');
    assert.equal(await frame.locator('#petHeroSelect').inputValue(),customId,'Added character selection survives restart');
    await frame.locator('[data-pet-fonts]').first().click();
    assert.equal(await frame.locator('#petFont-family').inputValue(),'century');
    assert.equal(await frame.locator('#petFont-question').inputValue(),'44','Saved font choices survive restarting');
    await frame.locator('#petFontCancel').click();
    assert.equal(await frame.getByLabel('Single-player question source').inputValue(),'edited','Imported source survives restart');
    frame=await launch('pve');
    assert.equal(await frame.getByLabel('Single-player question source').first().inputValue(),'builtin','Adventure has an independent question source');
    await importCSV(headers+'Adventure CSV question: 12 - 5 = ?,7,6,8,A,\n');
    await page.locator('#avqeImportSave').click();await page.locator('#avqeClose').click();
    assert.ok(await page.evaluate(()=>AVQuestionEditor1551.editedRows(AVQuestionEditor1551.currentSelection()).some(row=>row.data.prompt.startsWith('Adventure CSV question:'))),'Imports after restarting use the activity lesson, even before opening the lesson screen');
    assert.equal(await frame.getByLabel('Single-player question source').first().inputValue(),'edited');
    await frame.locator('#startButton').click();await frame.waitForSelector('#buddySelect.active');
    await frame.locator('#buddyGrid .buddy-main-area').first().click();await frame.waitForSelector('#game.active');
    assert.match(await frame.locator('#questionPrompt').textContent(),/^(Pet|Adventure) CSV question:/,'Adventure plays the imported lesson questions');
    assert.equal(await page.evaluate(()=>ARAL_STORAGE.getItem('pet-test-existing-classroom')),'keep my pupils');
    frame=await launch('petFeeding');await frame.locator('#petStart').click();
    await page.evaluate(()=>{window.__petTrialExpired=true;return AVActivation1581.refresh()});
    await page.locator('#avActivationDialog1581[open]').waitFor();
    assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().paused),true,'The new mode respects trial expiry and pauses under the activation dialog');
    assert.equal(await page.locator('#avActClose1581').isDisabled(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: illustrated mode card and wide scene, food bowl, puppy emotions/growth, font preview/save/cancel/default/restart, pet choice, rear-view Nina, custom characters, hunger/rest/pause, CSV import in both single-player modes, saved data, and activation gate.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
