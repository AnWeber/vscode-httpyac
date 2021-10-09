import * as vscode from 'vscode';
import * as httpyac from 'httpyac';

export interface ResponseHandlerResult{
  document: vscode.TextDocument;
  editor: vscode.TextEditor;
  uri?: vscode.Uri;
}


export interface ResponseItem {
  created: Date;
  name: string;
  description: string;
  tooltip: string;
  response: httpyac.HttpResponse;
  httpRegion?: httpyac.HttpRegion;
  document?: vscode.TextDocument;
  uri?: vscode.Uri;
}

export type ResponseHandler = (
  response: httpyac.HttpResponse,
  httpRegion?: httpyac.HttpRegion
) => Promise<boolean | ResponseHandlerResult>;

export interface ResponseOutputProcessor{
  show: httpyac.RequestLogger;
}

export interface DocumentStore{
  readonly httpFileStore: httpyac.store.HttpFileStore;
  activeEnvironment: Array<string> | undefined;
  getDocumentPathLike: (document: vscode.TextDocument) => httpyac.PathLike;
  getHttpFile(document: vscode.TextDocument): Promise<httpyac.HttpFile>;
  getAll(): Array<httpyac.HttpFile>;
  getOrCreate(path: httpyac.PathLike, getText: () => Promise<string>, version: number): Promise<httpyac.HttpFile>;
  parse(uri: vscode.Uri | undefined, text: string): Promise<httpyac.HttpFile>;
  remove(document: vscode.TextDocument): void;
  send: (context: httpyac.HttpFileSendContext | httpyac.HttpRegionsSendContext) => Promise<boolean>,
}


export interface ResponseStore {
  readonly historyChanged: vscode.Event<void>;
  add(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion): Promise<void>;
  remove(responseItem: ResponseItem): boolean
  clear(): void;
}

export interface HttpYacExtensionApi{
  httpyac: typeof httpyac,
  documentStore: DocumentStore,
  responseStore: ResponseStore,
  httpDocumentSelector: vscode.DocumentSelector,
  environmentChanged: vscode.Event<string[] | undefined>,
  getEnvironmentConfig(path: httpyac.PathLike): Promise<httpyac.EnvironmentConfig>;
  getErrorQuickFix: (err: Error) => string | undefined;
}
