import { HttpRegion } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import {getLanguageId, showTextEditor, getContent} from './responseHandlerUtils';



export async function openDocumentResponseHandler(httpRegion: HttpRegion) {
  const config = getConfigSetting();
  if (httpRegion.response?.body && config.responseViewMode === 'open') {
    const language = getLanguageId(httpRegion.response.contentType);
    const content = getContent(httpRegion);
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
};
