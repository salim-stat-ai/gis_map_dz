# GIS Map — Portable Desktop Edition (GitHub Distribution)

This folder hosts the standalone **Portable Desktop Edition** tooling for **GIS Map – Algeria Geo-Intelligence 2030**, built and distributed strictly via GitHub Releases / local build rather than inside the web UI.

## Option 1: Zero-Install Portable Single-File Bundle
From the repository root:
```bash
npm run build:portable
cp dist-portable/index.html desktop-portable/GIS-Map-Algeria-2030-Portable.html
```
Then double-click:
- **Windows:** `Start-GIS-Map-Desktop.bat` (launches in dedicated app window without browser tabs)
- **macOS:** `Start-GIS-Map-Desktop.command`
- **Linux:** `Start-GIS-Map-Desktop.sh`

## Option 2: Native Electron Portable Binary (`.exe` / `.AppImage`)
```bash
npm run build:portable
cp dist-portable/index.html desktop-portable/GIS-Map-Algeria-2030-Portable.html
cd desktop-portable
npm install
npm run pack:win    # produces release/GIS-Map-Algeria-2030-Portable.exe
npm run pack:linux  # produces release/*.AppImage
```

## Automated GitHub Releases
Pushing any version tag (e.g. `git tag v2.0.0 && git push --tags`) or manually running the **Build Portable Desktop Edition** workflow on GitHub automatically compiles and attaches the `.zip`, `.exe`, `.AppImage`, and single-file `.html` portable releases.
