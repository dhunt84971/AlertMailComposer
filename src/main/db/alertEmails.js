const sql = require('mssql');
const { ipcMain } = require('electron');
const { getPool } = require('./connection');

function validateId(id) {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid ID: must be a positive integer');
  }
  return parsed;
}

async function getAllAlerts() {
  const pool = getPool();
  const result = await pool.request().query(
    'SELECT ID, Enabled, Subject, LastCheckTime, LastStatus, LastTrue, LastTrueTime, MinutesResend FROM MailAlerts ORDER BY ID'
  );
  return result.recordset;
}

async function getAlertById(id) {
  const validId = validateId(id);
  const pool = getPool();
  const result = await pool.request()
    .input('id', sql.Int, validId)
    .query('SELECT * FROM MailAlerts WHERE ID = @id');
  return result.recordset[0] || null;
}

function bindAlertFields(request, data) {
  return request
    .input('Enabled', sql.Bit, data.Enabled ? 1 : 0)
    .input('Query', sql.VarChar(3000), data.Query || '')
    .input('Subject', sql.VarChar(100), data.Subject)
    .input('Message', sql.VarChar(3000), data.Message || '')
    .input('Recipients', sql.VarChar(1000), data.Recipients)
    .input('RecipientsCC', sql.VarChar(1000), data.RecipientsCC || '')
    .input('RecipientsBCC', sql.VarChar(1000), data.RecipientsBCC || '')
    .input('MinutesResend', sql.Int, data.MinutesResend || 0)
    .input('MessageQuery', sql.VarChar(3000), data.MessageQuery || '');
}

async function createAlert(data) {
  if (!data.Subject || !data.Subject.trim()) {
    throw new Error('Subject is required');
  }
  if (!data.Recipients || !data.Recipients.trim()) {
    throw new Error('Recipients is required');
  }
  const pool = getPool();
  const request = bindAlertFields(pool.request(), data);
  const result = await request
    .query(`INSERT INTO MailAlerts (Enabled, Query, Subject, Message, Recipients, RecipientsCC, RecipientsBCC, MinutesResend, MessageQuery)
            OUTPUT INSERTED.ID
            VALUES (@Enabled, @Query, @Subject, @Message, @Recipients, @RecipientsCC, @RecipientsBCC, @MinutesResend, @MessageQuery)`);
  return result.recordset[0];
}

async function updateAlert(id, data) {
  const validId = validateId(id);
  const pool = getPool();
  const request = bindAlertFields(pool.request(), data);
  const result = await request
    .input('id', sql.Int, validId)
    .query(`UPDATE MailAlerts SET
            Enabled = @Enabled, Query = @Query, Subject = @Subject, Message = @Message,
            Recipients = @Recipients, RecipientsCC = @RecipientsCC, RecipientsBCC = @RecipientsBCC,
            MinutesResend = @MinutesResend, MessageQuery = @MessageQuery
            WHERE ID = @id`);
  if (result.rowsAffected[0] === 0) {
    throw new Error(`Alert with ID ${validId} not found`);
  }
  return { success: true };
}

async function deleteAlert(id) {
  const validId = validateId(id);
  const pool = getPool();
  const result = await pool.request()
    .input('id', sql.Int, validId)
    .query('DELETE FROM MailAlerts WHERE ID = @id');
  if (result.rowsAffected[0] === 0) {
    throw new Error(`Alert with ID ${validId} not found`);
  }
  return { success: true };
}

async function toggleEnabled(id, enabled) {
  const validId = validateId(id);
  const pool = getPool();
  await pool.request()
    .input('id', sql.Int, validId)
    .input('enabled', sql.Bit, enabled ? 1 : 0)
    .query('UPDATE MailAlerts SET Enabled = @enabled WHERE ID = @id');
  return { success: true };
}

function validateQueryServerSide(queryText) {
  if (!queryText || !queryText.trim()) {
    return { valid: false, message: 'Query cannot be empty' };
  }
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE'];
  for (const kw of forbidden) {
    const regex = new RegExp('\\b' + kw + '\\b', 'i');
    if (regex.test(queryText)) {
      return { valid: false, message: `Query must not contain ${kw} statements` };
    }
  }
  if (!queryText.toUpperCase().includes('SELECT')) {
    return { valid: false, message: 'Query must contain a SELECT statement' };
  }
  return { valid: true };
}

async function executeReadOnlyQuery(queryText) {
  const validation = validateQueryServerSide(queryText);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const pool = getPool();
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const request = transaction.request();
    request.timeout = 30000;
    const result = await request.query(queryText);
    await transaction.rollback();
    return { success: true, recordset: result.recordset, columns: Object.keys(result.recordset[0] || {}) };
  } catch (err) {
    try { await transaction.rollback(); } catch {}
    return { success: false, message: err.message };
  }
}

async function executeTriggerQuery(queryText) {
  return executeReadOnlyQuery(queryText);
}

async function executeMessageQuery(queryText) {
  return executeReadOnlyQuery(queryText);
}

function registerAlertIpc() {
  ipcMain.handle('alerts:getAll', async () => {
    try { return { success: true, data: await getAllAlerts() }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('alerts:getById', async (_event, id) => {
    try { return { success: true, data: await getAlertById(id) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('alerts:create', async (_event, data) => {
    try { return { success: true, data: await createAlert(data) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('alerts:update', async (_event, id, data) => {
    try { return { success: true, data: await updateAlert(id, data) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('alerts:delete', async (_event, id) => {
    try { return { success: true, data: await deleteAlert(id) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('alerts:toggleEnabled', async (_event, id, enabled) => {
    try { return { success: true, data: await toggleEnabled(id, enabled) }; }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('query:executeTrigger', async (_event, queryText) => {
    try { return await executeTriggerQuery(queryText); }
    catch (err) { return { success: false, message: err.message }; }
  });

  ipcMain.handle('query:executeMessage', async (_event, queryText) => {
    try { return await executeMessageQuery(queryText); }
    catch (err) { return { success: false, message: err.message }; }
  });
}

module.exports = { registerAlertIpc };
