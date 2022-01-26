import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import * as httpyac from 'httpyac';
import { getEnvironmentConfig } from '../config';
import { ObjectItem, ObjectTreeItem } from './objectTreeItem';

export class EnvironmentTreeDataProvider
  extends DisposeProvider
  implements vscode.TreeDataProvider<string | ObjectItem>
{
  readonly onDidChangeTreeData: vscode.Event<void>;

  #environmentChangedEmitter: vscode.EventEmitter<void>;
  constructor(readonly documentStore: DocumentStore, environmentChanged: vscode.Event<string[] | undefined>) {
    super();

    this.#environmentChangedEmitter = new vscode.EventEmitter<void>();
    this.onDidChangeTreeData = this.#environmentChangedEmitter.event;
    const fireVariablesChanged = () => this.#environmentChangedEmitter.fire();
    documentStore.documentStoreChanged(fireVariablesChanged);
    environmentChanged(fireVariablesChanged);
    this.subscriptions = [vscode.window.registerTreeDataProvider('httpyacEnvironments', this)];
  }

  getTreeItem(element: string | ObjectItem): vscode.TreeItem {
    if (typeof element === 'string') {
      return new EnvironmentTreeItem(element);
    }
    return new ObjectTreeItem(element);
  }

  async getChildren(element?: string | ObjectItem): Promise<Array<string> | Array<ObjectItem> | undefined> {
    const noEnv = `- (no env)`;
    if (!element) {
      const httpFile = await this.documentStore.getCurrentHttpFile();
      if (httpFile) {
        const environments = await httpyac.getEnvironments({
          httpFile,
          config: await getEnvironmentConfig(httpFile.fileName),
        });
        environments.push(noEnv);
        return environments;
      }
    } else {
      let val: unknown;
      if (typeof element === 'string') {
        const httpFile = await this.documentStore.getCurrentHttpFile();
        if (httpFile) {
          val = await httpyac.getVariables({
            httpFile: {
              ...httpFile,
              activeEnvironment: element === noEnv ? [] : [element],
            },
            config: await getEnvironmentConfig(httpFile.fileName),
          });
        }
      } else {
        val = element.value;
      }
      if (val && typeof val === 'object') {
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

export class EnvironmentTreeItem extends vscode.TreeItem {
  constructor(element: string) {
    super(element);
    this.tooltip = element;
    this.iconPath = new vscode.ThemeIcon('server-environment');
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
  }
}
