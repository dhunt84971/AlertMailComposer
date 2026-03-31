// Navigation
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

function switchView(viewName) {
  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
  views.forEach(view => view.classList.toggle('active', view.id === `view-${viewName}`));

  // Auto-refresh data when switching to a view
  if (viewName === 'alerts' && window.refreshAlertsList) window.refreshAlertsList();
  if (viewName === 'maillog' && window.refreshMailLog) window.refreshMailLog();
}

navButtons.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Theme toggle
const themeToggle = document.getElementById('theme-toggle');

async function loadTheme() {
  try {
    const config = await window.api.getConfig();
    const theme = config.theme || 'dark';
    applyTheme(theme);
  } catch {
    applyTheme('dark');
  }
}

function applyTheme(theme) {
  const html = document.documentElement;
  html.className = theme === 'dark' ? 'sl-theme-dark' : 'sl-theme-light';
  themeToggle.innerHTML = theme === 'dark' ? '&#9788;' : '&#9790;';

  // Update AG Grid theme classes
  const isDark = theme === 'dark';
  const addClass = isDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine';
  const removeClass = isDark ? 'ag-theme-alpine' : 'ag-theme-alpine-dark';
  document.querySelectorAll('.ag-theme-alpine, .ag-theme-alpine-dark').forEach(el => {
    el.classList.remove(removeClass);
    el.classList.add(addClass);
  });
}

themeToggle.addEventListener('click', async () => {
  const isDark = document.documentElement.classList.contains('sl-theme-dark');
  const newTheme = isDark ? 'light' : 'dark';
  applyTheme(newTheme);
  try {
    const config = await window.api.getConfig();
    config.theme = newTheme;
    await window.api.saveConfig(config);
  } catch (err) {
    console.error('Failed to save theme:', err);
  }
});

// Toast notifications
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal
const modalOverlay = document.getElementById('modal-overlay');
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

function showModal(html) {
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

// Connection status
function updateConnectionStatus(connected) {
  const dot = document.getElementById('connection-dot');
  const text = document.getElementById('connection-text');
  dot.classList.toggle('connected', connected);
  text.textContent = connected ? 'Connected' : 'Disconnected';
}

// Make functions available globally for view modules
window.app = {
  switchView,
  showToast,
  showModal,
  closeModal,
  updateConnectionStatus,
  applyTheme,
};

// Initialize all views
async function initApp() {
  await loadTheme();

  // Initialize view modules
  if (window.initSettingsView) window.initSettingsView();
  if (window.initAlertEmailsView) window.initAlertEmailsView();
  if (window.initMailConfigView) window.initMailConfigView();
  if (window.initMailLogView) window.initMailLogView();

  // Initialize CodeMirror editors now that all views are ready
  if (window.initCodeMirrorEditors) window.initCodeMirrorEditors();

  // Attempt to connect on startup
  try {
    const config = await window.api.getConfig();
    if (config.database.server && config.database.database && config.database.username) {
      const result = await window.api.connect();
      updateConnectionStatus(result.success);
      if (!result.success) {
        switchView('settings');
        showToast('Could not connect to database. Please check settings.', 'error', 5000);
      } else {
        // Load data for default view
        if (window.refreshAlertsList) window.refreshAlertsList();
      }
    } else {
      switchView('settings');
      showToast('Please configure database connection settings.', 'info', 5000);
    }
  } catch (err) {
    switchView('settings');
    showToast('Please configure database connection settings.', 'info', 5000);
  }
}

initApp();
