import * as vscode from 'vscode';
import { httpFileStore } from 'httpyac';
import throttle from 'lodash/throttle';
import { errorHandler } from './errorHandler';

export class HttpFileStoreController {

  private subscriptions: Array<vscode.Disposable> = [];

  constructor(private readonly refreshCodeLens: vscode.EventEmitter<void>) {
    const refreshHttpFileThrottled = throttle(this.refreshHttpFile, 200);
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
        await refreshHttpFileThrottled(event.document);
      }),
      vscode.workspace.onDidRenameFiles((fileRenameEvent) => {
        fileRenameEvent.files.forEach(file => {
          httpFileStore.rename(file.oldUri.fsPath, file.newUri.fsPath);
        });
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        await refreshHttpFileThrottled(event.document);
      })
    ];
  }

  @errorHandler()
  async refreshHttpFile(document: vscode.TextDocument){
    if (document.languageId === 'http') {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
      if (this.refreshCodeLens) {
        this.refreshCodeLens.fire();
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