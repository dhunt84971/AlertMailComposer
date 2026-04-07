const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
const { execFile } = require('child_process');
const { readConfig, writeConfig } = require('./config');

const SERVICES = {
  MailAlertServer: {
    serviceName: 'MailAlertServer',
    defaultConfigPath: 'C:\\Program Files\\AlertMailService\\MailAlertServer\\config.txt'
  },
  MailRequestServer: {
    serviceName: 'MailRequestServer',
    defaultConfigPath: 'C:\\Program Files\\AlertMailService\\MailRequestServer\\config.txt'
  }
};

function parseScQc(stdout) {
  // BINARY_PATH_NAME    : "C:\Path\To\Service.exe" args
  // Or unquoted: C:\Path With Spaces\Service.exe arg1 arg2
  const m = stdout.match(/BINARY_PATH_NAME\s*:\s*(.+)/i);
  if (!m) return null;
  let line = m[1].trim();
  // Strip leading NT prefix if present
  if (line.startsWith('\\??\\')) line = line.slice(4);

  if (line.startsWith('"')) {
    const end = line.indexOf('"', 1);
    if (end > 0) return line.slice(1, end);
    return line.slice(1);
  }

  // Unquoted: path may contain spaces. Try the full line, then progressively
  // trim trailing whitespace-delimited tokens until we find an existing .exe.
  const tokens = line.split(/\s+/);
  for (let i = tokens.length; i > 0; i--) {
    const candidate = tokens.slice(0, i).join(' ');
    if (fs.existsSync(candidate)) return candidate;
  }
  // Fall back: take everything up to ".exe" if present
  const exeIdx = line.toLowerCase().indexOf('.exe');
  if (exeIdx >= 0) return line.slice(0, exeIdx + 4);
  return tokens[0];
}

async function getServiceImageDir(key) {
  const svc = SERVICES[key];
  const result = await run('sc.exe', ['qc', svc.serviceName]);
  if (result.code !== 0) return null;
  const exe = parseScQc(result.stdout);
  if (!exe) return null;
  try {
    return path.dirname(exe);
  } catch {
    return null;
  }
}

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout, stderr) => {
      resolve({
        code: err ? (err.code ?? 1) : 0,
        stdout: (stdout || '').toString(),
        stderr: (stderr || '').toString(),
        message: err ? err.message : ''
      });
    });
  });
}

function formatRunError(prefix, result) {
  const parts = [];
  if (result.stdout && result.stdout.trim()) parts.push(result.stdout.trim());
  if (result.stderr && result.stderr.trim()) parts.push(result.stderr.trim());
  if (!parts.length && result.message) parts.push(result.message);
  if (typeof result.code === 'number') parts.push(`(exit ${result.code})`);
  let msg = `${prefix}: ${parts.join(' ')}`;
  if (/access is denied|denied|\b5\b/i.test(msg)) {
    msg += ' — try running AlertMailComposer as Administrator.';
  }
  return msg;
}

async function getServiceConfigPath(key) {
  const cfg = readConfig();
  const overrides = (cfg.services && cfg.services[key]) || {};
  if (overrides.configPath) return overrides.configPath;
  const dir = await getServiceImageDir(key);
  if (dir) return path.join(dir, 'config.txt');
  return SERVICES[key].defaultConfigPath;
}

function setServiceConfigPath(key, configPath) {
  const cfg = readConfig();
  if (!cfg.services) cfg.services = {};
  if (!cfg.services[key]) cfg.services[key] = {};
  cfg.services[key].configPath = configPath;
  writeConfig(cfg);
}

function parseScQuery(stdout) {
  // Look for "STATE              : 4  RUNNING" etc.
  const m = stdout.match(/STATE\s*:\s*\d+\s+(\w+)/);
  if (m) return m[1].toUpperCase();
  return 'UNKNOWN';
}

async function getStatus(key) {
  const svc = SERVICES[key];
  if (!svc) throw new Error(`Unknown service: ${key}`);
  const result = await run('sc.exe', ['query', svc.serviceName]);
  if (result.code !== 0) {
    if (/1060|does not exist/i.test(result.stdout + result.stderr)) {
      return { installed: false, state: 'NOT_INSTALLED' };
    }
    return { installed: false, state: 'ERROR', error: result.stderr.trim() || result.stdout.trim() };
  }
  return { installed: true, state: parseScQuery(result.stdout) };
}

async function startService(key) {
  const svc = SERVICES[key];
  const result = await run('sc.exe', ['start', svc.serviceName]);
  if (result.code !== 0 && !/1056|already/i.test(result.stdout + result.stderr)) {
    throw new Error(formatRunError(`Failed to start ${svc.serviceName}`, result));
  }
  return getStatus(key);
}

async function stopService(key) {
  const svc = SERVICES[key];
  const result = await run('sc.exe', ['stop', svc.serviceName]);
  if (result.code !== 0 && !/1062|not started/i.test(result.stdout + result.stderr)) {
    throw new Error(formatRunError(`Failed to stop ${svc.serviceName}`, result));
  }
  return getStatus(key);
}

async function readServiceConfig(key) {
  const filePath = await getServiceConfigPath(key);
  if (!fs.existsSync(filePath)) {
    return { exists: false, path: filePath, content: '' };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return { exists: true, path: filePath, content };
}

async function writeServiceConfig(key, content) {
  const filePath = await getServiceConfigPath(key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory does not exist: ${dir}`);
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return { success: true, path: filePath };
}

function registerServicesIpc() {
  ipcMain.handle('services:list', () => Object.keys(SERVICES));

  ipcMain.handle('services:getStatus', async (_e, key) => getStatus(key));
  ipcMain.handle('services:start', async (_e, key) => startService(key));
  ipcMain.handle('services:stop', async (_e, key) => stopService(key));

  ipcMain.handle('services:getConfigPath', async (_e, key) => getServiceConfigPath(key));
  ipcMain.handle('services:setConfigPath', (_e, key, p) => {
    setServiceConfigPath(key, p);
    return { success: true };
  });

  ipcMain.handle('services:readConfig', (_e, key) => readServiceConfig(key));
  ipcMain.handle('services:writeConfig', (_e, key, content) => writeServiceConfig(key, content));
}

module.exports = { registerServicesIpc, SERVICES };
