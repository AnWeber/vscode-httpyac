import { HttpRegion } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { getLanguageId, showTextEditor, getContent } from './responseHandlerUtils';



export async function reuseDocumentResponseHandler(httpRegion: HttpRegion, visibleDocuments: Array<vscode.TextDocument>) {
  const config = getConfigSetting();

  if (httpRegion.response?.body
    && config.responseViewMode
    && ['preview', 'reuse'].indexOf(config.responseViewMode) >= 0) {
    const language = getLanguageId(httpRegion.response.contentType, config.responseViewContent);

    const document = visibleDocuments.find(document => document.languageId === language && document.isUntitled);
    if (document) {
      const lineCount = document.lineCount;
      let editor = vscode.window.visibleTextEditors.find(obj => obj.document === document);
      if (editor !== vscode.window.activeTextEditor) {
        editor = await showTextEditor(document, false);
      }
      if (editor) {
        const content = getContent(httpRegion.response, config.responseViewContent);
        await editor.edit((obj => obj.replace(new vscode.Range(0, 0, lineCount || 0, 0), content)));

        return {
          document: document,
          editor,
        };
      }
    }
  }
  return false;
};