const sql = require('mssql');
const { ipcMain } = require('electron');
const { getPool } = require('./connection');

async function getMailRequests(filter) {
  const pool = getPool();
  let query = 'SELECT TOP 500 ID, Subject, RecipientTo, RecipientCC, RecipientBCC, Sent, CreatedTime, SentTime, LastStatus FROM MailRequests';
  const request = pool.request();

  if (filter && filter.sentStatus === 'pending') {
    query += ' WHERE Sent = 0';
  } else if (filter && filter.sentStatus === 'sent') {
    query += ' WHERE Sent = 1';
  }

  query += ' ORDER BY ID DESC';
  const result = await request.query(query);
  return result.recordset;
}

async function getMailRequestById(id) {
  const pool = getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM MailRequests WHERE ID = @id');
  return result.recordset[0] || null;
}

function registerMailLogIpc() {
  ipcMain.handle('mailLog:getAll', async (_event, filter) => {
    try { return { success: true, data: await getMailRequests(filter) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('mailLog:getById', async (_event, id) => {
    try { return { success: true, data: await getMailRequestById(id) }; }
    catch (err) { return { success: false, message: err.message }; }
  });
}

module.exports = { registerMailLogIpc };
