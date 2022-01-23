import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import * as httpyac from 'httpyac';
import { getEnvironmentConfig } from '../config';

class VariablesTreeItem extends vscode.TreeItem {
  constructor(element: VariableItem) {
    super(element.key);
    this.tooltip = JSON.stringify(element.value, null, 2);
    const type = typeof element.value;
    this.description = type;

    switch (type) {
      case 'string':
        this.iconPath = new vscode.ThemeIcon('symbol-text');
        this.tooltip = this.description = `${element.value}`;
        break;
      case 'number':
        this.iconPath = new vscode.ThemeIcon('symbol-number');
        this.tooltip = this.description = `${element.value}`;
        break;
      case 'function':
        this.iconPath = new vscode.ThemeIcon('symbol-function');
        break;
      case 'object':
        if (Array.isArray(element.value)) {
          this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          this.description = 'array';
          this.iconPath = new vscode.ThemeIcon('symbol-array');
        } else if (element.value instanceof Date) {
          this.iconPath = new vscode.ThemeIcon('calendar');
          this.tooltip = this.description = element.value.toISOString();
        } else {
          this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          this.iconPath = new vscode.ThemeIcon('symbol-object');
        }
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('symbol-field');
        break;
    }
  }
}

interface VariableItem {
  key: string;
  value: unknown;
}

export class VariablesController extends DisposeProvider implements vscode.TreeDataProvider<VariableItem> {
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

  getTreeItem(element: VariableItem): vscode.TreeItem {
    return new VariablesTreeItem(element);
  }

  async getChildren(element?: VariableItem): Promise<VariableItem[] | undefined> {
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
