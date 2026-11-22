'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.ARALVERSE_PLAYWRIGHT || 'playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(process.env.ARALVERSE_BROWSER ? {executablePath: process.env.ARALVERSE_BROWSER} : {})
  });
  try {
    const page = await browser.newPage({viewport: {width: 1366, height: 768}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if (window !== window.top) return;
      window.mathAPangDesktop = {
        isDesktop: true, saveNow: async () => ({ok: true}),
        activation: {status: async () => ({
          state: 'trial', canPlay: true, activated: false, remainingDays: 7,
          deviceCode: 'AV-00000000-00000000-00000000-00000000', trialEndsAt: Date.now() + 604800000
        })},
        updater: {info: async () => ({version: '1.5.98', configured: false, config: {autoCheck: false}}), onProgress: () => () => {}}
      };
    });
    const url = pathToFileURL(path.resolve(process.argv[2], 'game.html')).href;
    await page.goto(url);
    await page.waitForFunction(() => window.AVActivation1581?.getStatus().canPlay);
    await page.locator('#avPortalStart').click();
    await page.locator('#mqChangeCurriculumBtn').click();
    await page.locator('#mqCurriculumTerm').selectOption('2');
    await page.locator('#mqCurriculumSubject').selectOption('math');
    await page.locator('#mqCurriculumTopic').selectOption('m2_subtraction');
    await page.locator('#mqCurriculumContinue').click();
    const frame = page.frameLocator('#gameFrame');
    const modesButton = page.getByRole('button', {name: /GAME MODES/});
    async function openBoss() {
      await page.locator('#bayanihanBossMode').click();
      await frame.locator('#questionTools select').waitFor();
      assert.match(await page.locator('#modeLabel').innerText(), /BAYANIHAN BOSS/i);
    }
    const hp = () => frame.locator('#bossHp').evaluate(bar => bar.value);
    const size = frame.locator('#classSize'), count = frame.locator('#correctCount');
    const start = frame.locator('#start'), reveal = frame.locator('#reveal'), next = frame.locator('#next');
    await openBoss();
    await size.fill('0'); await start.click();
    assert.equal(await frame.locator('#setupError').isVisible(), true);
    await size.fill('4'); await start.click();
    assert.equal(await hp(), 200, 'Medium takes five whole-class hits');
    assert.ok(await frame.locator('#questionPrompt').innerText());
    assert.ok(await frame.locator('#answers li').count() >= 3);
    assert.equal(await frame.locator('#bossSprite').evaluate(image => image.complete && image.naturalWidth > 0), true);
    const projector = page.locator('[data-projector-toggle]');
    const fontSize = () => frame.locator('#questionPrompt').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const regular = await fontSize(); await projector.click();
    assert.ok(await fontSize() > regular, 'The actual projector control enlarges the projected question');
    await projector.click();
    await modesButton.click();

    const prompts = ['May 8 mangga. Ibinigay ang 3. Ilan ang natira?', 'May 9 na saging. Kinuha ang 2. Ilan ang natira?'];
    await page.evaluate(prompts => {
      const api = window.AVQuestionEditor1551;
      api.importQuestions(api.currentSelection(), prompts.map((prompt, i) => ({
        rowNumber: i + 2, fields: {prompt, choices: i ? ['5', '6', '7'] : ['4', '5', '6'], correct: i ? 2 : 1, context: i ? '9 − 2' : '8 − 3'}
      })));
    }, prompts);
    await openBoss();
    assert.equal(await size.inputValue(), '4', 'A returning teacher can reuse or change attendance');
    await frame.locator('#questionTools select').selectOption('edited');
    await frame.locator('#difficulty').selectOption('3');
    await start.click();
    assert.equal(await hp(), 120);
    for (const [index, correct] of [0, 1, 4, 4, 4].entries()) {
      assert.equal(await frame.locator('#questionPrompt').innerText(), prompts[index % 2], 'Imported questions follow the saved order');
      assert.deepEqual(await frame.locator('#answers .letter').allTextContents(), ['A', 'B', 'C']);
      assert.equal(await frame.locator('#answers .is-key').count(), 0);
      assert.equal(await count.isVisible(), false);
      const before = await hp();
      await frame.locator('#answers .answer').first().click(); await page.keyboard.press('B');
      assert.equal(await hp(), before, 'Raised answers are scored only by the teacher’s tally');
      await reveal.click();
      assert.equal(await frame.locator('.is-key .letter').innerText(), index % 2 ? 'C' : 'B');
      if (index === 0) {
        for (const invalid of ['', '-1', '1.5', '5']) {
          await count.fill(invalid); await frame.locator('#attack').click();
          assert.equal(await count.getAttribute('aria-invalid'), 'true');
          assert.equal(await hp(), before);
          assert.equal(await next.isVisible(), false);
        }
      }
      await count.fill(String(correct));
      assert.match(await frame.locator('#damagePreview').innerText(), new RegExp('= ' + correct * 10 + ' damage'));
      await count.press('Enter');
      assert.equal(await hp(), Math.max(0, before - correct * 10), 'Every correct pupil deals ten HP, with a floor of zero');
      assert.equal(await frame.locator('#feedback').innerText(), correct + ' sa 4 ang tama · ' + correct * 10 + ' damage!');
      await frame.locator('#tally').evaluate(form => form.requestSubmit());
      assert.equal(await hp(), Math.max(0, before - correct * 10), 'A second submission cannot deal another hit');
      assert.equal(await frame.locator('#questionPrompt').innerText(), prompts[index % 2], 'The teacher controls when to advance');
      await next.click();
    }
    assert.equal(await frame.locator('#resultTitle').innerText(), 'Panalo ang klase!');
    assert.match(await frame.locator('#summary').innerText(), /13 tamang sagot sa 5 tanong/);
    await frame.locator('#again').click();
    await frame.locator('#difficulty').selectOption('7'); await size.fill('20'); await start.click();
    assert.equal(await hp(), 1400);
    assert.equal(await frame.locator('#questionPrompt').innerText(), prompts[0], 'A second battle starts at the first imported question');
    await reveal.click(); await count.fill('12');
    assert.match(await frame.locator('#damagePreview').innerText(), /12 × 10 = 120 damage/);
    if (process.env.ARALVERSE_BAYANIHAN_SCREENSHOT) await page.screenshot({path: process.env.ARALVERSE_BAYANIHAN_SCREENSHOT});
    await frame.locator('#attack').click(); assert.equal(await hp(), 1280);
    assert.deepEqual(errors, []);
    console.log('PASS: actual offline launcher, curriculum, projector, imported questions, teacher reveal, validated counts, proportional damage, double submission, victory and replay.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
