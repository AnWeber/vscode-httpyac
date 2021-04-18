import * as vscode from 'vscode';
import { HttpFile, httpFileStore } from 'httpyac';
import throttle from 'lodash/throttle';
import { errorHandler } from './errorHandler';
import { httpDocumentSelector } from '../config';

export class HttpFileStoreController {

  private syncParseHttpFile: Record<string, Promise<HttpFile>> = {};
  private subscriptions: Array<vscode.Disposable> = [];
  constructor(private readonly httpFileEmitter: vscode.EventEmitter<{ httpFile: HttpFile, document: vscode.TextDocument }>, private readonly refreshCodeLens: vscode.EventEmitter<void>) {

    const refreshHttpFileThrottled = throttle(this.refreshHttpFile.bind(this), 200);
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      refreshHttpFileThrottled(document);
    }
    this.subscriptions = [
      vscode.workspace.onDidCloseTextDocument((document) => {
        httpFileStore.remove(document.fileName);
      }),
      vscode.workspace.onDidOpenTextDocument( async (document: vscode.TextDocument) => {
        await this.refreshHttpFile(document);
      }),
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.contentChanges.length > 0) {
          await refreshHttpFileThrottled(event.document);
        }
      }),
      vscode.workspace.onDidRenameFiles((fileRenameEvent) => {
        fileRenameEvent.files.forEach(file => {
          httpFileStore.rename(file.oldUri.fsPath, file.newUri.fsPath);
        });
      }),
    ];
  }

  @errorHandler()
  private async refreshHttpFile(document: vscode.TextDocument){
    if (vscode.languages.match(httpDocumentSelector, document)) {

      const httpFile = await this.getHttpFile(document);
      if (this.refreshCodeLens) {
        this.refreshCodeLens.fire();
      }
      if (httpFile) {
        this.httpFileEmitter.fire({ httpFile, document });
      }
      return httpFile;
    }
    return undefined;
  }

  async getHttpFile(document: vscode.TextDocument) : Promise<HttpFile> {
    if (this.syncParseHttpFile[document.fileName]) {
      return this.syncParseHttpFile[document.fileName];
    }
    const promise = httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
    this.syncParseHttpFile[document.fileName] = promise;
    const httpFile = await promise;
    delete this.syncParseHttpFile[document.fileName];
    return httpFile;
  }


  dispose() : void{
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

}