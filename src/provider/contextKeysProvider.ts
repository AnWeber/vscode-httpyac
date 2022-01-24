import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import { httpDocumentSelector } from '../config';
import { ResponseStore } from '../extensionApi';

enum ContextKeys {
  AnyHttpFileOpen = 'httpyacAnyHttpFileOpen',
  HistoryEnabled = 'httpyacHistoryEnabled',
}

export class ContextKeysProvider extends DisposeProvider {
  constructor(readonly documentStore: DocumentStore, readonly responseStore: ResponseStore) {
    super();
    this.setContext(ContextKeys.AnyHttpFileOpen, this.isAnyHttpFileOpen);

    responseStore.historyChanged(() => this.setContext(ContextKeys.HistoryEnabled, responseStore.hasItems));
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(async () => {
        this.setContext(ContextKeys.AnyHttpFileOpen, this.isAnyHttpFileOpen);
      }),
    ];
  }

  private get isAnyHttpFileOpen() {
    return vscode.window.visibleTextEditors.some(
      editor => editor?.document && vscode.languages.match(httpDocumentSelector, editor.document)
    );
  }

  private setContext(context: ContextKeys, value: boolean) {
    vscode.commands.executeCommand('setContext', context, value);
  }
}
