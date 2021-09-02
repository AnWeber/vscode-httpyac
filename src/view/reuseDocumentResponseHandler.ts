import { HttpResponse } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { ResponseHandlerResult } from '../extensionApi';
import { getLanguageId, showTextEditor, getContent, getResponseViewContext } from './responseHandlerUtils';


export async function reuseDocumentResponseHandler(
  response: HttpResponse
): Promise<boolean | ResponseHandlerResult> {
  const config = getConfigSetting();

  if (config.responseViewMode
    && ['preview', 'reuse'].indexOf(config.responseViewMode) >= 0) {

    const responseViewContent = getResponseViewContext(config.responseViewContent, !!response?.body);

    const language = getLanguageId(response.contentType, responseViewContent);
    const visibleDocuments = vscode.window.visibleTextEditors.map(obj => obj.document);

    const document = visibleDocuments.find(document => document.languageId === language && document.isUntitled);
    if (document) {
      let editor = vscode.window.visibleTextEditors.find(obj => obj.document === document);
      if (editor !== vscode.window.activeTextEditor) {
        editor = await showTextEditor(document, false);
      }
      if (editor) {
        const content = getContent(response, responseViewContent);
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
