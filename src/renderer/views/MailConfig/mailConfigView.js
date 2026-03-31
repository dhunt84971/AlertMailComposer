function initMailConfigView() {
  const container = document.getElementById('view-mailconfig');
  container.innerHTML = `
    <div class="toolbar">
      <h2>Mail Configuration</h2>
    </div>
    <div class="card" style="max-width: 600px;">
      <h3 style="margin-bottom: 16px;">SMTP Server Settings</h3>
      <div class="form-group">
        <label for="mc-serverurl">Server URL *</label>
        <input type="text" id="mc-serverurl" maxlength="100" placeholder="smtp.example.com">
        <div class="error-message"></div>
      </div>
      <div class="form-group">
        <label for="mc-serverport">Server Port *</label>
        <input type="number" id="mc-serverport" min="1" max="65535" placeholder="587">
        <div class="error-message"></div>
      </div>
      <div class="form-group">
        <label for="mc-username">Username</label>
        <input type="text" id="mc-username" maxlength="50" placeholder="SMTP username">
        <div class="error-message"></div>
      </div>
      <div class="form-group">
        <label for="mc-password">Password</label>
        <div style="position: relative;">
          <input type="password" id="mc-password" maxlength="150" placeholder="SMTP password">
          <button type="button" id="mc-password-toggle"
            style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px;"
            title="Show/Hide password">&#128065;</button>
        </div>
      </div>
      <div class="form-group">
        <label for="mc-sendername">Sender Name</label>
        <input type="text" id="mc-sendername" maxlength="50" placeholder="Alert Mail Service">
      </div>
      <div class="form-group">
        <label for="mc-senderaddress">Sender Address *</label>
        <input type="email" id="mc-senderaddress" maxlength="50" placeholder="alerts@example.com">
        <div class="error-message"></div>
      </div>
      <div class="form-group">
        <label for="mc-servicecommand">Service Command</label>
        <select id="mc-servicecommand">
          <option value="">Normal (No Command)</option>
          <option value="Mark All Sent">Mark All Sent</option>
          <option value="Pause">Pause</option>
          <option value="Stop Service">Stop Service</option>
        </select>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 20px;">
        <button class="btn btn-primary" id="mc-save-btn">Save Configuration</button>
        <button class="btn btn-secondary" id="mc-reload-btn">Reload</button>
      </div>
    </div>
  `;

  document.getElementById('mc-password-toggle').addEventListener('click', () => {
    const input = document.getElementById('mc-password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('mc-save-btn').addEventListener('click', saveMailConfig);
  document.getElementById('mc-reload-btn').addEventListener('click', loadMailConfig);

  loadMailConfig();
}

async function loadMailConfig() {
  try {
    const result = await window.api.getMailConfig();
    if (result.success && result.data) {
      const d = result.data;
      document.getElementById('mc-serverurl').value = d.ServerURL || '';
      document.getElementById('mc-serverport').value = d.ServerPort || '';
      document.getElementById('mc-username').value = d.Username || '';
      document.getElementById('mc-password').value = d.Password || '';
      document.getElementById('mc-sendername').value = d.SenderName || '';
      document.getElementById('mc-senderaddress').value = d.SenderAddress || '';
      document.getElementById('mc-servicecommand').value = d.ServiceCommand || '';
    } else if (!result.success) {
      window.app.showToast(`Failed to load mail config: ${result.message}`, 'error');
    }
  } catch (err) {
    window.app.showToast(`Error loading mail config: ${err.message}`, 'error');
  }
}

function validateMailConfig() {
  let valid = true;
  document.querySelectorAll('#view-mailconfig .form-group.has-error').forEach(g => g.classList.remove('has-error'));

  const serverUrl = document.getElementById('mc-serverurl');
  if (!serverUrl.value.trim()) {
    showMcError(serverUrl, 'Server URL is required');
    valid = false;
  } else if (serverUrl.value.trim().length > 100) {
    showMcError(serverUrl, 'Server URL must be 100 characters or less');
    valid = false;
  }

  const serverPort = document.getElementById('mc-serverport');
  const port = parseInt(serverPort.value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    showMcError(serverPort, 'Port must be between 1 and 65535');
    valid = false;
  }

  const username = document.getElementById('mc-username');
  if (username.value.trim().length > 50) {
    showMcError(username, 'Username must be 50 characters or less');
    valid = false;
  }

  const password = document.getElementById('mc-password');
  if (password.value.length > 150) {
    showMcError(password, 'Password must be 150 characters or less');
    valid = false;
  }

  const senderName = document.getElementById('mc-sendername');
  if (senderName.value.trim().length > 50) {
    showMcError(senderName, 'Sender name must be 50 characters or less');
    valid = false;
  }

  const senderAddress = document.getElementById('mc-senderaddress');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!senderAddress.value.trim()) {
    showMcError(senderAddress, 'Sender address is required');
    valid = false;
  } else if (senderAddress.value.trim().length > 50) {
    showMcError(senderAddress, 'Sender address must be 50 characters or less');
    valid = false;
  } else if (!emailRegex.test(senderAddress.value.trim())) {
    showMcError(senderAddress, 'Invalid email format');
    valid = false;
  }

  return valid;
}

function showMcError(field, message) {
  const group = field.closest('.form-group');
  if (group) {
    group.classList.add('has-error');
    const errDiv = group.querySelector('.error-message');
    if (errDiv) errDiv.textContent = message;
  }
}

async function saveMailConfig() {
  if (!validateMailConfig()) return;

  const data = {
    ServerURL: document.getElementById('mc-serverurl').value.trim(),
    ServerPort: parseInt(document.getElementById('mc-serverport').value, 10),
    Username: document.getElementById('mc-username').value.trim(),
    Password: document.getElementById('mc-password').value,
    SenderName: document.getElementById('mc-sendername').value.trim(),
    SenderAddress: document.getElementById('mc-senderaddress').value.trim(),
    ServiceCommand: document.getElementById('mc-servicecommand').value,
  };

  try {
    const result = await window.api.updateMailConfig(data);
    if (result.success) {
      window.app.showToast('Mail configuration saved', 'success');
    } else {
      window.app.showToast(`Failed to save: ${result.message}`, 'error');
    }
  } catch (err) {
    window.app.showToast(`Error: ${err.message}`, 'error');
  }
}

window.initMailConfigView = initMailConfigView;
