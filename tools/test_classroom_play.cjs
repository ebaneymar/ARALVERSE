'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.ARALVERSE_PLAYWRIGHT || 'playwright');

function fillTemplate(file, rows) {
  // Populate the actual workbook downloaded from the editor, retaining its validation and worksheets.
  const script = `
import io, json, sys, zipfile
from xml.etree import ElementTree as E
n = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
rows = json.loads(sys.argv[2])
out = io.BytesIO()
with zipfile.ZipFile(sys.argv[1]) as src, zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as dst:
 for entry in src.infolist():
  data = src.read(entry)
  if entry.filename == 'xl/worksheets/sheet1.xml':
   sheet = E.fromstring(data)
   assert sheet.find(".//"+n+"c[@r='G1']/"+n+"v").text == 'Pahiwatig'
   for index, values in enumerate(rows, 2):
    for j, value in enumerate(values):
     cell = sheet.find(".//"+n+"c[@r='"+chr(65+j)+str(index)+"']")
     cell.set('t', 'str')
     E.SubElement(cell, n+'v').text = value
   data = E.tostring(sheet, encoding='utf-8', xml_declaration=True)
  dst.writestr(entry, data)
sys.stdout.buffer.write(out.getvalue())`;
  return execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', script, file, JSON.stringify(rows)]);
}

(async () => {
  const root = path.resolve(process.argv[2]);
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    const type = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webp':'image/webp' }[path.extname(file)];
    res.setHeader('Content-Type', type || 'application/octet-stream');
    fs.createReadStream(file).on('error', () => res.writeHead(404).end()).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'], ...(process.env.ARALVERSE_BROWSER ? { executablePath: process.env.ARALVERSE_BROWSER } : {}) });
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(12000);
    await page.addInitScript(() => {
      if (window !== window.top) return;
      window.mathAPangDesktop = { isDesktop:true, saveNow:async()=>({ok:true}), activation:{ status:async()=>({ state:'trial',canPlay:true,activated:false,remainingDays:7,deviceCode:'AV-00000000-00000000-00000000-00000000',trialEndsAt:Date.now()+604800000 }) }, updater:{ info:async()=>({version:'1.5.93',configured:false,config:{autoCheck:false}}),onProgress:()=>()=>{} } };
    });
    const url = 'http://127.0.0.1:' + server.address().port + '/game.html';
    await page.goto(url); await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay);
    await page.evaluate(() => ARAL_STORAGE.setItem('mqCurriculumSelectionV190', JSON.stringify({term:'2',subject:'math',topic:'m2_subtraction'})));
    async function launch(mode) {
      await page.evaluate(mode => launchGame(mode), mode);
      await page.waitForFunction(() => {
        const f = document.getElementById('gameFrame'), doc = f.contentDocument;
        return doc?.readyState === 'complete' && doc?.documentElement.dataset.avLaunch === String(f.avLaunchId) && doc.documentElement.hasAttribute('data-av-projector-frame') && [...doc.styleSheets].some(s => s.href?.includes('classroom-projector'));
      });
      return page.frames().find(f => f.parentFrame());
    }
    let frame = await launch('petFeeding');
    const projector = page.locator('[data-projector-toggle]'), tools = page.locator('[data-projector-tools]');
    assert.equal(await projector.getAttribute('aria-pressed'), 'false');
    const hint = 'Bumilang nang paatras ng dalawang hakbang.';
    const prompt = 'May 7 turon sa plato. Kumuha si Nina ng 2. Ilan ang natira?';
    await frame.getByRole('button', {name:'QUESTION EDITOR',exact:true}).click();
    const download = page.waitForEvent('download'); await page.locator('#avqeTemplate').click();
    const workbook = fillTemplate(await (await download).path(), [[prompt,'5','4','6','A','7 − 2',hint],['May 9 na niyog. Ibinigay ang 4. Ilan ang natira?','5','4','6','A','','']]);
    await page.locator('#avqeImportFile').setInputFiles({name:'Aralin.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook});
    await page.locator('#avqeImportCount').filter({hasText:'2 READY'}).waitFor();
    assert.match(await page.locator('#avqeImportRows').textContent(), new RegExp(hint));
    await page.locator('#avqeImportSave').click();
    const card = page.locator('#avqeList .avqe-item').filter({hasText:prompt});
    await card.getByRole('button', {name:'EDIT',exact:true}).click();
    assert.equal(await page.locator('#avqeHint').inputValue(), hint);
    const editedHint = hint + ' Magsimula sa 7.';
    await page.locator('#avqeHint').fill(editedHint); await page.locator('#avqeSave').click(); await page.locator('#avqeClose').click();
    assert.equal(await frame.locator('#petHints').isChecked(), false);
    await frame.locator('#petHints').check();
    await frame.getByLabel('Single-player question source').selectOption('edited');
    await frame.locator('#petStart').click();
    const px = locator => locator.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    const regular = await px(frame.locator('#petQuestion'));
    await projector.click();
    assert.ok(await px(frame.locator('#petQuestion')) > regular);
    assert.equal(await frame.locator('#petFonts').isVisible(), false);
    assert.equal(await page.locator('#displayBtn').isVisible(), false);
    await tools.click(); assert.ok(await frame.locator('#petFonts').isVisible()); assert.ok(await page.locator('#displayBtn').isVisible()); await tools.click();
    async function pick(value) {
      const buttons = frame.locator('#petAnswers button'), choices = await buttons.evaluateAll(bs=>bs.map(b=>b.dataset.choice));
      await frame.locator('#petQuestion').click(); await page.keyboard.press('abc'[choices.indexOf(value)]);
    }
    async function advance() {
      await frame.locator('#petQuestion').click(); await page.keyboard.press('Enter'); await frame.waitForSelector('body[data-phase=question]');
    }
    async function feedFive(already = 0) {
      for (let i=already; i<5; i++) {
        await pick('5'); await frame.waitForFunction(count=>AVPetFeeding1582.getState().feeds===count, i+1);
        if (i<4) await advance();
      }
    }
    const buttons = frame.locator('#petAnswers button');
    const order = await buttons.allTextContents();
    await pick('4');
    assert.equal(await frame.locator('#petFeedback').textContent(), 'Pahiwatig: '+editedHint);
    assert.equal(await frame.locator('#petAnswers .correct').count(), 0);
    assert.match(await frame.locator('#petAnswers .incorrect').evaluate(b=>getComputedStyle(b,'::before').content), /✕/);
    const retryBounds = await frame.locator('#petNext').boundingBox();
    assert.ok(retryBounds.y + retryBounds.height <= 768, 'A two-line question, clue and retry fit a classroom laptop');
    if (process.env.ARALVERSE_CLASSROOM_SHOTS) await page.screenshot({path:process.env.ARALVERSE_CLASSROOM_SHOTS+'-clue.png'});
    async function captureCelebration(pet) {
      if (!process.env.ARALVERSE_CLASSROOM_SHOTS) return;
      await frame.locator('.pet-performance').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
      await page.screenshot({path:process.env.ARALVERSE_CLASSROOM_SHOTS+'-'+pet+'.png'});
    }
    await advance(); assert.deepEqual(await buttons.allTextContents(), order);
    await pick('6'); assert.match(await frame.locator('#petFeedback').textContent(), /tamang sagot ay 5/);
    assert.match(await frame.locator('#petAnswers .correct').evaluate(b=>getComputedStyle(b,'::before').content), /✓/);
    await advance(); await pick('5'); await frame.waitForFunction(()=>AVPetFeeding1582.getState().feeds===1); await advance();
    await pick('4'); assert.match(await frame.locator('#petFeedback').textContent(), /Ihambing ang mga pagpipilian/); await advance();
    await feedFive(1);
    assert.equal(await frame.locator('#petSceneCanvas').getAttribute('data-celebration'),'puppy');
    assert.equal(await frame.locator('.finish-bowl').isVisible(),true);
    await captureCelebration('puppy');
    await frame.locator('#petReview').click();
    assert.equal(await frame.locator('#petReviewSelect option').count(),2);
    assert.equal(await frame.locator('#petReviewPrompt').textContent(),prompt);
    assert.equal(await frame.locator('#petReviewVisual').textContent(),'7 − 2');
    assert.equal(await frame.locator('#petReviewAnswer').isVisible(),false);
    await frame.locator('#petReviewReveal').click(); assert.equal(await frame.locator('#petReviewAnswer').textContent(),'Tamang sagot: 5');
    await frame.locator('#petReviewSelect').selectOption('1'); assert.equal(await frame.locator('#petReviewAnswer').isVisible(),false);
    await frame.locator('#petReviewClose').click(); assert.equal(await frame.evaluate(()=>AVPetFeeding1582.getState().attempts),8);
    for (const pet of ['owl','carabao']) {
      await tools.click(); await frame.locator('#petHome').click(); await frame.locator('.pet-choice[data-pet='+pet+']').click();
      await frame.locator('#petStart').click(); await tools.click();
      assert.equal(await frame.locator('#petSceneCanvas').getAttribute('data-celebration'),null);
      await feedFive();
      assert.equal(await frame.locator('#petSceneCanvas').getAttribute('data-celebration'),pet);
      assert.equal(await frame.locator('.finish-ground').isVisible(),true);
      assert.equal(await frame.locator('#petReview').isVisible(),false);
      if (pet === 'carabao') assert.ok(await frame.locator('.finish-splash').isVisible());
      await captureCelebration(pet);
    }
    await page.reload(); await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay);
    frame = await launch('petFeeding'); assert.ok(await frame.locator('#petHints').isChecked()); assert.equal(await projector.getAttribute('aria-pressed'),'true');
    for (const [mode,promptSelector] of [['pve','#questionPrompt'],['pvp','#question'],['tournament','#question'],['boss','#question'],['teamTournament','#questionText']]) {
      frame=await launch(mode); assert.equal(await projector.getAttribute('aria-pressed'),'true');
      const livePrompt = frame.locator(promptSelector); assert.ok(await px(livePrompt)>=46,mode+' uses the projector question size');
      await projector.click(); assert.equal(await frame.locator('html').evaluate(e=>e.classList.contains('av-projector')),false);
      await projector.click(); assert.equal(await frame.locator('html').evaluate(e=>e.classList.contains('av-projector')),true);
      if (mode === 'pve') {
        await frame.locator('#startButton').click(); await frame.locator('#buddyGrid .buddy-main-area').first().click();
        await frame.waitForSelector('#game.active'); assert.ok(await livePrompt.isVisible());
        const answer=await frame.locator('#answers button').first().boundingBox(); assert.ok(answer.y>=0 && answer.y+answer.height<=768,'Classic choices fit the projector viewport');
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: actual Excel template and edited clues, stable A/B/C retry, second miss, blank clue, discussion and concealed answer, all three celebrations, persisted preferences and six projector game modes.');
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1});
