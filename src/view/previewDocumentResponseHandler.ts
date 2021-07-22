import { HttpRegion, utils } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { ResponseHandlerResult } from '../extensionApi';
import { writeTempFileName, showTextEditor, getContent } from './responseHandlerUtils';


export async function previewDocumentResponseHandler(httpRegion: HttpRegion) :Promise<boolean | ResponseHandlerResult> {
  const config = getConfigSetting();

  const editorConfig = vscode.workspace.getConfiguration('workbench.editor');

  let extension: string | undefined;
  if (editorConfig.enablePreview && config.responseViewMode === 'preview' && httpRegion.response?.rawBody) {

    let content = httpRegion.response.rawBody;

    if (utils.isString(httpRegion.response.body)) {
      if (config.responseViewContent && config.responseViewContent !== 'body') {
        content = Buffer.from(getContent(httpRegion.response, config.responseViewContent));
        extension = 'http';
      } else if (httpRegion.response.prettyPrintBody
        && config.responseViewPrettyPrint
        && config.responseViewPreserveFocus) {
        content = Buffer.from(httpRegion.response.prettyPrintBody);
      }
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
