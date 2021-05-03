import * as vscode from 'vscode';
import throttle from 'lodash/throttle';
import { errorHandler } from './errorHandler';
import { httpDocumentSelector } from '../config';
import { DocumentStore } from '../documentStore';

export class HttpFileStoreController {

  private subscriptions: Array<vscode.Disposable> = [];
  constructor(
    private readonly documentStore: DocumentStore,
    private readonly refreshCodeLens: vscode.EventEmitter<void>
  ) {

    const refreshHttpFileThrottled = throttle(this.refreshHttpFile.bind(this), 200);
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      refreshHttpFileThrottled(document);
    }
    this.subscriptions = [
      vscode.workspace.onDidCloseTextDocument(document => {
        this.documentStore.httpFileStore.remove(document.fileName);
      }),
      vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
        await this.refreshHttpFile(document);
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        if (event.contentChanges.length > 0) {
          await refreshHttpFileThrottled(event.document);
        }
      }),
      vscode.workspace.onDidRenameFiles(fileRenameEvent => {
        fileRenameEvent.files.forEach(file => {
          this.documentStore.httpFileStore.rename(file.oldUri.fsPath, file.newUri.fsPath);
        });
      }),
    ];
  }

  @errorHandler()
  private async refreshHttpFile(document: vscode.TextDocument) {
    if (vscode.languages.match(httpDocumentSelector, document)) {

      const httpFile = await this.documentStore.getHttpFile(document);
      if (this.refreshCodeLens) {
        this.refreshCodeLens.fire();
      }
      return httpFile;
    }
    return undefined;
  }


  dispose() : void {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

}
