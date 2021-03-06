import * as vscode from 'vscode';

export function isNotebook(document: vscode.TextDocument): boolean {
  const obj = document as { notebook?: unknown };
  return obj && !!obj.notebook;
}
