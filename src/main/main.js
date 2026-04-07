const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { registerConfigIpc } = require('./config');
const { registerConnectionIpc, disconnect } = require('./db/connection');
const { registerAlertIpc } = require('./db/alertEmails');
const { registerMailConfigIpc } = require('./db/mailConfig');
const { registerMailLogIpc } = require('./db/mailLog');
const { registerServicesIpc } = require('./services');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AlertMailComposer',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerConfigIpc();
  registerConnectionIpc();
  registerAlertIpc();
  registerMailConfigIpc();
  registerMailLogIpc();
  registerServicesIpc();
  createWindow();
});

app.on('before-quit', async () => {
  try {
    await disconnect();
  } catch (err) {
    console.error('Error disconnecting on quit:', err.message);
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
