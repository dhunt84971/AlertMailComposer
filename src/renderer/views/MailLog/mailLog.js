let mailLogGrid = null;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initMailLogView() {
  const container = document.getElementById('view-maillog');
  container.innerHTML = `
    <div class="toolbar">
      <h2>Mail Log</h2>
      <select id="maillog-filter" style="padding: 6px 10px; background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 14px;">
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="sent">Sent / Attempted</option>
      </select>
      <button class="btn btn-secondary" id="maillog-refresh-btn">Refresh</button>
    </div>
    <div class="grid-container ag-theme-alpine-dark" id="maillog-grid" style="height: 500px;"></div>
  `;

  document.getElementById('maillog-refresh-btn').addEventListener('click', refreshMailLog);
  document.getElementById('maillog-filter').addEventListener('change', refreshMailLog);

  initMailLogGrid();
}

function initMailLogGrid() {
  const gridDiv = document.getElementById('maillog-grid');
  const gridOptions = {
    columnDefs: [
      { field: 'ID', width: 70, sortable: true },
      { field: 'Subject', flex: 1, sortable: true, filter: true },
      { field: 'RecipientTo', headerName: 'To', width: 200, sortable: true },
      {
        field: 'Sent', width: 90, sortable: true,
        cellRenderer: (params) => {
          if (params.value) {
            return '<span style="color: var(--success-color); font-weight: bold;">Sent</span>';
          }
          return '<span style="color: var(--warning-color);">Pending</span>';
        }
      },
      {
        field: 'CreatedTime', headerName: 'Created', width: 170, sortable: true,
        valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : ''
      },
      {
        field: 'SentTime', headerName: 'Sent Time', width: 170, sortable: true,
        valueFormatter: (params) => params.value ? new Date(params.value).toLocaleString() : ''
      },
      { field: 'LastStatus', headerName: 'Status', width: 180, sortable: true }
    ],
    rowSelection: { mode: 'singleRow' },
    onRowClicked: (event) => {
      showMailLogDetail(event.data.ID);
    },
    defaultColDef: {
      resizable: true
    },
    domLayout: 'normal',
    getRowId: (params) => String(params.data.ID)
  };

  mailLogGrid = agGrid.createGrid(gridDiv, gridOptions);
}

async function refreshMailLog() {
  const filterValue = document.getElementById('maillog-filter').value;
  const filter = filterValue === 'all' ? {} : { sentStatus: filterValue };

  try {
    const result = await window.api.getMailRequests(filter);
    if (result.success) {
      mailLogGrid.setGridOption('rowData', result.data);
    } else {
      window.app.showToast(`Failed to load mail log: ${result.message}`, 'error');
    }
  } catch (err) {
    window.app.showToast(`Error: ${err.message}`, 'error');
  }
}

async function showMailLogDetail(id) {
  try {
    const result = await window.api.getMailRequest(id);
    if (!result.success || !result.data) {
      window.app.showToast('Failed to load detail', 'error');
      return;
    }

    const d = result.data;
    const messageHtml = (d.Message || '').replace(/\[CRLF\]/g, '<br>');

    window.app.showModal(`
      <button class="modal-close" onclick="window.app.closeModal();">&times;</button>
      <h3>Mail Request #${d.ID}</h3>
      <div style="display: grid; grid-template-columns: 120px 1fr; gap: 8px 12px; margin-bottom: 16px; font-size: 14px;">
        <strong>Subject:</strong><span>${escapeHtml(d.Subject)}</span>
        <strong>To:</strong><span>${escapeHtml(d.RecipientTo)}</span>
        <strong>CC:</strong><span>${escapeHtml(d.RecipientCC)}</span>
        <strong>BCC:</strong><span>${escapeHtml(d.RecipientBCC)}</span>
        <strong>Status:</strong><span>${escapeHtml(d.LastStatus)}</span>
        <strong>Sent:</strong><span>${d.Sent ? 'Yes' : 'No'}</span>
        <strong>Created:</strong><span>${d.CreatedTime ? new Date(d.CreatedTime).toLocaleString() : ''}</span>
        <strong>Sent Time:</strong><span>${d.SentTime ? new Date(d.SentTime).toLocaleString() : ''}</span>
      </div>
      <h4>Message Body</h4>
      <div style="margin-top: 8px; padding: 16px; background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; max-height: 400px; overflow: auto; font-family: Arial, sans-serif;">
        ${messageHtml}
      </div>
    `);
  } catch (err) {
    window.app.showToast(`Error: ${err.message}`, 'error');
  }
}

window.initMailLogView = initMailLogView;
window.refreshMailLog = refreshMailLog;
