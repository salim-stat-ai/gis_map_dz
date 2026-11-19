const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#070D1B',
    title: 'GIS Map – Algeria Geo-Intelligence 2030 (Portable)',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'pwa-512x512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Prefer single-file portable build or dist/index.html, falling back to local HTML next to main.cjs
  const candidates = [
    path.join(__dirname, '..', 'dist-portable', 'index.html'),
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(__dirname, 'GIS-Map-Algeria-2030-Portable.html'),
  ];

  const targetHtml = candidates.find((p) => fs.existsSync(p));
  if (targetHtml) {
    mainWindow.loadFile(targetHtml);
  } else {
    mainWindow.loadURL('http://127.0.0.1:3000');
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
