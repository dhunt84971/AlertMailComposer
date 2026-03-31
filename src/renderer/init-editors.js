// Lazily initialize CodeMirror editors when their containers become visible.
// Called by alertEmails.js when the edit panel is shown.

function ensureCodeMirrorEditors() {
  const queryContainer = document.getElementById('alert-query-editor');
  const msgQueryContainer = document.getElementById('alert-msgquery-editor');

  if (!window.alertQueryEditor && queryContainer && window.createSqlEditor) {
    window.alertQueryEditor = window.createSqlEditor(queryContainer);
  }

  if (!window.alertMsgQueryEditor && msgQueryContainer && window.createSqlEditor) {
    window.alertMsgQueryEditor = window.createSqlEditor(msgQueryContainer);
  }
}

window.ensureCodeMirrorEditors = ensureCodeMirrorEditors;
