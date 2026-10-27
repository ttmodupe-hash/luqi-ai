/**
 * Luqi-AI v3.6.0 — Electron Main Process
 * Desktop app for Windows, macOS, and Linux.
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const IS_DEV = process.env.NODE_ENV === 'development';
const SMOKE_TEST = process.argv.includes('--luqi-smoke-test');
const DEFAULT_API_URL = 'http://localhost:8080';

let mainWindow;

function getApiUrl() {
  // Check for config file
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.apiUrl) return config.apiUrl;
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_API_URL;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    backgroundColor: '#09090b',
    icon: path.join(__dirname, '../public/icon-512.png'),
  });

  // Load the app
  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'ui/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Prevent a remote page from inheriting this window's preload bridge.
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

  if (SMOKE_TEST) {
    const timeout = setTimeout(() => app.exit(1), 20000);
    mainWindow.webContents.on('did-fail-load', () => app.exit(1));
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        // Compact navigation can hide menu labels. Check the actual home
        // heading and workspace shell rather than a responsive menu's text.
        const rendered = await mainWindow.webContents.executeJavaScript(`Boolean(
          document.querySelector('#workspace-content main #workspace-title')?.textContent.includes('A little curiosity') &&
          document.querySelector('a[aria-label="Luqi workspace home"]')
        )`);
        if (!rendered) throw new Error('Workspace did not render');
        console.log('Desktop workspace rendered successfully');
        clearTimeout(timeout);
        app.exit(0);
      } catch { app.exit(1); }
    });
  }

  // Open only ordinary web links; never pass custom OS protocols to the shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (['https:', 'http:'].includes(new URL(url).protocol)) {
        void shell.openExternal(url).catch(() => {});
      }
    } catch { /* Malformed links are denied. */ }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle('get-api-url', () => getApiUrl());

ipcMain.handle('set-api-url', (event, url) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  config.apiUrl = url;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return true;
});

ipcMain.handle('get-app-version', () => '3.6.0');

ipcMain.handle('get-platform', () => process.platform);
