const SERVICE_KEYS = ['MailAlertServer', 'MailRequestServer'];

function serviceCardHtml(key) {
  return `
    <div class="card" style="margin-bottom: 16px;" data-service="${key}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">${key}</h3>
        <div class="svc-state" style="font-weight:600;">Status: <span class="svc-state-value">unknown</span></div>
      </div>
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-primary svc-start-btn">Start</button>
        <button class="btn btn-secondary svc-stop-btn">Stop</button>
        <button class="btn btn-secondary svc-refresh-btn">Refresh</button>
      </div>
      <div class="form-group" style="margin-top:16px;">
        <label>config.txt path</label>
        <div style="display:flex; gap:8px;">
          <input type="text" class="svc-config-path" style="flex:1;">
          <button class="btn btn-secondary svc-path-save-btn">Save Path</button>
          <button class="btn btn-secondary svc-config-load-btn">Reload</button>
        </div>
      </div>
      <div class="form-group">
        <label>config.txt contents</label>
        <textarea class="svc-config-content" rows="10" style="width:100%; font-family: monospace;"></textarea>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary svc-config-save-btn">Save config.txt</button>
      </div>
      <div class="svc-message" style="margin-top:8px; font-size:13px;"></div>
    </div>
  `;
}

function initServicesView() {
  const container = document.getElementById('view-services');
  container.innerHTML = `
    <div class="toolbar">
      <h2>Services</h2>
    </div>
    <div style="max-width: 900px;">
      ${SERVICE_KEYS.map(serviceCardHtml).join('')}
    </div>
  `;

  SERVICE_KEYS.forEach((key) => {
    const card = container.querySelector(`[data-service="${key}"]`);
    card.querySelector('.svc-start-btn').addEventListener('click', () => doAction(key, 'start'));
    card.querySelector('.svc-stop-btn').addEventListener('click', () => doAction(key, 'stop'));
    card.querySelector('.svc-refresh-btn').addEventListener('click', () => refreshStatus(key));
    card.querySelector('.svc-path-save-btn').addEventListener('click', () => savePath(key));
    card.querySelector('.svc-config-load-btn').addEventListener('click', () => loadConfig(key));
    card.querySelector('.svc-config-save-btn').addEventListener('click', () => saveConfig(key));

    refreshStatus(key);
    loadConfig(key);
  });
}

function setMessage(key, text, type = 'info') {
  const el = document.querySelector(`[data-service="${key}"] .svc-message`);
  if (!el) return;
  el.textContent = text;
  const colorVar = type === 'error' ? '--error-color' : type === 'success' ? '--success-color' : '--text-secondary';
  el.style.color = `var(${colorVar})`;
}

function setStatus(key, state) {
  const el = document.querySelector(`[data-service="${key}"] .svc-state-value`);
  if (!el) return;
  el.textContent = state;
  const isRunning = state === 'RUNNING';
  el.style.color = isRunning ? 'var(--success-color)' : 'var(--text-secondary)';
}

async function refreshStatus(key) {
  try {
    const status = await window.api.getServiceStatus(key);
    setStatus(key, status.state || 'UNKNOWN');
    if (status.error) setMessage(key, status.error, 'error');
  } catch (err) {
    setStatus(key, 'ERROR');
    setMessage(key, err.message, 'error');
  }
}

async function doAction(key, action) {
  setMessage(key, `${action === 'start' ? 'Starting' : 'Stopping'}...`);
  try {
    const status = action === 'start'
      ? await window.api.startService(key)
      : await window.api.stopService(key);
    setStatus(key, status.state || 'UNKNOWN');
    setMessage(key, `${action} succeeded`, 'success');
  } catch (err) {
    setMessage(key, err.message, 'error');
    refreshStatus(key);
  }
}

async function loadConfig(key) {
  try {
    const p = await window.api.getServiceConfigPath(key);
    const card = document.querySelector(`[data-service="${key}"]`);
    card.querySelector('.svc-config-path').value = p;
    const result = await window.api.readServiceConfig(key);
    card.querySelector('.svc-config-content').value = result.content || '';
    if (!result.exists) setMessage(key, `config.txt not found at ${result.path}`, 'error');
    else setMessage(key, `Loaded ${result.path}`, 'info');
  } catch (err) {
    setMessage(key, err.message, 'error');
  }
}

async function savePath(key) {
  const card = document.querySelector(`[data-service="${key}"]`);
  const p = card.querySelector('.svc-config-path').value.trim();
  if (!p) {
    setMessage(key, 'Path is required', 'error');
    return;
  }
  try {
    await window.api.setServiceConfigPath(key, p);
    setMessage(key, 'Path saved', 'success');
    loadConfig(key);
  } catch (err) {
    setMessage(key, err.message, 'error');
  }
}

async function saveConfig(key) {
  const card = document.querySelector(`[data-service="${key}"]`);
  const content = card.querySelector('.svc-config-content').value;
  try {
    const result = await window.api.writeServiceConfig(key, content);
    setMessage(key, `Saved ${result.path}`, 'success');
    window.app.showToast(`${key} config.txt saved`, 'success');
  } catch (err) {
    setMessage(key, err.message, 'error');
    window.app.showToast(`Failed to save: ${err.message}`, 'error');
  }
}

window.initServicesView = initServicesView;
window.refreshServicesView = () => SERVICE_KEYS.forEach(refreshStatus);
