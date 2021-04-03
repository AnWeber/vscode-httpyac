import * as vscode from 'vscode';
import { AppConfig, APP_NAME , watchConfigSettings, getConfigSetting, httpDocumentSelector} from '../config';
import { httpFileStore, environments, HttpFile, EnvironmentConfig ,log, toLogLevel, utils } from 'httpyac';
import { join, isAbsolute } from 'path';
import { errorHandler } from './errorHandler';
import merge from 'lodash/merge';

const commands = {
  toggleEnv: `${APP_NAME}.toggle-env`,
  toggleAllEnv: `${APP_NAME}.toggle-allenv`,
  reset: `${APP_NAME}.reset`,
  logout: `${APP_NAME}.logout`,
};

export class EnvironmentController implements vscode.CodeLensProvider{

  private config: Record<string, any> = {};
  private subscriptions: Array<vscode.Disposable> = [];
  private disposeEnvironment: (() => void) | false = false;
  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(refreshCodeLens: vscode.EventEmitter<void>) {
    environments.environmentStore.activeEnvironments =getConfigSetting().environmentSelectedOnStart;
    this.onDidChangeCodeLenses = refreshCodeLens.event;
    this.subscriptions = [
      vscode.commands.registerCommand(commands.toggleEnv, this.toggleEnv, this),
      vscode.commands.registerCommand(commands.toggleAllEnv, this.toggleAllEnv, this),
      vscode.commands.registerCommand(commands.reset, this.reset, this),
      vscode.commands.registerCommand(commands.logout, this.logout, this),
      vscode.languages.registerCodeLensProvider(httpDocumentSelector, this),
      watchConfigSettings(this.initEnvironmentProvider.bind(this))
    ];

  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

  @errorHandler()
  async initEnvironmentProvider(appConfig: AppConfig) {
    this.config = appConfig;
    if (this.disposeEnvironment) {
      this.disposeEnvironment();
    }

    const settingsConfig: EnvironmentConfig = {
      environments: appConfig.environmentVariables,
    };
    if (appConfig.intellijEnvEnabled) {
      settingsConfig.intellij = {
        variableProviderEnabled: appConfig.intellijVariableProviderEnabled,
        dirs: this.getWorkspaceDirs(appConfig.intellijDirname),
      };
    }
    if (appConfig.dotenvEnabled) {
      settingsConfig.dotenv = {
        variableProviderEnabled: appConfig.dotenvVariableProviderEnabled,
        defaultFiles: appConfig.dotenvDefaultFiles,
        dirs: this.getWorkspaceDirs(appConfig.dotenvDirname),
      };
    }

    if (appConfig.clientCertficates) {
      settingsConfig.clientCertificates = appConfig.clientCertficates;
    }

    settingsConfig.log = {
      level: toLogLevel(appConfig.logLevel),
      supportAnsiColors: false,
      isRequestLogEnabled: !!appConfig.logRequest,
      responseBodyLength: appConfig.logResponseBodyLength || 0
    };

    const environmentConfig: EnvironmentConfig = merge({}, ...(await this.loadFileEnvironemntConfigs()), settingsConfig);
    if (environmentConfig.clientCertificates) {
      for (const [, value] of Object.entries(environmentConfig.clientCertificates)) {
        value.cert = await this.findFileName(value.cert);
        value.key = await this.findFileName(value.key);
        value.pfx = await this.findFileName(value.pfx);
      }
    }
    this.disposeEnvironment = await environments.environmentStore.configure(environmentConfig);
  }

  private async loadFileEnvironemntConfigs() : Promise<Array<EnvironmentConfig>>{
    const environmentConfigs: Array<EnvironmentConfig> = [];
    if (vscode.workspace.workspaceFolders) {
      for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        const environmentConfig = await utils.getHttpacJsonConfig(workspaceFolder.uri.fsPath);
        if (environmentConfig) {
          environmentConfigs.push(environmentConfig);
        }
      }
    }
    return environmentConfigs;
  }

  private getWorkspaceDirs(additionalDirName: string | undefined): Array<string> {
    const result: Array<string> = [];
    if (vscode.workspace.workspaceFolders) {
      result.push(...vscode.workspace.workspaceFolders.map(obj => obj.uri.fsPath));
    }
    if (additionalDirName) {
      if (isAbsolute(additionalDirName)) {
        result.push(additionalDirName);
      } else if (vscode.workspace.workspaceFolders) {
        result.push(...vscode.workspace.workspaceFolders.map(obj => join(obj.uri.fsPath, additionalDirName)));
      }
    }
    return result;
  }

  private async findFileName(fileName: string | undefined): Promise<string | undefined> {
    if (fileName && vscode.workspace.workspaceFolders) {
      if (isAbsolute(fileName)) {
        return fileName;
      }
      for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        const absolute = await utils.toAbsoluteFilename(fileName, workspaceFolder.uri.fsPath, true);
        if (absolute) {
          return absolute;
        }
      }
    }
    return fileName;
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
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
        title: `logout usersession (${environments.userSessionStore.userSessions.length})`,
      }));
    }
    return result;
  }

  @errorHandler()
  async toggleEnv(doc?: vscode.TextDocument) {
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

  async toggleAllEnv() {
    const env = await this.pickEnv();
    const httpFiles = httpFileStore.getAll();
    for (const httpFile of httpFiles) {
      if (httpFile) {
        httpFile.activeEnvironment = env;
      }
    }
  }

  async reset() {
    await environments.environmentStore.reset();
    await environments.userSessionStore.reset();
  }

  async logout() {
    const userSessions = await vscode.window.showQuickPick(environments.userSessionStore.userSessions.map(userSession => {
      return {
        id: userSession.id,
        description: userSession.description,
        label: userSession.title,
        data: userSession
      };
    }), {
      placeHolder: 'select user sessions to logout',
        canPickMany: true,
        onDidSelectItem: (item: any) => {
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
}