import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import * as httpyac from 'httpyac';
import { getEnvironmentConfig } from '../config';
import { ObjectItem, ObjectTreeItem } from './objectTreeItem';
import { NoEnvironment } from './storeController';

export const ProcessEnvironment = 'process.env';

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
      if (element === ProcessEnvironment) {
        return new ObjectTreeItem({ key: ProcessEnvironment, value: process.env });
      }
      return new EnvironmentTreeItem(element);
    }
    return new ObjectTreeItem(element);
  }

  async getChildren(element?: string | ObjectItem): Promise<Array<string> | Array<ObjectItem> | undefined> {
    if (!element) {
      const httpFile = await this.documentStore.getCurrentHttpFile();
      if (httpFile) {
        const environments = await httpyac.getEnvironments({
          httpFile,
          config: await getEnvironmentConfig(httpFile.fileName),
        });
        environments.push(NoEnvironment);
        environments.push(ProcessEnvironment);
        return environments;
      }
    } else {
      const val = await this.getChildrenOfItem(element);
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
    }
    return undefined;
  }

  private async getChildrenOfItem(element: string | ObjectItem) {
    let val: unknown;
    if (element === ProcessEnvironment) {
      val = process.env;
    } else if (typeof element === 'string') {
      const httpFile = await this.documentStore.getCurrentHttpFile();
      if (httpFile) {
        val = await httpyac.getVariables({
          httpFile: {
            ...httpFile,
            activeEnvironment: element === NoEnvironment ? [] : [element],
          },
          config: await getEnvironmentConfig(httpFile.fileName),
        });
      }
    } else {
      val = element.value;
    }
    return val;
  }
}

export class EnvironmentTreeItem extends vscode.TreeItem {
  constructor(element: string) {
    super(element);
    this.tooltip = element;
    this.contextValue = 'env';
    this.iconPath = new vscode.ThemeIcon('server-environment');
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
  }
}
