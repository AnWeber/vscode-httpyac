import { HttpRegion } from 'httpyac';
import { TextDocument, TextEditor } from 'vscode';

export interface ResponseHandlerResult{
  document: TextDocument;
  editor: TextEditor;
  deleteFile?: boolean;
}

export type ResponseHandler = (httpRegion: HttpRegion, visibleDocuments: Array<TextDocument>) => Promise<boolean | ResponseHandlerResult>;