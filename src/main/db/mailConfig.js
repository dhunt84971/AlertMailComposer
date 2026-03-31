const sql = require('mssql');
const { ipcMain } = require('electron');
const { getPool } = require('./connection');

async function getMailConfig() {
  const pool = getPool();
  const result = await pool.request().query(
    'SELECT TOP 1 ID, ServerURL, ServerPort, Username, Password, SenderName, SenderAddress, ServiceCommand FROM MailConfig'
  );
  return result.recordset[0] || null;
}

function bindMailConfigFields(request, data) {
  return request
    .input('ServerURL', sql.VarChar(100), data.ServerURL)
    .input('ServerPort', sql.Int, data.ServerPort)
    .input('Username', sql.VarChar(50), data.Username || '')
    .input('Password', sql.VarChar(150), data.Password || '')
    .input('SenderName', sql.VarChar(50), data.SenderName || '')
    .input('SenderAddress', sql.VarChar(50), data.SenderAddress || '')
    .input('ServiceCommand', sql.VarChar(50), data.ServiceCommand || '');
}

async function updateMailConfig(data) {
  const pool = getPool();
  const existing = await getMailConfig();

  if (existing) {
    const request = bindMailConfigFields(pool.request(), data);
    await request
      .input('id', sql.Int, existing.ID)
      .query(`UPDATE MailConfig SET
              ServerURL = @ServerURL, ServerPort = @ServerPort,
              Username = @Username, Password = @Password,
              SenderName = @SenderName, SenderAddress = @SenderAddress,
              ServiceCommand = @ServiceCommand
              WHERE ID = @id`);
  } else {
    const request = bindMailConfigFields(pool.request(), data);
    await request
      .query(`INSERT INTO MailConfig (ServerURL, ServerPort, Username, Password, SenderName, SenderAddress, ServiceCommand)
              VALUES (@ServerURL, @ServerPort, @Username, @Password, @SenderName, @SenderAddress, @ServiceCommand)`);
  }
  return { success: true };
}

function registerMailConfigIpc() {
  ipcMain.handle('mailConfig:get', async () => {
    try { return { success: true, data: await getMailConfig() }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('mailConfig:update', async (_event, data) => {
    try { return { success: true, data: await updateMailConfig(data) }; }
    catch (err) { return { success: false, message: err.message }; }
  });
}

module.exports = { registerMailConfigIpc };
