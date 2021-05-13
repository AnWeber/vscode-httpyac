import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import * as config from './config';
import { ResponseOutputProcessor, ResponseHandler } from './view';

export interface HttpYacExtensionApi{
  httpyac: typeof httpyac,
  responseHandlers: Array<ResponseHandler>,
  responseOutputProcessor: ResponseOutputProcessor,
  httpFileStore: httpyac.HttpFileStore,
  config: typeof config,
  refreshCodeLens: vscode.EventEmitter<void>,
  environementChanged: vscode.EventEmitter<string[] | undefined>
}
