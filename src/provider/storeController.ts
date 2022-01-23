import * as vscode from 'vscode';
import { APP_NAME, allHttpDocumentSelector, getConfigSetting, getEnvironmentConfig } from '../config';
import * as httpyac from 'httpyac';
import { errorHandler } from './errorHandler';
import { DocumentStore } from '../documentStore';
import * as utils from '../utils';

const commands = {
  toggleEnv: `${APP_NAME}.toggle-env`,
  reset: `${APP_NAME}.reset`,
  logout: `${APP_NAME}.logout`,
  removeCookies: `${APP_NAME}.removeCookies`,
};

export class StoreController extends utils.DisposeProvider implements vscode.CodeLensProvider {
  onDidChangeCodeLenses: vscode.Event<void>;
  private envStatusBarItem: vscode.StatusBarItem;

  private readonly statusBarBackground = {
    error: new vscode.ThemeColor('statusBarItem.errorBackground'),
    warning: new vscode.ThemeColor('statusBarItem.warningBackground'),
  };

  private environmentChangedEmitter: vscode.EventEmitter<string[] | undefined>;

  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.envStatusBarItem = vscode.window.createStatusBarItem('vscode_httpyac_env', vscode.StatusBarAlignment.Right);
    this.envStatusBarItem.name = 'httpyac: Select Environment';
    this.envStatusBarItem.hide();
    this.refreshStatusBarItemWithEditor(vscode.window.activeTextEditor);
    this.environmentChangedEmitter = new vscode.EventEmitter<string[] | undefined>();
    this.onDidChangeCodeLenses = documentStore.documentStoreChanged;
    this.subscriptions = [
      vscode.commands.registerCommand(commands.toggleEnv, this.toggleEnv, this),
      vscode.commands.registerCommand(commands.reset, this.reset, this),
      vscode.commands.registerCommand(commands.logout, this.logout, this),
      vscode.commands.registerCommand(commands.removeCookies, this.removeCookies, this),
      vscode.languages.registerCodeLensProvider(allHttpDocumentSelector, this),
      vscode.window.onDidChangeActiveTextEditor(async editor => {
        await this.refreshStatusBarItemWithEditor(editor);
      }),
    ];
  }

  get environmentChanged(): vscode.Event<string[] | undefined> {
    return this.environmentChangedEmitter.event;
  }

  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const result: Array<vscode.CodeLens> = [];
    const config = getConfigSetting();
    if (!config?.useCodeLensInNotebook && utils.isNotebook(document)) {
      return result;
    }
    const httpFile = await this.documentStore.getHttpFile(document);
    if (httpFile.httpRegions.some(obj => !httpyac.utils.isGlobalHttpRegion(obj))) {
      const args = [document.uri];

      if (config.codelens?.pickEnvironment) {
        result.push(
          new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            command: commands.toggleEnv,
            arguments: args,
            title: `env: ${this.getEnvironmentTitle(httpFile.activeEnvironment)}`,
          })
        );
      }

      if (config.codelens?.resetEnvironment) {
        result.push(
          new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            command: commands.reset,
            title: 'reset environment',
          })
        );
      }

      if (httpyac.store.userSessionStore.userSessions.length > 0 && config.codelens?.logoutUserSession) {
        result.push(
          new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            command: commands.logout,
            title: `session (${httpyac.store.userSessionStore.userSessions.length})`,
          })
        );
      }
      if (config.codelens?.removeCookies) {
        const cookies = httpyac.store.cookieStore.getCookies(httpFile);
        if (cookies.length > 0) {
          result.push(
            new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
              command: commands.removeCookies,
              arguments: args,
              title: `cookies (${cookies.length})`,
            })
          );
        }
      }
    }
    return result;
  }

  private getEnvironmentTitle(activeEnvironment: string[] | undefined) {
    if (activeEnvironment && activeEnvironment.length > 0) {
      return activeEnvironment.join(', ');
    }
    return '-';
  }

  private async refreshStatusBarItemWithEditor(editor: vscode.TextEditor | undefined) {
    if (getConfigSetting().environmentShowStatusBarItem) {
      const httpFile = await this.documentStore.getCurrentHttpFile(editor);
      if (httpFile) {
        this.refreshEnvStatusBarItem(httpFile);
      } else {
        this.envStatusBarItem.hide();
      }
    }
  }

  @errorHandler()
  private refreshEnvStatusBarItem(httpFile: httpyac.HttpFile) {
    const config = getConfigSetting();

    if (config.environmentShowStatusBarItem) {
      const env = this.getEnvironmentTitle(httpFile.activeEnvironment);
      this.envStatusBarItem.text = env;
      this.envStatusBarItem.tooltip = 'Select httpYac Environment';
      this.envStatusBarItem.command = {
        command: commands.toggleEnv,
        arguments: [httpFile.fileName],
        title: 'Select httpYac Environment',
      };
      this.envStatusBarItem.backgroundColor = this.getDefaultBackgroundColor(
        config.environmentStatusBarItemDefaultBackground
      );
      if (
        config.environmentStatusBarItemErrorEnvs &&
        config.environmentStatusBarItemErrorEnvs.some(obj => env.indexOf(obj) >= 0)
      ) {
        if (config.environmentStatusBarItemDefaultBackground !== 'error') {
          this.envStatusBarItem.backgroundColor = this.statusBarBackground.error;
        } else {
          this.envStatusBarItem.backgroundColor = undefined;
        }
      } else if (
        config.environmentStatusBarItemWarningEnvs &&
        config.environmentStatusBarItemWarningEnvs.some(obj => env.indexOf(obj) >= 0)
      ) {
        if (config.environmentStatusBarItemDefaultBackground !== 'warning') {
          this.envStatusBarItem.backgroundColor = this.statusBarBackground.warning;
        } else {
          this.envStatusBarItem.backgroundColor = undefined;
        }
      }
      this.envStatusBarItem.show();
    } else {
      this.envStatusBarItem.hide();
    }
  }

  private getDefaultBackgroundColor(type?: 'none' | 'warning' | 'error') {
    if (type === 'error') {
      return this.statusBarBackground.error;
    }
    if (type === 'warning') {
      return this.statusBarBackground.warning;
    }
    return undefined;
  }

  @errorHandler()
  private async toggleEnv(document?: utils.DocumentArgument): Promise<void> {
    const editor = utils.getTextEditor(document);
    if (editor) {
      const httpFile = await this.documentStore.getHttpFile(editor.document);
      if (httpFile) {
        const env = await this.pickEnv(httpFile);
        httpFile.activeEnvironment = env;
        this.refreshEnvStatusBarItem(httpFile);
      }
    }
  }

  @errorHandler()
  private async pickEnv(httpFile: httpyac.HttpFile) {
    const config = getConfigSetting();
    const envs: Array<string> = await httpyac.getEnvironments({
      httpFile,
      config: await getEnvironmentConfig(httpFile),
    });

    let activeEnvironment: string[] | undefined;
    if (envs) {
      const canPickMany = getConfigSetting().environmentPickMany;

      const options: Array<{ label: string; value?: string; picked?: boolean }> = envs.map(env => ({
        label: env,
        value: env,
        picked: this.documentStore.activeEnvironment && this.documentStore.activeEnvironment.indexOf(env) >= 0,
      }));
      if (!canPickMany) {
        options.push({
          label: `- (no env)`,
        });
      }
      const pickedObj = await vscode.window.showQuickPick(options, {
        placeHolder: 'select environment',
        ignoreFocusOut: true,
        canPickMany,
      });
      if (pickedObj) {
        if (Array.isArray(pickedObj)) {
          activeEnvironment = pickedObj.map(obj => obj.value);
        } else if (pickedObj.value) {
          activeEnvironment = [pickedObj.value];
        } else {
          activeEnvironment = undefined;
        }
      } else {
        activeEnvironment = undefined;
      }
      this.documentStore.activeEnvironment = activeEnvironment;
      this.environmentChangedEmitter.fire(activeEnvironment);
      if (config.environmentStoreSelectedOnStart) {
        const config = vscode.workspace.getConfiguration(APP_NAME);
        await config.update('environmentSelectedOnStart', activeEnvironment);
      }
      this.documentStore.documentStoreChangedEmitter.fire();
    } else {
      vscode.window.showInformationMessage('no environment found');
    }
    return activeEnvironment;
  }

  private async reset(): Promise<void> {
    this.documentStore.clear();
    await httpyac.store.userSessionStore.reset();
    await httpyac.store.cookieStore.reset();
  }

  private async logout(): Promise<void> {
    const userSessions = await vscode.window.showQuickPick(
      httpyac.store.userSessionStore.userSessions.map(userSession => ({
        id: userSession.id,
        description: userSession.description,
        label: userSession.title,
        data: userSession,
      })),
      {
        placeHolder: 'select sessions to remove',
        canPickMany: true,
        ignoreFocusOut: true,
        onDidSelectItem: (item: vscode.QuickPickItem & { data: httpyac.UserSession }) => {
          httpyac.io.log.info(JSON.stringify(item.data, null, 2));
        },
      }
    );

    if (userSessions) {
      for (const userSession of userSessions) {
        httpyac.store.userSessionStore.removeUserSession(userSession.id);
        httpyac.io.log.info(`${userSession.label} removed`);
      }
      this.documentStore.documentStoreChangedEmitter.fire();
    }
  }

  @errorHandler()
  private async removeCookies(document?: utils.DocumentArgument): Promise<void> {
    const editor = utils.getTextEditor(document);
    if (editor) {
      const httpFile = await this.documentStore.getHttpFile(editor.document);
      if (httpFile) {
        const cookies = await vscode.window.showQuickPick(
          httpyac.store.cookieStore.getCookies(httpFile).map(cookie => ({
            label: `${cookie.key}=${cookie.value} ${Object.entries(cookie)
              .filter(([key]) => ['key', 'value'].indexOf(key) < 0)
              .map(([key, value]) => {
                if (value) {
                  if (value instanceof Date) {
                    return `${key}: ${value.toISOString()}`;
                  }
                  return `${key}: ${value}`;
                }
                return undefined;
              })
              .filter(obj => obj)
              .join(' ')}`,
            data: cookie,
          })),
          {
            placeHolder: 'select cookies to remove',
            canPickMany: true,
            ignoreFocusOut: true,
            onDidSelectItem: (item: vscode.QuickPickItem & { data: unknown }) => {
              httpyac.io.log.info(JSON.stringify(item.data, null, 2));
            },
          }
        );

        if (cookies) {
          httpyac.store.cookieStore.removeCookies(
            httpFile,
            cookies.map(obj => obj.data)
          );
          this.documentStore.documentStoreChangedEmitter.fire();
        }
      }
    }
  }
}
