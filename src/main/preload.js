const { contextBridge, ipcRenderer } = require('electron');
const { version } = require('../../package.json');

contextBridge.exposeInMainWorld('api', {
  // App info
  getAppVersion: () => version,

  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),

  // Database connection
  testConnection: (config) => ipcRenderer.invoke('db:testConnection', config),
  getConnectionStatus: () => ipcRenderer.invoke('db:getConnectionStatus'),
  connect: () => ipcRenderer.invoke('db:connect'),

  // Alert Emails CRUD
  getAlerts: () => ipcRenderer.invoke('alerts:getAll'),
  getAlert: (id) => ipcRenderer.invoke('alerts:getById', id),
  createAlert: (data) => ipcRenderer.invoke('alerts:create', data),
  updateAlert: (id, data) => ipcRenderer.invoke('alerts:update', id, data),
  deleteAlert: (id) => ipcRenderer.invoke('alerts:delete', id),
  toggleAlertEnabled: (id, enabled) => ipcRenderer.invoke('alerts:toggleEnabled', id, enabled),

  // Query execution
  executeTriggerQuery: (sql) => ipcRenderer.invoke('query:executeTrigger', sql),
  executeMessageQuery: (sql) => ipcRenderer.invoke('query:executeMessage', sql),

  // Mail Config
  getMailConfig: () => ipcRenderer.invoke('mailConfig:get'),
  updateMailConfig: (data) => ipcRenderer.invoke('mailConfig:update', data),

  // Mail Log
  getMailRequests: (filter) => ipcRenderer.invoke('mailLog:getAll', filter),
  getMailRequest: (id) => ipcRenderer.invoke('mailLog:getById', id),
});
