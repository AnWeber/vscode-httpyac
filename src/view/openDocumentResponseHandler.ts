import { HttpRegion } from 'httpyac';
import * as vscode from 'vscode';
import {getLanguageId, showTextEditor, getContent} from './responseHandlerUtils';



export async function openDocumentResponseHandler(httpRegion: HttpRegion) {
  if (httpRegion.response?.body) {
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
