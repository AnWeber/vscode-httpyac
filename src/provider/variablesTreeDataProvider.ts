import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import * as httpyac from 'httpyac';
import { getEnvironmentConfig } from '../config';
import { ObjectItem, ObjectTreeItem } from './objectTreeItem';

export class VariablesTreeDataProvider extends DisposeProvider implements vscode.TreeDataProvider<ObjectItem> {
  readonly onDidChangeTreeData: vscode.Event<void>;

  variablesChangedEmitter: vscode.EventEmitter<void>;
  constructor(readonly documentStore: DocumentStore, environmentChanged: vscode.Event<string[] | undefined>) {
    super();

    this.variablesChangedEmitter = new vscode.EventEmitter<void>();
    this.onDidChangeTreeData = this.variablesChangedEmitter.event;
    const fireVariablesChanged = () => this.variablesChangedEmitter.fire();
    documentStore.documentStoreChanged(fireVariablesChanged);
    environmentChanged(fireVariablesChanged);
    this.subscriptions = [vscode.window.registerTreeDataProvider('httpyacVariables', this)];
  }

  getTreeItem(element: ObjectItem): vscode.TreeItem {
    return new ObjectTreeItem(element);
  }

  async getChildren(element?: ObjectItem): Promise<ObjectItem[] | undefined> {
    const val = element?.value || this.documentStore.variables;
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
