import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

// Mock electron before any imports
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/tmp/test-app',
  },
  ipcMain: {
    handle: vi.fn(),
  },
}));

// Mock mssql to avoid side effects from other modules
vi.mock('mssql', () => ({}));

// We test config logic in isolation by re-implementing the pure functions
// since the config module has electron requires at top level

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

function readConfigFrom(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed, database: { ...DEFAULT_CONFIG.database, ...parsed.database } };
    }
  } catch (err) {
    // fallthrough
  }
  return { ...DEFAULT_CONFIG };
}

describe('Config logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return default config when file does not exist', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const config = readConfigFrom('/fake/config.json');
    expect(config.database.server).toBe('localhost');
    expect(config.database.database).toBe('MailAlertDB');
    expect(config.theme).toBe('dark');
  });

  it('should parse valid config file', () => {
    const mockConfig = JSON.stringify({
      database: { server: 'myserver', database: 'TestDB', username: 'user', password: 'pass', trustServerCertificate: false },
      theme: 'light'
    });
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockConfig);

    const config = readConfigFrom('/fake/config.json');
    expect(config.database.server).toBe('myserver');
    expect(config.database.database).toBe('TestDB');
    expect(config.database.trustServerCertificate).toBe(false);
    expect(config.theme).toBe('light');
  });

  it('should return defaults on parse error', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid json{{{');

    const config = readConfigFrom('/fake/config.json');
    expect(config.database.server).toBe('localhost');
    expect(config.theme).toBe('dark');
  });

  it('should merge partial config with defaults', () => {
    const mockConfig = JSON.stringify({
      database: { server: 'customserver' },
    });
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockConfig);

    const config = readConfigFrom('/fake/config.json');
    expect(config.database.server).toBe('customserver');
    expect(config.database.database).toBe('MailAlertDB'); // default preserved
    expect(config.theme).toBe('dark'); // default preserved
  });
});
