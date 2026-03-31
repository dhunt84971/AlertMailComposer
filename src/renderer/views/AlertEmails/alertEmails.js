let alertsGrid = null;
let currentEditId = null;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initAlertEmailsView() {
  const container = document.getElementById('view-alerts');
  container.innerHTML = `
    <div class="toolbar">
      <h2>Alert Emails</h2>
      <button class="btn btn-primary" id="alerts-new-btn">+ New Alert</button>
      <button class="btn btn-danger" id="alerts-delete-btn" disabled>Delete</button>
      <button class="btn btn-secondary" id="alerts-refresh-btn">Refresh</button>
    </div>
    <div class="grid-container ag-theme-alpine-dark" id="alerts-grid"></div>

    <!-- Edit Panel -->
    <div id="alerts-edit-panel" style="display: none; margin-top: 20px;">
      <div class="card">
        <div class="toolbar" style="border-bottom: none; padding-bottom: 8px;">
          <h3 id="alerts-edit-title">New Alert</h3>
          <button class="btn btn-secondary" id="alerts-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="alerts-save-btn">Save</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="alert-enabled" checked>
              <label for="alert-enabled" style="margin-bottom: 0;">Enabled</label>
            </div>
            <div class="form-group">
              <label for="alert-subject">Subject *</label>
              <input type="text" id="alert-subject" maxlength="100" placeholder="Email subject line">
              <div class="error-message"></div>
            </div>
            <div class="form-group">
              <label for="alert-recipients">Recipients (TO) *</label>
              <input type="text" id="alert-recipients" maxlength="1000" placeholder="email1@example.com;email2@example.com">
              <div class="error-message"></div>
            </div>
            <div class="form-group">
              <label for="alert-recipientscc">Recipients CC</label>
              <input type="text" id="alert-recipientscc" maxlength="1000" placeholder="Semicolon-separated emails">
              <div class="error-message"></div>
            </div>
            <div class="form-group">
              <label for="alert-recipientsbcc">Recipients BCC</label>
              <input type="text" id="alert-recipientsbcc" maxlength="1000" placeholder="Semicolon-separated emails">
              <div class="error-message"></div>
            </div>
            <div class="form-group">
              <label for="alert-minutesresend">Minutes Resend (0 = send once)</label>
              <input type="number" id="alert-minutesresend" min="0" value="0">
              <div class="error-message"></div>
            </div>
          </div>
          <div id="alert-status-panel">
            <div class="form-group">
              <label>Last True</label>
              <input type="text" id="alert-lasttrue" readonly disabled style="opacity: 0.6;">
            </div>
            <div class="form-group">
              <label>Last True Time</label>
              <input type="text" id="alert-lasttruetime" readonly disabled style="opacity: 0.6;">
            </div>
            <div class="form-group">
              <label>Last Check Time</label>
              <input type="text" id="alert-lastchecktime" readonly disabled style="opacity: 0.6;">
            </div>
            <div class="form-group">
              <label>Last Status</label>
              <input type="text" id="alert-laststatus" readonly disabled style="opacity: 0.6;">
            </div>
          </div>
        </div>

        <!-- Trigger Query -->
        <div class="form-group" style="margin-top: 16px;">
          <label>Trigger Query (must return SendMail column)</label>
          <div id="alert-query-editor" style="height: 120px;"></div>
          <div class="error-message" id="alert-query-error"></div>
          <button class="btn btn-secondary" id="alert-test-trigger-btn" style="margin-top: 8px;">Test Trigger Query</button>
          <div class="query-result" id="trigger-query-result" style="display: none;"></div>
        </div>

        <!-- Message -->
        <div class="form-group">
          <label>Message (supports %%ColumnName%% and %%TABLE%% tokens)</label>
          <textarea id="alert-message" rows="5" maxlength="3000" placeholder="Email message body..." style="width: 100%; padding: 8px 12px; background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-family: inherit; font-size: 14px; resize: vertical;"></textarea>
          <div class="error-message" id="alert-message-error"></div>
        </div>

        <!-- Message Query -->
        <div class="form-group">
          <label>Message Query (optional - populates message template tokens)</label>
          <div id="alert-msgquery-editor" style="height: 120px;"></div>
          <div class="error-message" id="alert-msgquery-error"></div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="btn btn-secondary" id="alert-test-msgquery-btn">Test Message Query</button>
            <button class="btn btn-secondary" id="alert-preview-msg-btn">Preview Message</button>
          </div>
          <div class="query-result" id="msgquery-result" style="display: none;"></div>
          <div class="message-preview" id="message-preview" style="display: none;"></div>
        </div>
      </div>
    </div>
  `;

  // Wire up buttons
  document.getElementById('alerts-new-btn').addEventListener('click', newAlert);
  document.getElementById('alerts-delete-btn').addEventListener('click', deleteSelectedAlert);
  document.getElementById('alerts-refresh-btn').addEventListener('click', refreshAlertsList);
  document.getElementById('alerts-cancel-btn').addEventListener('click', cancelEdit);
  document.getElementById('alerts-save-btn').addEventListener('click', saveAlert);
  document.getElementById('alert-test-trigger-btn').addEventListener('click', testTriggerQuery);
  document.getElementById('alert-test-msgquery-btn').addEventListener('click', testMessageQuery);
  document.getElementById('alert-preview-msg-btn').addEventListener('click', previewMessage);

  initAlertsGrid();
}

function initAlertsGrid() {
  const gridDiv = document.getElementById('alerts-grid');
  const gridOptions = {
    columnDefs: [
      { field: 'ID', width: 70, sortable: true },
      {
        field: 'Enabled', width: 90, sortable: true,
        cellRenderer: (params) => {
          const checked = params.value ? 'checked' : '';
          return `<input type="checkbox" ${checked} onclick="toggleAlertEnabled(${params.data.ID}, this.checked); event.stopPropagation();">`;
        }
      },
      { field: 'Subject', flex: 1, sortable: true, filter: true },
      {
        field: 'LastCheckTime', headerName: 'Last Checked', width: 180, sortable: true,
        valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : ''
      },
      { field: 'LastStatus', headerName: 'Status', width: 200, sortable: true }
    ],
    rowSelection: { mode: 'singleRow' },
    onRowClicked: (event) => {
      document.getElementById('alerts-delete-btn').disabled = false;
      editAlert(event.data.ID);
    },
    defaultColDef: {
      resizable: true
    },
    domLayout: 'normal',
    getRowId: (params) => String(params.data.ID)
  };

  alertsGrid = agGrid.createGrid(gridDiv, gridOptions);
}

async function refreshAlertsList() {
  try {
    const result = await window.api.getAlerts();
    if (result.success) {
      alertsGrid.setGridOption('rowData', result.data);
    } else {
      window.app.showToast(`Failed to load alerts: ${result.message}`, 'error');
    }
  } catch (err) {
    window.app.showToast(`Error loading alerts: ${err.message}`, 'error');
  }
}

function newAlert() {
  currentEditId = null;
  document.getElementById('alerts-edit-title').textContent = 'New Alert';
  document.getElementById('alert-enabled').checked = true;
  document.getElementById('alert-subject').value = '';
  document.getElementById('alert-recipients').value = '';
  document.getElementById('alert-recipientscc').value = '';
  document.getElementById('alert-recipientsbcc').value = '';
  document.getElementById('alert-minutesresend').value = '0';
  document.getElementById('alert-message').value = '';
  document.getElementById('alert-status-panel').style.display = 'none';

  clearValidationErrors();
  hideQueryResults();
  document.getElementById('alerts-edit-panel').style.display = 'block';

  // Initialize editors now that the panel is visible, then clear content
  requestAnimationFrame(() => {
    if (window.ensureCodeMirrorEditors) window.ensureCodeMirrorEditors();
    if (window.alertQueryEditor) {
      window.alertQueryEditor.dispatch({ changes: { from: 0, to: window.alertQueryEditor.state.doc.length, insert: '' } });
    }
    if (window.alertMsgQueryEditor) {
      window.alertMsgQueryEditor.dispatch({ changes: { from: 0, to: window.alertMsgQueryEditor.state.doc.length, insert: '' } });
    }
  });
  document.getElementById('alert-subject').focus();
}

async function editAlert(id) {
  try {
    const result = await window.api.getAlert(id);
    if (!result.success || !result.data) {
      window.app.showToast('Failed to load alert', 'error');
      return;
    }
    const alert = result.data;
    currentEditId = alert.ID;
    document.getElementById('alerts-edit-title').textContent = `Edit Alert #${alert.ID}`;
    document.getElementById('alert-enabled').checked = !!alert.Enabled;
    document.getElementById('alert-subject').value = alert.Subject || '';
    document.getElementById('alert-recipients').value = alert.Recipients || '';
    document.getElementById('alert-recipientscc').value = alert.RecipientsCC || '';
    document.getElementById('alert-recipientsbcc').value = alert.RecipientsBCC || '';
    document.getElementById('alert-minutesresend').value = alert.MinutesResend || 0;
    document.getElementById('alert-message').value = alert.Message || '';

    // Status fields
    document.getElementById('alert-status-panel').style.display = 'block';
    document.getElementById('alert-lasttrue').value = alert.LastTrue ? 'Yes' : 'No';
    document.getElementById('alert-lasttruetime').value = alert.LastTrueTime ? new Date(alert.LastTrueTime).toLocaleString() : '';
    document.getElementById('alert-lastchecktime').value = alert.LastCheckTime ? new Date(alert.LastCheckTime).toLocaleString() : '';
    document.getElementById('alert-laststatus').value = alert.LastStatus || '';

    clearValidationErrors();
    hideQueryResults();
    document.getElementById('alerts-edit-panel').style.display = 'block';

    // Initialize editors now that the panel is visible, then set content
    requestAnimationFrame(() => {
      if (window.ensureCodeMirrorEditors) window.ensureCodeMirrorEditors();
      if (window.alertQueryEditor) {
        window.alertQueryEditor.dispatch({ changes: { from: 0, to: window.alertQueryEditor.state.doc.length, insert: alert.Query || '' } });
      }
      if (window.alertMsgQueryEditor) {
        window.alertMsgQueryEditor.dispatch({ changes: { from: 0, to: window.alertMsgQueryEditor.state.doc.length, insert: alert.MessageQuery || '' } });
      }
    });
  } catch (err) {
    window.app.showToast(`Error: ${err.message}`, 'error');
  }
}

function cancelEdit() {
  document.getElementById('alerts-edit-panel').style.display = 'none';
  currentEditId = null;
  document.getElementById('alerts-delete-btn').disabled = true;
}

async function deleteSelectedAlert() {
  const selectedRows = alertsGrid.getSelectedRows();
  if (selectedRows.length === 0) return;
  const id = selectedRows[0].ID;
  if (!confirm(`Delete alert #${id}?`)) return;

  try {
    const result = await window.api.deleteAlert(id);
    if (result.success) {
      window.app.showToast('Alert deleted', 'success');
      cancelEdit();
      refreshAlertsList();
    } else {
      window.app.showToast(`Failed to delete: ${result.message}`, 'error');
    }
  } catch (err) {
    window.app.showToast(`Error: ${err.message}`, 'error');
  }
}

// Validation
function validateAlertForm() {
  let valid = true;
  clearValidationErrors();

  const subject = document.getElementById('alert-subject').value.trim();
  if (!subject) {
    showFieldError('alert-subject', 'Subject is required');
    valid = false;
  } else if (subject.length > 100) {
    showFieldError('alert-subject', 'Subject must be 100 characters or less');
    valid = false;
  }

  const recipients = document.getElementById('alert-recipients').value.trim();
  if (!recipients) {
    showFieldError('alert-recipients', 'At least one recipient is required');
    valid = false;
  } else if (recipients.length > 1000) {
    showFieldError('alert-recipients', 'Recipients must be 1000 characters or less');
    valid = false;
  } else if (!validateEmails(recipients)) {
    showFieldError('alert-recipients', 'Invalid email format');
    valid = false;
  }

  const cc = document.getElementById('alert-recipientscc').value.trim();
  if (cc && cc.length > 1000) {
    showFieldError('alert-recipientscc', 'Recipients CC must be 1000 characters or less');
    valid = false;
  } else if (cc && !validateEmails(cc)) {
    showFieldError('alert-recipientscc', 'Invalid email format');
    valid = false;
  }

  const bcc = document.getElementById('alert-recipientsbcc').value.trim();
  if (bcc && bcc.length > 1000) {
    showFieldError('alert-recipientsbcc', 'Recipients BCC must be 1000 characters or less');
    valid = false;
  } else if (bcc && !validateEmails(bcc)) {
    showFieldError('alert-recipientsbcc', 'Invalid email format');
    valid = false;
  }

  const minutesResend = parseInt(document.getElementById('alert-minutesresend').value, 10);
  if (isNaN(minutesResend) || minutesResend < 0) {
    showFieldError('alert-minutesresend', 'Must be a non-negative integer');
    valid = false;
  }

  const queryText = window.alertQueryEditor ? window.alertQueryEditor.state.doc.toString() : '';
  if (queryText.length > 3000) {
    document.getElementById('alert-query-error').textContent = 'Query must be 3000 characters or less';
    document.getElementById('alert-query-error').style.display = 'block';
    valid = false;
  }
  const queryValidation = validateSqlQuery(queryText);
  if (queryText && !queryValidation.valid) {
    document.getElementById('alert-query-error').textContent = queryValidation.message;
    document.getElementById('alert-query-error').style.display = 'block';
    valid = false;
  }

  const message = document.getElementById('alert-message').value;
  if (message.length > 3000) {
    document.getElementById('alert-message-error').textContent = 'Message must be 3000 characters or less';
    document.getElementById('alert-message-error').style.display = 'block';
    valid = false;
  }

  const msgQueryText = window.alertMsgQueryEditor ? window.alertMsgQueryEditor.state.doc.toString() : '';
  if (msgQueryText.length > 3000) {
    document.getElementById('alert-msgquery-error').textContent = 'Query must be 3000 characters or less';
    document.getElementById('alert-msgquery-error').style.display = 'block';
    valid = false;
  }
  if (msgQueryText) {
    const mqValidation = validateSqlQuery(msgQueryText);
    if (!mqValidation.valid) {
      document.getElementById('alert-msgquery-error').textContent = mqValidation.message;
      document.getElementById('alert-msgquery-error').style.display = 'block';
      valid = false;
    }
  }

  return valid;
}

function validateEmails(str) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emails = str.split(';').map(e => e.trim()).filter(e => e);
  return emails.length > 0 && emails.every(e => emailRegex.test(e));
}

function validateSqlQuery(sql) {
  if (!sql.trim()) return { valid: true };
  const upper = sql.toUpperCase();
  const forbidden = ['INSERT ', 'UPDATE ', 'DELETE ', 'DROP ', 'ALTER ', 'TRUNCATE ', 'EXEC ', 'EXECUTE '];
  for (const kw of forbidden) {
    // Check for keyword at word boundary (not inside a string/comment)
    const regex = new RegExp('\\b' + kw.trim() + '\\b', 'i');
    if (regex.test(sql)) {
      return { valid: false, message: `Query must not contain ${kw.trim()} statements` };
    }
  }
  if (!upper.includes('SELECT')) {
    return { valid: false, message: 'Query must contain a SELECT statement' };
  }
  return { valid: true };
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const group = field.closest('.form-group');
  if (group) {
    group.classList.add('has-error');
    const errDiv = group.querySelector('.error-message');
    if (errDiv) errDiv.textContent = message;
  }
}

function clearValidationErrors() {
  document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
  document.querySelectorAll('.error-message').forEach(e => { e.textContent = ''; e.style.display = ''; });
  document.getElementById('alert-query-error').textContent = '';
  document.getElementById('alert-query-error').style.display = 'none';
  document.getElementById('alert-message-error').textContent = '';
  document.getElementById('alert-message-error').style.display = 'none';
  document.getElementById('alert-msgquery-error').textContent = '';
  document.getElementById('alert-msgquery-error').style.display = 'none';
}

function hideQueryResults() {
  document.getElementById('trigger-query-result').style.display = 'none';
  document.getElementById('msgquery-result').style.display = 'none';
  document.getElementById('message-preview').style.display = 'none';
}

async function saveAlert() {
  if (!validateAlertForm()) return;

  const saveBtn = document.getElementById('alerts-save-btn');
  saveBtn.disabled = true;

  const data = {
    Enabled: document.getElementById('alert-enabled').checked,
    Subject: document.getElementById('alert-subject').value.trim(),
    Recipients: document.getElementById('alert-recipients').value.trim(),
    RecipientsCC: document.getElementById('alert-recipientscc').value.trim(),
    RecipientsBCC: document.getElementById('alert-recipientsbcc').value.trim(),
    MinutesResend: parseInt(document.getElementById('alert-minutesresend').value, 10) || 0,
    Query: window.alertQueryEditor ? window.alertQueryEditor.state.doc.toString() : '',
    Message: document.getElementById('alert-message').value,
    MessageQuery: window.alertMsgQueryEditor ? window.alertMsgQueryEditor.state.doc.toString() : '',
  };

  try {
    let result;
    if (currentEditId) {
      result = await window.api.updateAlert(currentEditId, data);
    } else {
      result = await window.api.createAlert(data);
    }

    if (result.success) {
      window.app.showToast(currentEditId ? 'Alert updated' : 'Alert created', 'success');
      cancelEdit();
      refreshAlertsList();
    } else {
      window.app.showToast(`Failed to save: ${result.message}`, 'error');
    }
  } catch (err) {
    window.app.showToast(`Error: ${err.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
  }
}

// Query test execution
async function testTriggerQuery() {
  const queryText = window.alertQueryEditor ? window.alertQueryEditor.state.doc.toString() : '';
  if (!queryText.trim()) {
    window.app.showToast('No trigger query to test', 'error');
    return;
  }

  const validation = validateSqlQuery(queryText);
  if (!validation.valid) {
    window.app.showToast(validation.message, 'error');
    return;
  }

  const resultDiv = document.getElementById('trigger-query-result');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<p style="padding: 8px; color: var(--text-secondary);">Executing query...</p>';

  try {
    const result = await window.api.executeTriggerQuery(queryText);
    if (result.success) {
      let summaryHtml = '';
      if (result.recordset && result.recordset.length > 0 && 'SendMail' in result.recordset[0]) {
        const sendMailValue = result.recordset[0].SendMail;
        if (sendMailValue === 1) {
          summaryHtml = '<p style="padding: 8px; font-weight: bold; color: var(--success-color);">Result: Alert WOULD trigger (SendMail = 1)</p>';
        } else {
          summaryHtml = '<p style="padding: 8px; font-weight: bold; color: var(--error-color);">Result: Alert would NOT trigger (SendMail = 0)</p>';
        }
      }
      resultDiv.innerHTML = summaryHtml + renderQueryResult(result.recordset, result.columns, 'SendMail');
    } else {
      resultDiv.innerHTML = `<p style="padding: 8px; color: var(--error-color);">Error: ${result.message}</p>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="padding: 8px; color: var(--error-color);">Error: ${err.message}</p>`;
  }
}

async function testMessageQuery() {
  const queryText = window.alertMsgQueryEditor ? window.alertMsgQueryEditor.state.doc.toString() : '';
  if (!queryText.trim()) {
    window.app.showToast('No message query to test', 'error');
    return;
  }

  const validation = validateSqlQuery(queryText);
  if (!validation.valid) {
    window.app.showToast(validation.message, 'error');
    return;
  }

  const resultDiv = document.getElementById('msgquery-result');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<p style="padding: 8px; color: var(--text-secondary);">Executing query...</p>';

  try {
    const result = await window.api.executeMessageQuery(queryText);
    if (result.success) {
      resultDiv.innerHTML = renderQueryResult(result.recordset, result.columns);
    } else {
      resultDiv.innerHTML = `<p style="padding: 8px; color: var(--error-color);">Error: ${result.message}</p>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="padding: 8px; color: var(--error-color);">Error: ${err.message}</p>`;
  }
}

async function previewMessage() {
  const message = document.getElementById('alert-message').value;
  const msgQueryText = window.alertMsgQueryEditor ? window.alertMsgQueryEditor.state.doc.toString() : '';
  const previewDiv = document.getElementById('message-preview');

  if (!message) {
    window.app.showToast('No message to preview', 'error');
    return;
  }

  let rendered = message;

  if (msgQueryText.trim()) {
    try {
      const result = await window.api.executeMessageQuery(msgQueryText);
      if (result.success && result.recordset && result.recordset.length > 0) {
        rendered = applyMessageTokens(rendered, result.recordset, result.columns);
      } else if (!result.success) {
        previewDiv.style.display = 'block';
        previewDiv.innerHTML = `<p style="color: var(--error-color);">Query error: ${result.message}</p>`;
        return;
      }
    } catch (err) {
      previewDiv.style.display = 'block';
      previewDiv.innerHTML = `<p style="color: var(--error-color);">Error: ${err.message}</p>`;
      return;
    }
  }

  // Replace [CRLF] tokens with <br>
  rendered = rendered.replace(/\[CRLF\]/g, '<br>');

  previewDiv.style.display = 'block';
  previewDiv.innerHTML = `<div style="font-family: Arial, Helvetica, sans-serif;">${rendered}</div>`;
}

function applyMessageTokens(message, recordset, columns) {
  let result = message;

  // Handle %%TABLE:col1,col2%% tokens
  result = result.replace(/%%TABLE:([^%]+)%%/g, (_match, colSpec) => {
    const cols = colSpec.split(',').map(c => c.trim());
    return buildHtmlTable(recordset, cols);
  });

  // Handle %%TABLE%% tokens (all columns)
  result = result.replace(/%%TABLE%%/g, () => {
    return buildHtmlTable(recordset, columns);
  });

  // Handle %%ColumnName%% tokens (single value from first row)
  if (recordset.length > 0) {
    const firstRow = recordset[0];
    for (const col of columns) {
      const token = `%%${col}%%`;
      if (result.includes(token)) {
        result = result.split(token).join(firstRow[col] != null ? String(firstRow[col]) : '');
      }
    }
  }

  return result;
}

function buildHtmlTable(recordset, columns) {
  const maxRows = 100;
  let html = '<table style="border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; font-size: 13px;">';
  html += '<tr>';
  for (const col of columns) {
    html += `<th style="background-color: #006666; color: white; padding: 4px 8px; border: 1px solid #333;">${escapeHtml(col)}</th>`;
  }
  html += '</tr>';

  const rows = recordset.slice(0, maxRows);
  for (const row of rows) {
    html += '<tr>';
    for (const col of columns) {
      html += `<td style="background-color: #ffffcc; padding: 4px 8px; border: 1px solid #333; color: #000;">${escapeHtml(row[col])}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';

  if (recordset.length > maxRows) {
    html += '<br>Number of Rows Exceeds 100';
  }

  return html;
}

function renderQueryResult(recordset, columns, highlightColumn) {
  if (!recordset || recordset.length === 0) {
    return '<p style="padding: 8px; color: var(--text-secondary);">No rows returned</p>';
  }

  let html = '<table>';
  html += '<tr>';
  for (const col of columns) {
    html += `<th>${escapeHtml(col)}</th>`;
  }
  html += '</tr>';

  for (const row of recordset.slice(0, 100)) {
    html += '<tr>';
    for (const col of columns) {
      let cellStyle = '';
      if (highlightColumn && col === highlightColumn) {
        const val = row[col];
        cellStyle = val === 1 ? 'background-color: rgba(102, 187, 106, 0.3); font-weight: bold;'
                             : 'background-color: rgba(239, 83, 80, 0.2);';
      }
      html += `<td style="${cellStyle}">${escapeHtml(row[col])}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

// Global toggle function for grid checkbox
window.toggleAlertEnabled = async function(id, enabled) {
  try {
    const result = await window.api.toggleAlertEnabled(id, enabled);
    if (!result.success) {
      window.app.showToast(`Failed to toggle: ${result.message}`, 'error');
      refreshAlertsList();
    }
  } catch (err) {
    window.app.showToast(`Error: ${err.message}`, 'error');
    refreshAlertsList();
  }
};

window.initAlertEmailsView = initAlertEmailsView;
window.refreshAlertsList = refreshAlertsList;
