const sql = require('mssql');
const { ipcMain } = require('electron');
const { readConfig } = require('../config');

let pool = null;
let connected = false;

function buildSqlConfig(dbConfig) {
  return {
    server: dbConfig.server,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password,
    options: {
      trustServerCertificate: dbConfig.trustServerCertificate !== false,
      encrypt: true
    },
    connectionTimeout: 10000,
    requestTimeout: 30000,
    pool: {
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000
    }
  };
}

async function connect(dbConfig) {
  await disconnect();
  const config = dbConfig || readConfig().database;
  if (!config.server || !config.server.trim()) {
    throw new Error('Database server is required. Please check your connection settings.');
  }
  if (!config.database || !config.database.trim()) {
    throw new Error('Database name is required. Please check your connection settings.');
  }
  const sqlConfig = buildSqlConfig(config);
  pool = await sql.connect(sqlConfig);
  connected = true;
  return pool;
}

async function disconnect() {
  if (pool) {
    try {
      await pool.close();
    } catch (err) {
      console.error('Error closing pool:', err.message);
    }
    pool = null;
    connected = false;
  }
}

function getPool() {
  if (!pool || !connected || !pool.connected) {
    throw new Error('Not connected to database. Please check your connection settings.');
  }
  return pool;
}

function isConnected() {
  return connected && pool && pool.connected;
}

async function testConnection(dbConfig) {
  let testPool = null;
  try {
    const sqlConfig = buildSqlConfig(dbConfig);
    testPool = await new sql.ConnectionPool(sqlConfig).connect();
    await testPool.request().query('SELECT 1 AS test');
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    if (testPool) {
      try { await testPool.close(); } catch {}
    }
  }
}

function registerConnectionIpc() {
  ipcMain.handle('db:testConnection', async (_event, dbConfig) => {
    return testConnection(dbConfig);
  });

  ipcMain.handle('db:getConnectionStatus', () => {
    return { connected: isConnected() };
  });

  ipcMain.handle('db:connect', async () => {
    try {
      await connect();
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });
}

module.exports = { connect, disconnect, getPool, isConnected, testConnection, registerConnectionIpc };
