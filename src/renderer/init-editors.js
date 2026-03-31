// Initialize CodeMirror editors after views are built
// Called explicitly by app.js after all views are initialized

function initCodeMirrorEditors() {
  const queryContainer = document.getElementById('alert-query-editor');
  const msgQueryContainer = document.getElementById('alert-msgquery-editor');

  if (queryContainer && window.createSqlEditor) {
    window.alertQueryEditor = window.createSqlEditor(queryContainer);
  }

  if (msgQueryContainer && window.createSqlEditor) {
    window.alertMsgQueryEditor = window.createSqlEditor(msgQueryContainer);
  }
}

window.initCodeMirrorEditors = initCodeMirrorEditors;
