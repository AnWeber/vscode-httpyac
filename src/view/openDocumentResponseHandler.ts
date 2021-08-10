import { HttpRegion } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { ResponseHandlerResult } from '../extensionApi';
import { getLanguageId, showTextEditor, getContent, getResponseViewContext } from './responseHandlerUtils';


export async function openDocumentResponseHandler(httpRegion: HttpRegion) : Promise<boolean | ResponseHandlerResult> {
  const config = getConfigSetting();
  if (httpRegion.response
    && config.responseViewMode
    && ['preview', 'reuse', 'open'].indexOf(config.responseViewMode) >= 0) {

    const responseViewContent = getResponseViewContext(config.responseViewContent, !!httpRegion.response?.body);
    const language = getLanguageId(httpRegion.response.contentType, responseViewContent);
    const content = getContent(httpRegion.response, responseViewContent);
    const document = await vscode.workspace.openTextDocument({
      language,
      content
    });
    const editor = await showTextEditor(document, true);
    return {
      document,
      editor
    };
  }
  return false;
}
