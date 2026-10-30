"""Create the portable folder ZIP and checksums without packaging test data."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile


def finish(stage):
    info = json.loads((stage / 'release.json').read_text(encoding='utf-8'))
    version = info['version']
    dist = stage / 'dist'
    portable = dist / 'win-unpacked'
    if not (portable / 'ARALVERSE.exe').is_file():
        raise ValueError('The Windows runtime has not been built.')
    setup = dist / f'ARALVERSE_Setup_{version}_x64.exe'
    if not setup.is_file():
        raise ValueError('The installer has not been built.')
    readme = f'''ARALVERSE {version} - COMPLETE WINDOWS DOWNLOAD

For a new Windows 10/11 64-bit laptop:
1. Run ARALVERSE_Setup_{version}_x64.exe.
2. Open ARALVERSE using its desktop shortcut.
You do not need v1.08 or any earlier game version first.
The installer includes the game, its assets, and the Windows runtime.

Portable alternative:
1. Extract the WHOLE ARALVERSE_Windows_{version}_x64.zip to a writable folder,
   such as a folder on your Desktop.
2. Open ARALVERSE.exe inside the extracted ARALVERSE folder.
Keep the resources folder and DLL files beside the EXE. Do not run it from
inside the ZIP and do not copy just the EXE to another folder.

Saved classroom data:
If your older copy already has students or progress, keep a backup of its
Data folder. With both copies closed, you can copy that Data folder beside
the new ARALVERSE.exe. Replacing or reinstalling an app is not a substitute
for a classroom-data backup.

Activation:
The existing 7-day device trial and device activation are retained.
Settings > Activation Key shows the device code for the laptop.
The owner manager and its password are separate and are never included.

If a window still does not open:
Send the StartupError.log from beside ARALVERSE.exe, and the Windows
version / System type shown in Settings > System > About.
'''
    (dist / 'WINDOWS_README.txt').write_text(readme, encoding='utf-8')
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file in sorted(portable.rglob('*')):
            if not file.is_file():
                continue
            relative = file.relative_to(portable)
            if relative.parts[0] in {'Data', 'UpdaterBackup'} or file.name in {'StartupError.log', 'UpdaterLastRun.log', 'UpdaterConfig.json'}:
                raise ValueError('Refusing to publish local test or classroom data: ' + str(relative))
            archive.writestr('ARALVERSE/' + relative.as_posix(), file.read_bytes())
        archive.writestr('ARALVERSE/READ_ME_FIRST.txt', readme.encode('utf-8'))
    package = dist / f'ARALVERSE_Windows_{version}_x64.zip'
    package.write_bytes(buffer.getvalue())
    with zipfile.ZipFile(package) as archive:
        bad = archive.testzip()
        if bad:
            raise ValueError('Invalid portable archive: ' + bad)
    downloads = [setup, package, dist / 'WINDOWS_README.txt']
    checksums = ''.join(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + file.name + '\n' for file in downloads)
    (dist / 'SHA256SUMS.txt').write_text(checksums, encoding='utf-8')
    (stage / 'RELEASE_NOTES.md').write_text(f'''Complete ARALVERSE {version} for Windows 10/11 (64-bit).

Download **ARALVERSE_Setup_{version}_x64.exe**, install it, then open the desktop shortcut. No old version or update chain is needed.

The portable ZIP is an alternative: extract the entire ZIP, then open ARALVERSE.exe. Keep all supporting files with the EXE.

Includes all current game assets, the layout editor, and device activation. Existing trials and activation are retained. Back up the old Data folder before replacing an existing copy with saved classroom progress.

This complete distribution repairs the missing-runtime/assets problem that can occur when jumping directly from an early updater to v1.5.81.
''', encoding='utf-8')
    print(json.dumps({'downloads': [str(file) for file in downloads], 'checksums': checksums}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', type=Path)
    finish(parser.parse_args().stage)

