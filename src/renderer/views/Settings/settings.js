function initSettingsView() {
  const container = document.getElementById('view-settings');
  container.innerHTML = `
    <div class="toolbar">
      <h2>Settings</h2>
    </div>
    <div class="card" style="max-width: 600px;">
      <h3 style="margin-bottom: 16px;">Database Connection</h3>
      <div class="form-group">
        <label for="setting-server">SQL Server</label>
        <input type="text" id="setting-server" placeholder="localhost or server\\instance">
        <div class="error-message"></div>
      </div>
      <div class="form-group">
        <label for="setting-database">Database</label>
        <input type="text" id="setting-database" placeholder="MailAlertDB">
        <div class="error-message"></div>
      </div>
      <div class="form-group">
        <label for="setting-username">Username</label>
        <input type="text" id="setting-username" placeholder="SQL Server username">
        <div class="error-message"></div>
      </div>
      <div class="form-group">
        <label for="setting-password">Password</label>
        <div style="position: relative;">
          <input type="password" id="setting-password" placeholder="SQL Server password">
          <button type="button" id="setting-password-toggle"
            style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px;"
            title="Show/Hide password">&#128065;</button>
        </div>
        <div class="error-message"></div>
      </div>
      <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="setting-trustcert" checked>
        <label for="setting-trustcert" style="margin-bottom: 0;">Trust Server Certificate</label>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 20px;">
        <button class="btn btn-secondary" id="setting-test-btn">Test Connection</button>
        <button class="btn btn-primary" id="setting-save-btn">Save Settings</button>
      </div>
      <div id="setting-test-result" style="margin-top: 12px; font-size: 14px;"></div>

      <hr style="margin: 24px 0; border-color: var(--border-color);">

      <h3 style="margin-bottom: 16px;">Appearance</h3>
      <div class="form-group">
        <label for="setting-theme">Theme</label>
        <select id="setting-theme">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
    </div>
  `;

  // Load current settings
  loadSettings();

  // Password toggle
  document.getElementById('setting-password-toggle').addEventListener('click', () => {
    const input = document.getElementById('setting-password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Test connection
  document.getElementById('setting-test-btn').addEventListener('click', testConnection);

  // Save
  document.getElementById('setting-save-btn').addEventListener('click', saveSettings);

  // Theme change - apply immediately on dropdown change
  document.getElementById('setting-theme').addEventListener('change', (e) => {
    window.app.applyTheme(e.target.value);
  });
}

async function loadSettings() {
  try {
    const config = await window.api.getConfig();
    document.getElementById('setting-server').value = config.database.server || '';
    document.getElementById('setting-database').value = config.database.database || '';
    document.getElementById('setting-username').value = config.database.username || '';
    document.getElementById('setting-password').value = config.database.password || '';
    document.getElementById('setting-trustcert').checked = config.database.trustServerCertificate !== false;
    document.getElementById('setting-theme').value = config.theme || 'dark';
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function getSettingsFromForm() {
  return {
    server: document.getElementById('setting-server').value.trim(),
    database: document.getElementById('setting-database').value.trim(),
    username: document.getElementById('setting-username').value.trim(),
    password: document.getElementById('setting-password').value,
    trustServerCertificate: document.getElementById('setting-trustcert').checked
  };
}

async function testConnection() {
  const resultDiv = document.getElementById('setting-test-result');
  const btn = document.getElementById('setting-test-btn');
  btn.disabled = true;
  resultDiv.textContent = 'Testing connection...';
  resultDiv.style.color = 'var(--text-secondary)';

  try {
    const dbConfig = getSettingsFromForm();
    const result = await window.api.testConnection(dbConfig);
    if (result.success) {
      resultDiv.textContent = 'Connection successful!';
      resultDiv.style.color = 'var(--success-color)';
    } else {
      resultDiv.textContent = `Connection failed: ${result.message}`;
      resultDiv.style.color = 'var(--error-color)';
    }
  } catch (err) {
    resultDiv.textContent = `Error: ${err.message}`;
    resultDiv.style.color = 'var(--error-color)';
  }
  btn.disabled = false;
}

async function saveSettings() {
  const dbConfig = getSettingsFromForm();
  const theme = document.getElementById('setting-theme').value;

  // Basic validation
  if (!dbConfig.server) {
    window.app.showToast('Server is required', 'error');
    return;
  }
  if (!dbConfig.database) {
    window.app.showToast('Database name is required', 'error');
    return;
  }

  try {
    const config = { database: dbConfig, theme };
    await window.api.saveConfig(config);

    // Apply theme immediately
    window.app.applyTheme(theme);

    // Attempt to connect with new settings
    const connectResult = await window.api.connect();
    window.app.updateConnectionStatus(connectResult.success);

    window.app.showToast('Settings saved successfully', 'success');
  } catch (err) {
    window.app.showToast(`Failed to save: ${err.message}`, 'error');
  }
}

// Export for use in app.js
window.initSettingsView = initSettingsView;
window.loadSettings = loadSettings;
