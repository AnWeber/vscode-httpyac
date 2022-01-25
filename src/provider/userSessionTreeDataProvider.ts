import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';

export class UserSessionTreeDataProvider
  extends DisposeProvider
  implements vscode.TreeDataProvider<httpyac.UserSession>
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

  private removeSession(id: string): void {
    if (id && typeof id === 'string') {
      httpyac.store.userSessionStore.removeUserSession(id);
      this.documentStore.documentStoreChangedEmitter.fire();
    }
  }

  getTreeItem(element: httpyac.UserSession): vscode.TreeItem {
    return new UserSessionTreeItem(element);
  }

  async getChildren(element?: httpyac.UserSession): Promise<httpyac.UserSession[] | undefined> {
    if (!element) {
      return httpyac.store.userSessionStore.userSessions;
    }
    return undefined;
  }
}

export class UserSessionTreeItem extends vscode.TreeItem {
  constructor(element: httpyac.UserSession) {
    super(element.title);
    this.description = element.description;

    this.tooltip = `type: ${element.type}\ndescription: ${element.description}\n${Object.entries(element.details)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')}`;

    this.command = {
      title: 'remove user session',
      command: `httpyac.removeSession`,
      arguments: [element.id],
    };

    switch (element.type) {
      case 'LAST_RESPONSE':
        this.iconPath = new vscode.ThemeIcon('history');
        break;
      case 'Stream':
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
      default:
        this.iconPath = new vscode.ThemeIcon('question');
        break;
    }
  }
}
