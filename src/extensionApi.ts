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
  activeEnvironment: Array<string> | undefined;
  getDocumentPathLike: (document: vscode.TextDocument) => httpyac.io.PathLike;
  getHttpFile(document: vscode.TextDocument): Promise<httpyac.HttpFile>;
  getAll(): Array<httpyac.HttpFile>;
  getOrCreate(path: httpyac.io.PathLike, getText: () => Promise<string>, version: number): Promise<httpyac.HttpFile>;
  parse(uri: vscode.Uri | undefined, text: string): Promise<httpyac.HttpFile>;
  remove(document: vscode.TextDocument): void;
}

export interface HttpYacExtensionApi{
  httpyac: typeof httpyac,
  responseHandlers: Array<ResponseHandler>,
  responseOutputProcessor: ResponseOutputProcessor,
  httpFileStore: httpyac.store.HttpFileStore,
  documentStore: DocumentStore,
  httpDocumentSelector: vscode.DocumentSelector,
  refreshCodeLens: vscode.EventEmitter<void>,
  environementChanged: vscode.EventEmitter<string[] | undefined>,
  getEnvironmentConfig(path: httpyac.io.PathLike): Promise<httpyac.EnvironmentConfig>;
  getErrorQuickFix: (err: Error) => string | undefined;
  sendContext: (context: httpyac.HttpFileSendContext | httpyac.HttpRegionsSendContext) => Promise<boolean>
}
