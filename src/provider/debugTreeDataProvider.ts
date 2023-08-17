import * as vscode from 'vscode';
import { store } from 'httpyac';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import { ObjectItem, ObjectTreeItem } from './objectTreeItem';
import { allHttpDocumentSelector } from '../config';
import { ResponseStore } from '../responseStore';

export class DebugTreeDataProvider extends DisposeProvider implements vscode.TreeDataProvider<ObjectItem> {
  readonly onDidChangeTreeData: vscode.Event<void>;

  #httpFileChangedEmitter: vscode.EventEmitter<void>;
  constructor(
    readonly documentStore: DocumentStore,
    private readonly responseStore: ResponseStore
  ) {
    super();

    this.#httpFileChangedEmitter = new vscode.EventEmitter<void>();
    this.onDidChangeTreeData = this.#httpFileChangedEmitter.event;
    documentStore.documentStoreChanged(() => {
      this.refreshHttpFileOpen(vscode.window.activeTextEditor?.document);
    });
    responseStore.historyChanged(() => {
      this.refreshHttpFileOpen(vscode.window.activeTextEditor?.document);
    });
    this.subscriptions = [
      vscode.window.registerTreeDataProvider('httpyacDebug', this),

      vscode.workspace.onDidOpenTextDocument(doc => {
        this.refreshHttpFileOpen(doc);
      }),
      vscode.window.onDidChangeActiveTextEditor(async editor => {
        this.refreshHttpFileOpen(editor?.document);
      }),
    ];
  }

  private refreshHttpFileOpen(document: vscode.TextDocument | undefined) {
    const isHttpFileOpen = (doc: vscode.TextDocument | undefined) =>
      doc && vscode.languages.match(allHttpDocumentSelector, doc);
    const isHttpFile = isHttpFileOpen(document);
    vscode.commands.executeCommand('setContext', 'httpyac.httpFileOpen', isHttpFile);

    vscode.commands.executeCommand(
      'setContext',
      'httpyac.anyHttpFileOpen',
      isHttpFile || vscode.window.visibleTextEditors.some(edit => isHttpFileOpen(edit?.document))
    );

    if (isHttpFile) {
      this.#httpFileChangedEmitter.fire();
    }
  }

  getTreeItem(element: ObjectItem): vscode.TreeItem {
    return new ObjectTreeItem(element);
  }

  async getChildren(element?: ObjectItem): Promise<ObjectItem[] | undefined> {
    const val = element?.value || {
      activeTextEditor: vscode.window.activeTextEditor,
      documentStore: this.documentStore,
      httpFile: await this.documentStore.getCurrentHttpFile(),
      httpFileStore: this.documentStore.httpFileStore,
      processEnv: process.env,
      responseStore: this.responseStore,
      userSessionStore: store.userSessionStore,
    };
    if (val) {
      if (typeof val === 'object') {
        return Object.entries(val).map(([key, value]) => ({ key, value }));
      }
      if (Array.isArray(val)) {
        return val.map((value, index) => ({
          key: `${index}`,
          value,
        }));
      }
    }
    return undefined;
  }
}
