const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');

const DEFAULT_CONFIG = {
  database: {
    server: 'localhost',
    database: 'MailAlertDB',
    username: '',
    password: '',
    trustServerCertificate: true
  },
  theme: 'dark'
};

function getConfigPath() {
  // In packaged app, use userData (writable); in dev, project root
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'config.json');
  }
  return path.join(app.getAppPath(), 'config.json');
}

function getInstallerConfigPath() {
  // Fallback path for initial config bundled by the installer
  return path.join(process.resourcesPath, 'config.json');
}

function readConfig() {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed, database: { ...DEFAULT_CONFIG.database, ...parsed.database } };
    }
  } catch (err) {
    console.error('Error reading config.json:', err.message);
  }

  // In packaged builds, fall back to installer-bundled config in resourcesPath
  if (app.isPackaged) {
    const fallbackPath = getInstallerConfigPath();
    try {
      if (fs.existsSync(fallbackPath)) {
        const raw = fs.readFileSync(fallbackPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed, database: { ...DEFAULT_CONFIG.database, ...parsed.database } };
      }
    } catch (err) {
      console.error('Error reading fallback config.json:', err.message);
    }
  }

  return { ...DEFAULT_CONFIG };
}

function writeConfig(config) {
  const configPath = getConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing config.json:', err.message);
    throw new Error(`Failed to save configuration: ${err.message}`);
  }
}

function registerConfigIpc() {
  ipcMain.handle('config:get', () => {
    return readConfig();
  });

  ipcMain.handle('config:save', (_event, config) => {
    writeConfig(config);
    return { success: true };
  });
}

module.exports = { readConfig, writeConfig, registerConfigIpc, getConfigPath };
