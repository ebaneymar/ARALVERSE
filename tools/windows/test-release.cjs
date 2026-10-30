'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { _electron: electron } = require('playwright');

(async () => {
  const stage = path.resolve(process.argv[2] || path.join(__dirname, '../../.build/windows'));
  const { version } = JSON.parse(fs.readFileSync(path.join(stage, 'release.json'), 'utf8'));
  const dist = path.join(stage, 'dist');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'aralverse-windows-'));
  let running;
  async function checkApp(folder, previous) {
    const exe = path.join(folder, 'ARALVERSE.exe');
    assert.ok(fs.existsSync(exe), 'Complete EXE exists');
    const game = path.join(folder, 'resources/app');
    assert.equal(JSON.parse(fs.readFileSync(path.join(game, 'package.json'), 'utf8')).version, version);
    for (const name of ['assets/license-engine.cjs', 'assets/license-public-key.json', 'assets/activation-ui-1581.js', 'assets/layout-editor-1580.js']) {
      assert.ok(fs.existsSync(path.join(game, name)), 'Bundled startup asset: ' + name);
    }
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    running = await electron.launch({ executablePath: exe, env, timeout: 90000 });
    const page = await running.firstWindow({ timeout: 90000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.mathAPangDesktop?.isDesktop && typeof window.launchGame === 'function', null, { timeout: 60000 });
    const runtime = await running.evaluate(({ app }) => ({ version: app.getVersion(), packaged: app.isPackaged }));
    assert.equal(runtime.version, version);
    assert.equal(runtime.packaged, true);
    const status = await page.evaluate(() => window.mathAPangDesktop.activation.status());
    assert.equal(status.state, 'trial', 'Fresh Windows device can use its trial');
    assert.ok(status.remainingDays > 0 && status.remainingDays <= 7);
    assert.match(status.deviceCode, /^AV-(?:[A-F0-9]{8}-){3}[A-F0-9]{8}$/);
    if (previous) {
      assert.equal(status.deviceCode, previous.deviceCode, 'Same device identity across installations/restarts');
      assert.equal(status.trialStartedAt, previous.trialStartedAt, 'Reinstalling/restarting does not reset the trial');
    }
    const updater = await page.evaluate(() => window.mathAPangDesktop.updater.info());
    assert.equal(updater.engine, 'direct-install-v2');
    assert.ok(updater.config.manifestUrl.includes('/ebaneymar/ARALVERSE/'));
    await page.context().setOffline(true);
    if (previous?.sameFolder) {
      assert.equal(await page.evaluate(() => localStorage.getItem('aralverse::windows-release-smoke')), 'saved classroom data', 'Restored the previous saved classroom state before a new save');
    }
    await page.evaluate(() => {
      localStorage.setItem('aralverse::windows-release-smoke', 'saved classroom data');
      return window.mathAPangDesktop.saveNow();
    });
    const saved = JSON.parse(fs.readFileSync(path.join(folder, 'Data/ARALVERSE_Data.json'), 'utf8'));
    assert.equal(saved.localStorage['aralverse::windows-release-smoke'], 'saved classroom data');
    await page.evaluate(() => window.launchGame('tournament'));
    await page.waitForFunction(() => {
      const frame = document.getElementById('gameFrame');
      return frame?.contentDocument?.readyState === 'complete' && !!frame.contentDocument.getElementById('setup');
    }, null, { timeout: 60000 });
    assert.equal(await page.evaluate(() => typeof window.AVLayoutEditor1580?.open), 'function');
    await running.close();
    running = null;
    const log = fs.readFileSync(path.join(folder, 'StartupError.log'), 'utf8');
    assert.ok(log.includes(`Loaded ARALVERSE v${version} successfully.`));
    assert.ok(!/uncaughtException|Startup failed|loadFile failed|Cannot find module/.test(log), 'No silent startup failure');
    return status;
  }
  try {
    const installed = path.join(scratch, 'Installed');
    const result = spawnSync(path.join(dist, `ARALVERSE_Setup_${version}_x64.exe`), ['/S', '/D=' + installed], { timeout: 180000, encoding: 'utf8' });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, 'Windows installer completes: ' + result.stdout + result.stderr);
    const first = await checkApp(installed);
    await checkApp(installed, { ...first, sameFolder: true });
    console.log('PASS: installed EXE opens, native trial/IPC works, offline Tournament launches, data survives restart.');
    const portable = path.join(scratch, 'Portable');
    const zip = path.join(dist, `ARALVERSE_Windows_${version}_x64.zip`);
    const extract = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Expand-Archive -LiteralPath $env:ARAL_TEST_ZIP -DestinationPath $env:ARAL_TEST_DEST'], {
      env: { ...process.env, ARAL_TEST_ZIP: zip, ARAL_TEST_DEST: portable }, timeout: 180000, encoding: 'utf8',
    });
    if (extract.error) throw extract.error;
    assert.equal(extract.status, 0, extract.stdout + extract.stderr);
    await checkApp(path.join(portable, 'ARALVERSE'), first);
    console.log('PASS: extracted portable EXE opens with all assets and the same device identity.');
  } finally {
    if (running) await running.close().catch(() => {});
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

