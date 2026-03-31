// This file is bundled by esbuild into codemirror-bundle.js
import { EditorView, basicSetup } from 'codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState } from '@codemirror/state';

function createSqlEditor(parentElement, initialValue = '') {
  const isDark = document.documentElement.classList.contains('sl-theme-dark');

  const extensions = [
    basicSetup,
    sql(),
    EditorView.lineWrapping,
  ];

  if (isDark) {
    extensions.push(oneDark);
  }

  const view = new EditorView({
    state: EditorState.create({
      doc: initialValue,
      extensions
    }),
    parent: parentElement
  });

  return view;
}

// Expose to global scope
window.createSqlEditor = createSqlEditor;
