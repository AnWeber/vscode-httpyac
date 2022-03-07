import * as vscode from 'vscode';
import { DisposeProvider, getTimeAgo } from '../utils';
import { commands } from '../config';
import { ResponseStore } from '../responseStore';
import { DocumentStore, ResponseItem } from '../extensionApi';
import { errorHandler } from './errorHandler';
import * as httpyac from 'httpyac';
import { ObjectItem, isObjectItem, ObjectTreeItem, toObjectItems } from './objectTreeItem';

class ResponseTreeItem extends vscode.TreeItem {
  constructor(readonly responseItem: ResponseItem) {
    super(responseItem.name);
    this.description = `${responseItem.response.statusCode} - ${getTimeAgo(responseItem.created)}`;
    this.tooltip = httpyac.utils.toHttpString(responseItem.response);
    this.iconPath = new vscode.ThemeIcon('gist');
    this.contextValue = 'responseItem';
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    this.command = {
      title: 'show response',
      command: commands.showHistoryResponse,
      arguments: [responseItem],
    };
  }
}

export class HistoryController extends DisposeProvider implements vscode.TreeDataProvider<ResponseItem | ObjectItem> {
  readonly onDidChangeTreeData: vscode.Event<void>;

  constructor(readonly documentStore: DocumentStore, readonly responseStore: ResponseStore) {
    super();

    this.onDidChangeTreeData = responseStore.historyChanged;

    this.subscriptions = [
      vscode.window.registerTreeDataProvider('httpyacHistory', this),
      vscode.commands.registerCommand(commands.showHistory, this.showHistory, this),
      vscode.commands.registerCommand(commands.clearHistory, this.clearHistory, this),
      vscode.commands.registerCommand(commands.removeHistory, this.removeHistory, this),
      vscode.commands.registerCommand(commands.showHistoryResponse, this.responseStore.show, this.responseStore),
    ];
  }

  getTreeItem(element: ResponseItem | ObjectItem): vscode.TreeItem {
    if (isObjectItem(element)) {
      return new ObjectTreeItem(element);
    }
    return new ResponseTreeItem(element);
  }

  async getChildren(element: ResponseItem | ObjectItem): Promise<Array<ResponseItem> | Array<ObjectItem> | undefined> {
    if (element) {
      if (isObjectItem(element)) {
        return toObjectItems(element.value);
      }
      return toObjectItems(element);
    }
    return this.responseStore.responseCache;
  }

  @errorHandler()
  private async showHistory() {
    const pickedObj = await vscode.window.showQuickPick(
      this.responseStore.responseCache.map(responseItem => ({
        label: `${responseItem.name}`,
        description: `${responseItem.response.statusCode} - ${getTimeAgo(responseItem.created)}`,
        value: responseItem,
      })),
      {
        placeHolder: 'select history entry',
        ignoreFocusOut: true,
      }
    );
    if (pickedObj) {
      await this.responseStore.show(pickedObj.value);
    }
  }

  @errorHandler()
  private async clearHistory(): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await this.documentStore.getHttpFile(document);
      if (httpFile) {
        for (const httpRegion of httpFile.httpRegions) {
          httpRegion.variablesPerEnv = {};
          delete httpRegion.response;
        }
      }
    }
    await this.responseStore.clear();
  }

  @errorHandler()
  private async removeHistory(responseItem: ResponseItem): Promise<void> {
    if (responseItem) {
      await this.responseStore.remove(responseItem);
    }
  }
}
