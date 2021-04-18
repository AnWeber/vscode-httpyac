import * as vscode from 'vscode';
import { AppConfig, APP_NAME, watchConfigSettings, getConfigSetting, httpDocumentSelector } from '../config';
import { httpFileStore, environments, HttpFile, EnvironmentConfig, log, toLogLevel, UserSession } from 'httpyac';
import { errorHandler } from './errorHandler';

const commands = {
  toggleEnv: `${APP_NAME}.toggle-env`,
  toggleAllEnv: `${APP_NAME}.toggle-allenv`,
  reset: `${APP_NAME}.reset`,
  logout: `${APP_NAME}.logout`,
  removeCookies: `${APP_NAME}.removeCookies`,
};

export class EnvironmentController implements vscode.CodeLensProvider {

  private config: AppConfig = {};
  private subscriptions: Array<vscode.Disposable> = [];
  private disposeEnvironment: (() => void) | false = false;
  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(refreshCodeLens: vscode.EventEmitter<void>) {
    environments.environmentStore.activeEnvironments = getConfigSetting().environmentSelectedOnStart;
    this.onDidChangeCodeLenses = refreshCodeLens.event;
    this.subscriptions = [
      vscode.commands.registerCommand(commands.toggleEnv, this.toggleEnv, this),
      vscode.commands.registerCommand(commands.toggleAllEnv, this.toggleAllEnv, this),
      vscode.commands.registerCommand(commands.reset, this.reset, this),
      vscode.commands.registerCommand(commands.logout, this.logout, this),
      vscode.commands.registerCommand(commands.removeCookies, this.removeCookies, this),
      vscode.languages.registerCodeLensProvider(httpDocumentSelector, this),
      watchConfigSettings(this.initEnvironmentProvider.bind(this))
    ];

  }

  dispose(): void {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

  @errorHandler()
  private async initEnvironmentProvider(appConfig: AppConfig) : Promise<void> {
    this.config = appConfig;
    if (this.disposeEnvironment) {
      this.disposeEnvironment();
    }

    const environmentConfig: EnvironmentConfig = {
      environments: appConfig.environmentVariables,
      log: {
        level: toLogLevel(appConfig.logLevel),
        supportAnsiColors: false,
        isRequestLogEnabled: !!appConfig.logRequest,
        responseBodyLength: appConfig.logResponseBodyLength || 0,
        prettyPrint: appConfig.responseViewPrettyPrint,
      },
      cookieJarEnabled: appConfig.cookieJarEnabled,
      clientCertificates: appConfig.clientCertficates,
      defaultHeaders: appConfig.requestDefaultHeaders,
      intellij: {
        enabled: appConfig.intellijEnvEnabled,
        variableProviderEnabled: appConfig.intellijVariableProviderEnabled,
        dirname: appConfig.intellijDirname,
      },
      dotenv: {
        enabled: appConfig.dotenvEnabled,
        variableProviderEnabled: appConfig.dotenvVariableProviderEnabled,
        defaultFiles: appConfig.dotenvDefaultFiles,
        dirname: appConfig.dotenvDirname
      },
    };

    const rootDirs: string[] = [];
    if (vscode.workspace.workspaceFolders) {
      rootDirs.push(...vscode.workspace.workspaceFolders.map(folder => folder.uri.fsPath));
    }
    this.disposeEnvironment = await environments.environmentStore.configure(rootDirs, {}, environmentConfig);
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    const result: Array<vscode.CodeLens> = [];
    const httpFile = httpFileStore.get(document.fileName);
    if (this.config.showCodeLensEnvironment) {
      if (httpFile) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.toggleEnv,
          title: `env: ${httpFile.activeEnvironment || '-'}`,
        }));
      }
    }

    if (this.config.showCodeLensResetEnvironment) {
      if (httpFile) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.reset,
          title: `reset environment`,
        }));
      }
    }

    if (environments.userSessionStore.userSessions.length > 0 && this.config.showCodeLensLogoutUserSession) {
      result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        command: commands.logout,
        title: `oauth2 session (${environments.userSessionStore.userSessions.length})`,
      }));
    }
    const cookies = environments.cookieStore.cookies;
    if (cookies.length > 0 && this.config.showCodeLensRemoveCookies) {
      result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        command: commands.removeCookies,
        title: `cookies (${cookies.length})`,
      }));
    }
    return result;
  }

  @errorHandler()
  private async toggleEnv(doc?: vscode.TextDocument) : Promise<void> {
    const document = doc?.getText ? doc : vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = httpFileStore.get(document.fileName);
      if (httpFile) {
        const env = await this.pickEnv(httpFile);
        httpFile.activeEnvironment = env;
      }
    }
  }

  @errorHandler()
  private async pickEnv(httpFile?: HttpFile) {
    const envs = await environments.environmentStore.getEnviroments(httpFile);
    if (envs) {
      const pickedObj = await vscode.window.showQuickPick(envs.map(env => {
        return {
          label: env,
          picked: environments.environmentStore.activeEnvironments && environments.environmentStore.activeEnvironments.indexOf(env) >= 0
        };
      }), {
        placeHolder: "select environment",
        canPickMany: getConfigSetting().environmentPickMany,
      });
      if (pickedObj) {
        if (Array.isArray(pickedObj)) {
          environments.environmentStore.activeEnvironments = pickedObj.map(obj => obj.label);
        } else {
          environments.environmentStore.activeEnvironments = [pickedObj.label];
        }
      } else {
        environments.environmentStore.activeEnvironments = undefined;
      }
    } else {
      vscode.window.showInformationMessage("no environment found");
    }
    return environments.environmentStore.activeEnvironments;
  }

  private async toggleAllEnv() : Promise<void> {
    const env = await this.pickEnv();
    const httpFiles = httpFileStore.getAll();
    for (const httpFile of httpFiles) {
      if (httpFile) {
        httpFile.activeEnvironment = env;
      }
    }
  }

  private async reset() : Promise<void> {
    await environments.environmentStore.reset();
    await environments.userSessionStore.reset();
    await environments.cookieStore.reset();
  }

  private async logout() : Promise<void> {
    const userSessions = await vscode.window.showQuickPick(environments.userSessionStore.userSessions.map(userSession => {
      return {
        id: userSession.id,
        description: userSession.description,
        label: userSession.title,
        data: userSession
      };
    }), {
      placeHolder: 'select oauth2 sessions to logout',
      canPickMany: true,
      onDidSelectItem: (item: vscode.QuickPickItem & {data: UserSession}) => {
        log.info(JSON.stringify(item.data, null, 2));
      }
    });

    if (userSessions) {
      for (const userSession of userSessions) {
        environments.userSessionStore.removeUserSession(userSession.id);
        log.info(`${userSession.label} removed`);
      }
    }
  }

  @errorHandler()
  private async removeCookies() : Promise<void> {
    const cookies = await vscode.window.showQuickPick(environments.cookieStore.cookies.map(cookie => {
      return {
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
        data: cookie
      };
    }), {
      placeHolder: 'select cookies to remove',
      canPickMany: true,
      onDidSelectItem: (item: vscode.QuickPickItem & {data: unknown}) => {
        log.info(JSON.stringify(item.data, null, 2));
      }
    });

    if (cookies) {
      environments.cookieStore.removeCookies(cookies.map(obj => obj.data));
    }
  }
}