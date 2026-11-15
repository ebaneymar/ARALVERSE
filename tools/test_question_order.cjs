'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.ARALVERSE_PLAYWRIGHT || 'playwright');
const workbook = execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `
import io,zipfile,html,sys
rows=[['Question','Choice A','Choice B','Choice C','Correct Answer','Context']]+[[s,'5','4','6','A',''] for s in ['Excel row one','Excel row two','Excel row three']]
sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join('<row r="'+str(i)+'">'+''.join('<c r="'+chr(65+j)+str(i)+'" t="inlineStr"><is><t>'+html.escape(v)+'</t></is></c>' for j,v in enumerate(row))+'</row>' for i,row in enumerate(rows,1))+'</sheetData></worksheet>'
parts={'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>','_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Questions" sheetId="1" r:id="rId1"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>','xl/worksheets/sheet1.xml':sheet}
out=io.BytesIO()
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for n,v in parts.items():z.writestr(n,v)
sys.stdout.buffer.write(out.getvalue())
`]);
(async () => {
  const root = path.resolve(process.argv[2]);
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');
    fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(process.env.ARALVERSE_BROWSER ? { executablePath: process.env.ARALVERSE_BROWSER } : {}) });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } }); page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if (window.top !== window) return;
      window.mathAPangDesktop = { isDesktop: true, saveNow: async () => ({ ok: true }), activation: { status: async () => ({ state: 'trial', canPlay: true, activated: false, remainingDays: 7, deviceCode: 'AV-00000000-00000000-00000000-00000000', trialEndsAt: Date.now() + 604800000 }), activate: async () => ({ ok: false }), copyDeviceCode: async () => ({ ok: true }) }, updater: { info: async () => ({ version: '1.5.92', configured: false, config: { autoCheck: false } }), onProgress: () => () => {} }, openDataFolder: async () => ({ ok: true }), exit() {} };
    });
    const A = { term: '2', subject: 'math', topic: 'm2_subtraction' }, B = { term: '2', subject: 'math', topic: 'm2_patterns' }, C = { term: '2', subject: 'math', topic: 'm2_pictograph' };
    await page.goto('http://127.0.0.1:' + server.address().port + '/game.html');
    await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay && window.AVQuestionEditor1551?.moveQuestion);
    const prompts = lesson => page.evaluate(lesson => AVQuestionEditor1551.allRows(lesson).filter(row => row.kind === 'manual').map(row => row.data.prompt), lesson);
    const snapshot = () => page.evaluate(() => ARAL_STORAGE.getItem(AVQuestionEditor1551.STORE_KEY));
    const card = prompt => page.locator('.avqe-item').filter({ has: page.locator('.avqe-prompt').filter({ hasText: prompt }) });
    async function open(lesson) { await page.evaluate(() => AVQuestionEditor1551.open()); await page.locator('#avqeTerm').selectOption(lesson.term); await page.locator('#avqeSubject').selectOption(lesson.subject); await page.locator('#avqeTopic').selectOption(lesson.topic); }
    await open(A);
    await page.locator('#avqeImportFile').setInputFiles({ name: 'ordered.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: workbook });
    await page.waitForFunction(() => !document.getElementById('avqeImportSave').disabled); await page.locator('#avqeImportSave').click();
    assert.deepEqual(await prompts(A), ['Excel row one', 'Excel row two', 'Excel row three'], 'Real Excel worksheet row order is retained');
    await page.locator('#avqeAdd').click(); await page.locator('#avqeQuestion').fill('Manually added fourth');
    for (const [letter, value] of [['A', '5'], ['B', '4'], ['C', '6']]) await page.locator('#avqeChoice' + letter).fill(value);
    await page.locator('#avqeCorrect').selectOption('0'); await page.locator('#avqeSave').click();
    await card('Excel row two').locator('[data-avqe-bulk-id]').check();
    await card('Excel row three').locator('[data-avqe-move="-1"]').click(); await card('Excel row three').locator('[data-avqe-move="-1"]').click();
    let order = ['Excel row three', 'Excel row one', 'Excel row two', 'Manually added fourth'];
    assert.deepEqual(await prompts(A), order, 'Up buttons save the exact visible question order');
    assert.equal(await card('Excel row two').locator('[data-avqe-bulk-id]').isChecked(), true, 'Reordering retains the selected question');
    assert.equal(await card('Excel row three').locator('[data-avqe-move="-1"]').isDisabled(), true);
    assert.equal(await card('Manually added fourth').locator('[data-avqe-move="1"]').isDisabled(), true);
    await card('Excel row one').locator('[data-avqe-move="1"]').click(); await card('Excel row one').locator('[data-avqe-move="-1"]').click();
    assert.deepEqual(await prompts(A), order, 'Down and Up change one position at a time');
    const csv = 'Question,Choice A,Choice B,Choice C,Correct Answer\nCSV row five,5,4,6,A\n';
    await page.locator('#avqeImportFile').setInputFiles({ name: 'added.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForFunction(() => !document.getElementById('avqeImportSave').disabled); await page.locator('#avqeImportSave').click(); order.push('CSV row five');
    assert.deepEqual(await prompts(A), order, 'A new import appends after the saved order');
    if (process.env.ARALVERSE_ORDER_SCREENSHOT) { await card('Excel row three').locator('[data-avqe-move="1"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: process.env.ARALVERSE_ORDER_SCREENSHOT }); }
    const saved = await snapshot();
    await page.evaluate(() => { window.orderSetItem = ARAL_STORAGE.setItem; ARAL_STORAGE.setItem = function (key, value) { if (key === AVQuestionEditor1551.STORE_KEY) throw Error('Question order could not be saved'); return orderSetItem.call(this, key, value); }; });
    await card('Excel row two').locator('[data-avqe-move="-1"]').click(); assert.match(await page.locator('#avqeStatus').textContent(), /could not be saved/); assert.equal(await snapshot(), saved, 'A failed save keeps the previous order');
    await page.evaluate(() => { ARAL_STORAGE.setItem = orderSetItem; });
    const rejected = await page.evaluate(A => { try { AVQuestionEditor1551.moveQuestion(A, AVQuestionEditor1551.catalogue(A)[0].id, -1); } catch (error) { return error.message; } }, A);
    assert.match(rejected, /Only imported/); assert.equal(await snapshot(), saved, 'Built-in questions cannot be moved or altered');
    await page.locator('#avqeClose').click(); await page.reload(); await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay);
    assert.deepEqual(await prompts(A), order, 'Saved order survives restarting');
    const sequence = await page.evaluate(({ A, B }) => {
      const api = AVQuestionEditor1551; ARAL_STORAGE.setItem('mqCurriculumSelectionV190', JSON.stringify(A));
      const win = { MQCurriculum: { loadSelection: () => A } }, original = () => ({ key: 'builtin-check', prompt: 'Built-in delegate', choices: ['1', '2', '3'], answer: '1', avTopic: A.topic });
      const first = api.nextQuestion(original, win, { source: 'edited' }).prompt;
      api.importQuestions(B, [{ rowNumber: 2, fields: { prompt: 'Other lesson', choices: ['5', '4', '6'], correct: 0, context: '' } }]);
      const second = api.nextQuestion(original, win, { source: 'edited' }).prompt;
      api.resetQuestionOrder(win);
      const full = Array.from({ length: 6 }, () => api.nextQuestion(original, win, { source: 'edited' }).prompt);
      return { first, second, full, builtin: api.nextQuestion(original, win, { source: 'builtin' }).key };
    }, { A, B });
    assert.equal(sequence.first, order[0]); assert.equal(sequence.second, order[1], 'Another lesson save does not restart this sequence');
    assert.deepEqual(sequence.full, [...order, order[0]], 'The whole set plays sequentially and repeats from its first question'); assert.equal(sequence.builtin, 'builtin-check');
    await page.evaluate(A => { ARAL_STORAGE.setItem('mqCurriculumSelectionV190', JSON.stringify(A)); return launchGame('petFeeding'); }, A);
    await page.waitForFunction(() => document.getElementById('gameFrame').contentWindow?.AVPetFeeding1582);
    let frame = page.frames().find(frame => frame.parentFrame()); await frame.evaluate(() => AVSinglePlayerQuestions1582.setSource('edited')); await frame.locator('#petStart').click();
    assert.equal(await frame.locator('#petQuestion').textContent(), order[0], 'The actual feeding game begins from the first visible added question');
    await frame.locator('#petAnswers button[data-choice="4"]').click(); await frame.locator('#petQuestion').click(); await page.keyboard.press('Enter');
    assert.equal(await frame.locator('#petQuestion').textContent(), order[0], 'Retry keeps the same question');
    await frame.locator('#petAnswers button[data-choice="5"]').click(); await frame.waitForFunction(() => AVPetFeeding1582.getState().feeds === 1);
    await frame.locator('#petQuestion').click(); await page.keyboard.press('Enter'); assert.equal(await frame.locator('#petQuestion').textContent(), order[1]);
    await frame.locator('#petHome').click(); await frame.locator('#petStart').click();
    assert.equal(await frame.locator('#petQuestion').textContent(), order[0], 'Restarting partway through the list returns to its first question');
    for (let i = 0; i < order.length; i++) {
      assert.equal(await frame.locator('#petQuestion').textContent(), order[i]);
      await frame.locator('#petAnswers button[data-choice="5"]').click(); await frame.waitForFunction(feeds => AVPetFeeding1582.getState().feeds === feeds, i + 1);
      if (i < order.length - 1) { await frame.locator('#petQuestion').click(); await page.keyboard.press('Enter'); }
    }
    await frame.locator('#petAgain').click(); assert.equal(await frame.locator('#petQuestion').textContent(), order[0], 'A new feeding activity restarts at question one');
    await page.evaluate(() => launchGame('pve')); await page.waitForFunction(() => document.getElementById('gameFrame').contentDocument?.getElementById('startButton') && document.getElementById('gameFrame').contentDocument.readyState === 'complete');
    frame = page.frames().find(frame => frame.parentFrame()); await frame.evaluate(() => AVSinglePlayerQuestions1582.setSource('edited')); await frame.locator('#startButton').click(); await frame.locator('#buddyGrid .buddy-main-area').first().click(); await frame.waitForSelector('#game.active');
    assert.equal(await frame.locator('#questionPrompt').textContent(), order[0], 'Classic Adventure begins in the saved order');
    await frame.evaluate(() => { nextQuestion(); startBattle(); }); assert.equal(await frame.locator('#questionPrompt').textContent(), order[0], 'Another Classic battle starts from the first question');
    await page.evaluate(() => { AVQuestionEditor1551.setSource('edited'); return launchGame('tournament'); });
    await page.waitForFunction(() => document.getElementById('gameFrame').contentDocument?.getElementById('tournamentSetup') && document.getElementById('gameFrame').contentDocument.readyState === 'complete'); frame = page.frames().find(frame => frame.parentFrame());
    await frame.evaluate(() => { roster = [{ id: 'order-a', name: 'Ana', image: MQ_BATTLE_PLACEHOLDER }, { id: 'order-b', name: 'Ben', image: MQ_BATTLE_PLACEHOLDER }]; blue = [{ ...roster[0], hp: 100 }]; red = [{ ...roster[1], hp: 100 }]; bi = ri = 0; round = 1; paused = false; locked = false; show('battle'); update(); begin(); });
    assert.equal(await frame.locator('#question').textContent(), order[0], 'Tournament uses the same saved first question');
    await page.evaluate(() => launchGame('petFeeding')); await page.waitForFunction(() => document.getElementById('gameFrame').contentWindow?.AVPetFeeding1582);
    await page.evaluate(C => AVQuestionEditor1551.importQuestions(C, Array.from({ length: 60 }, (_, i) => ({ rowNumber: i + 2, fields: { prompt: 'Long list ' + String(i).padStart(2, '0'), choices: ['5', '4', '6'], correct: 0, context: '' } }))), C);
    await open(C); await page.evaluate(() => [...document.querySelectorAll('#avqeList button')].find(button => button.textContent === 'SHOW MORE QUESTIONS')?.click());
    await card('Long list 55').locator('[data-avqe-move="-1"]').click();
    assert.equal((await prompts(C))[54], 'Long list 55', 'Arrows work beyond the first 50 questions'); assert.equal(await card('Long list 55').isVisible(), true, 'The moved card remains loaded');
    await page.locator('#avqeSearch').fill('Long list 55'); await card('Long list 55').locator('[data-avqe-move="-1"]').click(); assert.equal((await prompts(C))[53], 'Long list 55', 'Search arrows update the full lesson order');
    assert.deepEqual(await prompts(A), order, 'Reordering another lesson does not alter the activity lesson');
    assert.deepEqual(errors, []);
    console.log('PASS: Excel/CSV row order, manual additions, Up/Down, checked selections, failed saves, restart persistence, sequential/repeating playback, retry/new-game behavior, Classic/Tournament and search/pagination.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
