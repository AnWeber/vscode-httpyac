import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { ResponseOutputProcessor, ResponseHandler } from './view';

export interface HttpYacExtensionApi{
  httpyac: typeof httpyac,
  responseHandlers: Array<ResponseHandler>,
  responseOutputProcessor: ResponseOutputProcessor,
  httpFileStore: httpyac.HttpFileStore,
  httpDocumentSelector: vscode.DocumentSelector,
  refreshCodeLens: vscode.EventEmitter<void>,
  environementChanged: vscode.EventEmitter<string[] | undefined>
}
