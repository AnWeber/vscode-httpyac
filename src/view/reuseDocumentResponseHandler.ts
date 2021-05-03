import { HttpRegion } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { ResponseHandlerResult } from './responseHandler';
import { getLanguageId, showTextEditor, getContent } from './responseHandlerUtils';


export async function reuseDocumentResponseHandler(
  httpRegion: HttpRegion,
  visibleDocuments: Array<vscode.TextDocument>
): Promise<boolean | ResponseHandlerResult> {
  const config = getConfigSetting();

  if (httpRegion.response?.body
    && config.responseViewMode
    && ['preview', 'reuse'].indexOf(config.responseViewMode) >= 0) {
    const language = getLanguageId(httpRegion.response.contentType, config.responseViewContent);

    const document = visibleDocuments.find(document => document.languageId === language && document.isUntitled);
    if (document) {
      let editor = vscode.window.visibleTextEditors.find(obj => obj.document === document);
      if (editor !== vscode.window.activeTextEditor) {
        editor = await showTextEditor(document, false);
      }
      if (editor) {
        const content = getContent(httpRegion.response, config.responseViewContent);
        await editor.edit((obj => obj.replace(new vscode.Range(0, 0, document.lineCount || 0, 0), content)));

        return {
          document,
          editor,
        };
      }
    }
  }
  return false;
}
