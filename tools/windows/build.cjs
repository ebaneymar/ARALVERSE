'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { build, Platform, Arch } = require('electron-builder');

(async () => {
  if (process.platform !== 'win32') throw Error('Build and verify this installer on Windows.');
  const stage = path.resolve(process.argv[2] || path.join(__dirname, '../../.build/windows'));
  const info = JSON.parse(fs.readFileSync(path.join(stage, 'release.json'), 'utf8'));
  const appDir = path.join(stage, 'app');
  await build({
    projectDir: __dirname,
    targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64),
    publish: 'never',
    config: {
      appId: 'ph.aralverse.desktop',
      productName: 'ARALVERSE',
      electronVersion: info.electronVersion,
      directories: { app: appDir, output: path.join(stage, 'dist') },
      // The in-game updater replaces loose app files and assets in resources/app.
      asar: false,
      npmRebuild: false,
      files: ['**/*'],
      compression: 'normal',
      extraMetadata: { author: 'ARALVERSE' },
      win: {
        icon: path.join(appDir, 'assets/ARALVERSE.ico'),
        executableName: 'ARALVERSE',
        requestedExecutionLevel: 'asInvoker',
        artifactName: `ARALVERSE_Setup_${info.version}_x64.\${ext}`,
      },
      nsis: {
        oneClick: false,
        perMachine: false,
        allowElevation: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: 'always',
        createStartMenuShortcut: true,
        shortcutName: 'ARALVERSE',
        runAfterFinish: false,
        deleteAppDataOnUninstall: false,
        differentialPackage: false,
      },
      publish: null,
    },
  });
  console.log('Built complete Windows installer, runtime, and writable resources/app.');
})().catch(error => { console.error(error); process.exitCode = 1; });

