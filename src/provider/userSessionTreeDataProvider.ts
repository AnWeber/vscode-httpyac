import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import { ObjectItem, ObjectTreeItem, isObjectItem, toObjectItems } from './objectTreeItem';

export class UserSessionTreeDataProvider
  extends DisposeProvider
  implements vscode.TreeDataProvider<httpyac.UserSession | ObjectItem>
{
  readonly onDidChangeTreeData: vscode.Event<void>;

  constructor(readonly documentStore: DocumentStore) {
    super();

    this.onDidChangeTreeData = documentStore.documentStoreChanged;

    this.subscriptions = [
      vscode.window.registerTreeDataProvider('httpyacSession', this),

      vscode.commands.registerCommand(`httpyac.removeSession`, this.removeSession, this),
    ];
  }

  private removeSession(userSession: httpyac.UserSession | undefined): void {
    if (userSession?.id && typeof userSession.id === 'string') {
      httpyac.store.userSessionStore.removeUserSession(userSession.id);
      this.documentStore.documentStoreChangedEmitter.fire();
    }
  }

  getTreeItem(element: httpyac.UserSession | ObjectItem): vscode.TreeItem {
    if (isObjectItem(element)) {
      return new ObjectTreeItem(element);
    }
    return new UserSessionTreeItem(element);
  }

  async getChildren(
    element?: httpyac.UserSession
  ): Promise<Array<httpyac.UserSession> | Array<ObjectItem> | undefined> {
    if (element) {
      if (isObjectItem(element)) {
        return toObjectItems(element.value);
      }
      const result = toObjectItems(element.details) || [];
      if (httpyac.utils.isOpenIdInformation(element)) {
        result.push({
          key: 'access_token',
          value: httpyac.utils.decodeJWT(element.accessToken),
        });
        if (element.refreshToken) {
          result.push({
            key: 'refresh_token',
            value: httpyac.utils.decodeJWT(element.refreshToken),
          });
        }
      }
      return result;
    }
    return httpyac.store.userSessionStore.userSessions;
  }
}

export class UserSessionTreeItem extends vscode.TreeItem {
  constructor(element: httpyac.UserSession) {
    super(element.title);
    this.description = element.description;

    this.tooltip = `type: ${element.type}\ndescription: ${element.description}`;

    this.contextValue = 'session';
    this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;

    switch (element.type) {
      case 'LAST_RESPONSE':
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        this.iconPath = new vscode.ThemeIcon('history');
        break;
      case 'Stream':
        this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        this.iconPath = new vscode.ThemeIcon('radio-tower');
        break;
      case 'RateLimit':
        this.iconPath = new vscode.ThemeIcon('watch');
        break;
      case 'Cookie':
        this.iconPath = new vscode.ThemeIcon('globe');
        break;
      case 'OAuth2':
        this.iconPath = new vscode.ThemeIcon('key');
        break;
      case 'intellij_global_cache':
        this.iconPath = new vscode.ThemeIcon('database');
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('question');
        break;
    }
  }
}
