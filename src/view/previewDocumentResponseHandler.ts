import { HttpRegion, HttpResponse, utils } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { ResponseHandlerResult } from '../extensionApi';
import { writeTempFileName, showTextEditor, getContent, getResponseViewContext } from './responseHandlerUtils';


export async function previewDocumentResponseHandler(response: HttpResponse, httpRegion?: HttpRegion) :Promise<boolean | ResponseHandlerResult> {
  const config = getConfigSetting();

  const editorConfig = vscode.workspace.getConfiguration('workbench.editor');

  let extension: string | undefined;
  if (editorConfig.enablePreview
    && config.responseViewMode === 'preview'
    && response?.rawBody) {
    const responseViewContent = getResponseViewContext(config.responseViewContent, !!response?.body);

    let content = response.rawBody;

    if (utils.isString(response.body)) {
      if (config.responseViewContent && config.responseViewContent !== 'body') {
        content = Buffer.from(getContent(response, config.responseViewContent));
        extension = 'http';
      } else if (response.prettyPrintBody
        && config.responseViewPrettyPrint) {
        content = Buffer.from(response.prettyPrintBody);
      }
    }
    if (content.length === 0) {
      content = Buffer.from(getContent(response, responseViewContent));
      extension = 'http';
    }

    const fileName = await writeTempFileName(content, httpRegion, extension);
    if (fileName) {

      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fileName));
      const editor = await showTextEditor(document, true);
      return {
        document,
        editor,
        deleteFile: true
      };
    }
  }
  return false;
}
