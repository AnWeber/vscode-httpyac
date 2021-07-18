import * as vscode from 'vscode';
import * as httpyac from 'httpyac';

export interface ResponseHandlerResult{
  document: vscode.TextDocument;
  editor: vscode.TextEditor;
  deleteFile?: boolean;
}

export type ResponseHandler = (httpRegion: httpyac.HttpRegion, visibleDocuments: Array<vscode.TextDocument>) => Promise<boolean | ResponseHandlerResult>;


export interface ResponseOutputProcessor{
  show(httpRegion: httpyac.HttpRegion): Promise<void>;
}

export interface DocumentStore{
  getHttpFile(document: vscode.TextDocument): Promise<httpyac.HttpFile>;
  getAll(): Array<httpyac.HttpFile>;
}

export interface HttpYacExtensionApi{
  httpyac: typeof httpyac,
  responseHandlers: Array<ResponseHandler>,
  responseOutputProcessor: ResponseOutputProcessor,
  httpFileStore: httpyac.HttpFileStore,
  documentStore: DocumentStore,
  httpDocumentSelector: vscode.DocumentSelector,
  refreshCodeLens: vscode.EventEmitter<void>,
  environementChanged: vscode.EventEmitter<string[] | undefined>
  getErrorQuickFix: (err: Error) => string | undefined;
  sendContext: (context: httpyac.HttpFileSendContext | httpyac.HttpRegionsSendContext) => Promise<boolean>
}
