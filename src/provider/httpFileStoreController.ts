import * as vscode from 'vscode';
import { HttpFile, httpFileStore } from 'httpyac';
import throttle from 'lodash/throttle';
import { errorHandler } from './errorHandler';
import { httpDocumentSelector } from '../config';

export class HttpFileStoreController {

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
  async refreshHttpFile(document: vscode.TextDocument){
    if (vscode.languages.match(httpDocumentSelector, document)) {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
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


  dispose() {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

}