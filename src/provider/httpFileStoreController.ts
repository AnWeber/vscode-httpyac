import * as vscode from 'vscode';
import throttle from 'lodash/throttle';
import { errorHandler } from './errorHandler';
import { httpDocumentSelector, watchConfigSettings } from '../config';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';

export class HttpFileStoreController extends DisposeProvider {

  constructor(
    private readonly documentStore: DocumentStore,
    private readonly refreshCodeLens: vscode.EventEmitter<void>
  ) {
    super();

    const refreshHttpFileThrottled = throttle(this.refreshHttpFile.bind(this), 200);
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      refreshHttpFileThrottled(document);
    }
    this.subscriptions = [
      watchConfigSettings(() => {
        this.documentStore.httpFileStore.clear();
      }),
      vscode.workspace.onDidCloseTextDocument(document => {
        if (vscode.languages.match(httpDocumentSelector, document)) {
          this.documentStore.remove(document);
        }
      }),
      vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
        if (vscode.languages.match(httpDocumentSelector, document)) {
          await this.refreshHttpFile(document);
        }
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        if (event.contentChanges.length > 0) {
          if (vscode.languages.match(httpDocumentSelector, event.document)) {
            await refreshHttpFileThrottled(event.document);
          } else if (vscode.languages.match([
            {
              language: 'js', scheme: 'file',
            }, {
              language: 'json', scheme: 'file',
            }, {
              language: 'dotenv', scheme: 'file',
            }
          ], event.document)) {
            this.documentStore.httpFileStore.clear();
          }
        }
      }),
      vscode.workspace.onDidRenameFiles(fileRenameEvent => {
        fileRenameEvent.files.forEach(file => {
          this.documentStore.httpFileStore.rename(file.oldUri, file.newUri);
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

}
