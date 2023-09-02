import { getConfigSetting } from '../config';
import * as vscode from 'vscode';

export async function showTextEditor(options: {
  uri: vscode.Uri | vscode.TextDocument;
  viewColumn?: vscode.ViewColumn;
  preview: boolean;
}): Promise<vscode.TextEditor> {
  const config = getConfigSetting();
  let viewColumn = vscode.ViewColumn.Beside;
  if (config.responseViewColumn === 'current') {
    viewColumn = vscode.ViewColumn.Active;
  }
  let document = options.uri;
  if (document instanceof vscode.Uri) {
    document = await vscode.workspace.openTextDocument(document);
  }
  return await vscode.window.showTextDocument(document, {
    viewColumn: options.viewColumn || viewColumn,
    preserveFocus: config.responseViewPreserveFocus,
    preview: options.preview,
  });
}
