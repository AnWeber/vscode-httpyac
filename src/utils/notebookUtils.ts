import * as vscode from 'vscode';

export function isNotebook(
  document: vscode.TextDocument
): document is vscode.TextDocument & { notebook: vscode.NotebookDocument } {
  const obj = document as { notebook?: unknown };
  return obj && !!obj.notebook;
}
