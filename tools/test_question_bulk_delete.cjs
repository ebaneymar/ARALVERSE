'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.ARALVERSE_PLAYWRIGHT || 'playwright');
(async () => {
  const root = path.resolve(process.argv[2]);
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');
    fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(process.env.ARALVERSE_BROWSER ? { executablePath: process.env.ARALVERSE_BROWSER } : {}) });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } }); page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if (window.top !== window) return;
      window.mathAPangDesktop = { isDesktop: true, saveNow: async () => ({ ok: true }), activation: { status: async () => ({ state: 'trial', canPlay: true, activated: false, remainingDays: 7, deviceCode: 'AV-00000000-00000000-00000000-00000000', trialEndsAt: Date.now() + 604800000 }), activate: async () => ({ ok: false }), copyDeviceCode: async () => ({ ok: true }) }, updater: { info: async () => ({ version: '1.5.91', configured: false, config: { autoCheck: false } }), onProgress: () => () => {} }, openDataFolder: async () => ({ ok: true }), exit() {} };
    });
    const A = { term: '2', subject: 'math', topic: 'm2_subtraction' }, B = { term: '2', subject: 'math', topic: 'm2_patterns' };
    await page.goto('http://127.0.0.1:' + server.address().port + '/game.html');
    await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay && window.AVQuestionEditor1551?.deleteQuestions);
    await page.evaluate(({ A, B }) => {
      const api = AVQuestionEditor1551;
      const fields = prompt => ({ prompt, choices: ['5', '4', '6'], correct: 0, context: '' });
      api.importQuestions(A, Array.from({ length: 125 }, (_, i) => ({ rowNumber: i + 2, fields: fields(i < 120 ? 'Bulk alpha ' + i : 'Keep beta ' + i) })));
      api.importQuestions(B, [{ rowNumber: 2, fields: fields('Other lesson one') }, { rowNumber: 3, fields: fields('Other lesson two') }]);
      const builtins = api.allRows(A).filter(row => row.kind !== 'manual');
      api.saveQuestion(A, builtins[0].id, fields('Preserved built-in edit'));
      api.setDisabled(A, builtins[1].id, true);
      ARAL_STORAGE.setItem('bulk-classroom-sentinel', 'Keep classroom progress');
    }, { A, B });
    const manual = lesson => page.evaluate(lesson => AVQuestionEditor1551.allRows(lesson).filter(row => row.kind === 'manual'), lesson);
    const snapshot = () => page.evaluate(() => JSON.parse(ARAL_STORAGE.getItem(AVQuestionEditor1551.STORE_KEY)));
    const before = await snapshot();
    async function open(lesson) {
      await page.evaluate(() => AVQuestionEditor1551.open());
      await page.locator('#avqeTerm').selectOption(lesson.term); await page.locator('#avqeSubject').selectOption(lesson.subject); await page.locator('#avqeTopic').selectOption(lesson.topic);
    }
    async function remove(button, accept = true) {
      const dialog = page.waitForEvent('dialog');
      const click = page.locator(button).click();
      const prompt = await dialog;
      assert.match(prompt.message(), /Built-in questions and other lessons will stay/);
      if (accept) await prompt.accept(); else await prompt.dismiss();
      await click;
    }
    await open(A);
    assert.equal(await page.locator('#avqeDeleteSelected').isDisabled(), true);
    await page.locator('[data-avqe-bulk-id]').nth(0).check(); await page.locator('[data-avqe-bulk-id]').nth(2).check();
    assert.equal(await page.locator('#avqeDeleteSelected').textContent(), 'DELETE SELECTED (2)');
    if (process.env.ARALVERSE_BULK_SCREENSHOT) { await page.locator('#avqeBody').evaluate(body => { body.scrollTop = 0; }); await page.screenshot({ path: process.env.ARALVERSE_BULK_SCREENSHOT }); }
    await remove('#avqeDeleteSelected', false); assert.equal((await manual(A)).length, 125, 'Cancelling does not delete anything');
    await page.evaluate(() => { window.bulkWrites = 0; window.bulkSetItem = ARAL_STORAGE.setItem; ARAL_STORAGE.setItem = function (key, value) { if (key === AVQuestionEditor1551.STORE_KEY) bulkWrites++; return bulkSetItem.call(this, key, value); }; });
    await remove('#avqeDeleteSelected');
    assert.equal((await manual(A)).length, 123); assert.equal(await page.evaluate(() => bulkWrites), 1, 'A batch uses one question-bank write');
    await page.evaluate(() => { ARAL_STORAGE.setItem = bulkSetItem; });
    const afterSelected = await snapshot();
    assert.deepEqual(afterSelected.lessons['2|math|m2_patterns'], before.lessons['2|math|m2_patterns'], 'Other lessons are unchanged');
    for (const key of ['overrides', 'disabled']) assert.deepEqual(afterSelected.lessons['2|math|m2_subtraction'][key], before.lessons['2|math|m2_subtraction'][key], 'Built-in settings stay unchanged');
    await page.locator('#avqeSearch').fill('Bulk alpha'); await page.locator('#avqeSelectAll').check();
    assert.equal(await page.locator('#avqeDeleteSelected').textContent(), 'DELETE SELECTED (118)', 'Select all includes matches beyond the first page');
    await page.locator('#avqeSearch').fill('Keep beta');
    assert.equal(await page.locator('#avqeDeleteSelected').isDisabled(), true, 'Changing the search clears hidden selections');
    await page.locator('#avqeSearch').fill('Bulk alpha'); await page.locator('#avqeSelectAll').check(); await remove('#avqeDeleteSelected');
    assert.equal((await manual(A)).length, 5); assert.ok((await manual(A)).every(row => row.data.prompt.startsWith('Keep beta')), 'Only the selected search matches are deleted');
    await page.locator('#avqeSearch').fill('No matching questions');
    assert.equal(await page.locator('#avqeSelectAll').isDisabled(), true);
    assert.equal(await page.locator('#avqeDeleteAll').textContent(), 'DELETE ALL (5)', 'Delete all names the full lesson count even with a search');
    await remove('#avqeDeleteAll');
    assert.equal((await manual(A)).length, 0); assert.equal((await manual(B)).length, 2); assert.equal(await page.locator('#avqeDeleteAll').isDisabled(), true);
    await page.locator('#avqeSearch').fill('');
    const builtinIds = await page.evaluate(A => AVQuestionEditor1551.allRows(A).filter(row => row.kind !== 'manual').map(row => row.id), A);
    assert.ok(builtinIds.length > 0);
    const selectableIds = await page.locator('.avqe-item:has([data-avqe-bulk-id])').evaluateAll(cards => cards.map(card => card.dataset.id));
    assert.ok(builtinIds.every(id => !selectableIds.includes(id)), 'Built-in questions cannot be selected for deletion');
    const csv = 'Question,Choice A,Choice B,Choice C,Correct Answer\nNew replacement one,5,4,6,A\nNew replacement two,10,11,12,A\n';
    await page.locator('#avqeImportFile').setInputFiles({ name: 'replacement.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForFunction(() => !document.getElementById('avqeImportSave').disabled); await page.locator('#avqeImportSave').click();
    assert.equal((await manual(A)).length, 2, 'A new file can be imported after clearing the old questions');
    await page.reload(); await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay);
    assert.deepEqual((await manual(A)).map(row => row.data.prompt).sort(), ['New replacement one', 'New replacement two'], 'Deletes and the new import survive restart');
    assert.equal((await manual(B)).length, 2); assert.equal(await page.evaluate(() => ARAL_STORAGE.getItem('bulk-classroom-sentinel')), 'Keep classroom progress');
    await open(A); await page.locator('#avqeSelectAll').check();
    const savedBeforeFailure = await snapshot();
    await page.evaluate(() => { window.bulkSetItem = ARAL_STORAGE.setItem; ARAL_STORAGE.setItem = function (key, value) { if (key === AVQuestionEditor1551.STORE_KEY) throw Error('Question storage unavailable'); return bulkSetItem.call(this, key, value); }; });
    await remove('#avqeDeleteSelected'); assert.match(await page.locator('#avqeStatus').textContent(), /storage unavailable/); assert.deepEqual(await snapshot(), savedBeforeFailure, 'A save failure leaves all questions intact');
    await page.evaluate(() => { ARAL_STORAGE.setItem = bulkSetItem; });
    const error = await page.evaluate(({ A, builtin }) => { try { AVQuestionEditor1551.deleteQuestions(A, [AVQuestionEditor1551.allRows(A).find(row => row.kind === 'manual').id, builtin]); } catch (error) { return error.message; } }, { A, builtin: builtinIds[0] });
    assert.match(error, /Only imported/); assert.deepEqual(await snapshot(), savedBeforeFailure, 'A mixed built-in/manual batch is rejected as a whole');
    await page.locator('#avqeClose').click();
    await page.evaluate(B => { ARAL_STORAGE.setItem('mqCurriculumSelectionV190', JSON.stringify(B)); return launchGame('petFeeding'); }, B);
    await page.waitForFunction(() => document.getElementById('gameFrame').contentWindow?.AVPetFeeding1582);
    const frame = page.frames().find(frame => frame.parentFrame()); await frame.evaluate(() => AVSinglePlayerQuestions1582.setSource('edited')); await frame.locator('#petStart').click();
    await frame.waitForSelector('body[data-phase=question]'); await open(B);
    const liveBefore = await snapshot(); await remove('#avqeDeleteAll');
    assert.match(await page.locator('#avqeStatus').textContent(), /Keep at least one imported/);
    assert.deepEqual(await snapshot(), liveBefore, 'A running activity cannot lose its whole active question pool');
    await page.locator('#avqeClose').click(); await frame.waitForFunction(() => !AVPetFeeding1582.getState().paused); assert.equal(await frame.evaluate(() => AVPetFeeding1582.getState().paused), false);
    assert.deepEqual(errors, []);
    console.log('PASS: selected and all imported-question deletion, confirmation/cancel, search and pagination, one-write saves, preserved built-ins/other lessons, re-import/restart, save failure and active-game protection.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
