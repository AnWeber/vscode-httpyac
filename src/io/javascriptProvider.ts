import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
export function initJavascriptProvider() {
  httpyac.io.javascriptProvider.require.vscode = vscode;
}
