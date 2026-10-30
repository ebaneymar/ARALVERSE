# Complete Windows downloads

The v1.5.81 update ZIP is an app update, not a complete Windows runtime. Early
updaters copied only game.html, main.js, preload.js, and package.json. They did
not copy the assets directory. Jumping directly from such an updater to an app
that requires assets/license-engine.cjs can therefore fail before a window opens.

The Windows release workflow packages the exact verified v1.5.81 app with
Electron 44.10.0 for Windows 10/11 x64. It publishes a per-user Setup EXE and a
complete portable folder ZIP. Both include all assets and use resources/app
without ASAR, as required by the existing in-game updater. No owner signing key,
activation manager, or manager password is included.

Before publishing, the Windows job installs the Setup EXE, opens the real game,
checks native licensing, opens Tournament offline, verifies saved data after a
restart, and opens the EXE extracted from the portable ZIP.

Download from the repository's v1.5.81 Release. Existing users should back up
the Data folder before replacing an older copy. To move classroom data, close
both copies and copy the old Data folder beside the new ARALVERSE.exe. Device
activation stays in the existing licensing locations outside the game folder.

To rebuild, run tools/prepare_windows_release.py, npm ci --prefix tools/windows,
node tools/windows/build.cjs, python tools/finish_windows_release.py .build/windows,
and node tools/windows/test-release.cjs on Windows. Review the pinned base hash
and version before adapting this workflow for a later release.
