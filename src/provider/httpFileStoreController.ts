import * as vscode from 'vscode';
import { httpFileStore } from 'httpyac';
import { default as throttle } from 'lodash.throttle';
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
        await refreshHttpFileThrottled(document);
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
  private async refreshHttpFile(document: vscode.TextDocument) {
    if (document.languageId === 'http') {
      await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
      if (this.refreshCodeLens) {
        this.refreshCodeLens.fire();
      }
    }
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }
}