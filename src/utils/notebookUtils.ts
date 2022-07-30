import * as vscode from 'vscode';

export function isNotebook(document: vscode.TextDocument): document is vscode.TextDocument {
  return document.uri?.scheme === 'vscode-notebook-cell';
}
