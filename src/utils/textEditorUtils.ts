import { getConfigSetting } from '../config';
import * as vscode from 'vscode';

export async function showTextEditor(
  uri: vscode.Uri | vscode.TextDocument,
  preview = true
): Promise<vscode.TextEditor> {
  const config = getConfigSetting();
  let viewColumn = vscode.ViewColumn.Beside;
  if (config.responseViewColumn === 'current') {
    viewColumn = vscode.ViewColumn.Active;
  }
  let document = uri;
  if (document instanceof vscode.Uri) {
    document = await vscode.workspace.openTextDocument(document);
  }
  return await vscode.window.showTextDocument(document, {
    viewColumn,
    preserveFocus: config.responseViewPreserveFocus,
    preview,
  });
}
