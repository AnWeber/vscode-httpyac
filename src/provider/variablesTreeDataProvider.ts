import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import * as httpyac from 'httpyac';
import { getEnvironmentConfig } from '../config';
import { ObjectItem, ObjectTreeItem, toObjectItems } from './objectTreeItem';

export class VariablesTreeDataProvider extends DisposeProvider implements vscode.TreeDataProvider<ObjectItem> {
  readonly onDidChangeTreeData: vscode.Event<void>;

  variablesChangedEmitter: vscode.EventEmitter<void>;
  constructor(
    readonly documentStore: DocumentStore,
    environmentChanged: vscode.Event<string[] | undefined>
  ) {
    super();

    this.variablesChangedEmitter = new vscode.EventEmitter<void>();
    this.onDidChangeTreeData = this.variablesChangedEmitter.event;
    const fireVariablesChanged = () => this.variablesChangedEmitter.fire();
    documentStore.documentStoreChanged(fireVariablesChanged);
    environmentChanged(fireVariablesChanged);
    this.subscriptions = [
      vscode.window.registerTreeDataProvider('httpyacVariables', this),

      vscode.commands.registerCommand('httpyac.copyToClipboard', this.copyToClipboard, this),
    ];
  }

  private copyToClipboard(value: unknown) {
    const result = httpyac.utils.toString(value);
    if (result) {
      vscode.env.clipboard.writeText(result);
    }
  }

  getTreeItem(element: ObjectItem): vscode.TreeItem {
    return new ObjectTreeItem(element);
  }

  async getChildren(element?: ObjectItem): Promise<ObjectItem[] | undefined> {
    let val = element?.value || this.documentStore.variables;
    if (!val) {
      const httpFile = await this.documentStore.getCurrentHttpFile();
      if (httpFile) {
        val = await httpyac.getVariables({
          httpFile,
          config: await getEnvironmentConfig(httpFile.fileName),
        });
      }
    }
    return toObjectItems(val);
  }
}
