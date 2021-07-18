import { HttpRegion } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { ResponseHandlerResult } from '../extensionApi';
import { getLanguageId, showTextEditor, getContent } from './responseHandlerUtils';


export async function openDocumentResponseHandler(httpRegion: HttpRegion) : Promise<boolean | ResponseHandlerResult> {
  const config = getConfigSetting();
  if (httpRegion.response?.body
    && config.responseViewMode
    && ['preview', 'reuse', 'open'].indexOf(config.responseViewMode) >= 0) {
    const language = getLanguageId(httpRegion.response.contentType, config.responseViewContent);
    const content = getContent(httpRegion.response, config.responseViewContent);
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
