import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import { ObjectItem, ObjectTreeItem } from './objectTreeItem';
import { allHttpDocumentSelector } from '../config';

export class DebugViewController extends DisposeProvider implements vscode.TreeDataProvider<ObjectItem> {
  readonly onDidChangeTreeData: vscode.Event<void>;

  #httpFileChangedEmitter: vscode.EventEmitter<void>;
  constructor(readonly documentStore: DocumentStore) {
    super();

    this.#httpFileChangedEmitter = new vscode.EventEmitter<void>();
    this.onDidChangeTreeData = this.#httpFileChangedEmitter.event;
    documentStore.documentStoreChanged(() => {
      this.refreshHttpFileOpen(vscode.window.activeTextEditor);
    });
    this.subscriptions = [
      vscode.window.registerTreeDataProvider('httpyacDebug', this),

      vscode.window.onDidChangeActiveTextEditor(async editor => {
        this.refreshHttpFileOpen(editor);
      }),
    ];
  }

  private refreshHttpFileOpen(editor: vscode.TextEditor | undefined) {
    const isHttpFile = editor?.document && vscode.languages.match(allHttpDocumentSelector, editor.document);
    vscode.commands.executeCommand('setContext', 'httpyacHttpFileOpen', isHttpFile);
    if (isHttpFile) {
      this.#httpFileChangedEmitter.fire();
    }
  }

  getTreeItem(element: ObjectItem): vscode.TreeItem {
    return new ObjectTreeItem(element);
  }

  async getChildren(element?: ObjectItem): Promise<ObjectItem[] | undefined> {
    const val = element?.value || (await this.documentStore.getCurrentHttpFile());
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
