import * as vscode from 'vscode';
import { APP_NAME , watchConfigSettings} from '../config';
import { httpFileStore, environmentStore, EnvironmentProvider, environments, httpYacApi, variables, HttpFile } from 'httpyac';
import { join, isAbsolute } from 'path';
import { errorHandler } from './errorHandler';
import { getConfigSetting, httpDocumentSelector } from '../config';

const commands = {
  toogleEnv: `${APP_NAME}.toggle-env`,
  toogleAllEnv: `${APP_NAME}.toggle-allenv`,
  refresh: `${APP_NAME}.refresh`,
};

export class EnvironmentController implements vscode.CodeLensProvider{

  private subscriptions: Array<vscode.Disposable> = [];
  private environmentProviders: Array<EnvironmentProvider> | undefined;
  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(refreshCodeLens: vscode.EventEmitter<void>) {
    environmentStore.activeEnvironments = getConfigSetting<Array<string>>("environmentSelectedOnStart");
    this.onDidChangeCodeLenses = refreshCodeLens.event;
    this.subscriptions = [
      vscode.commands.registerCommand(commands.toogleEnv, this.toogleEnv, this),
      vscode.commands.registerCommand(commands.toogleAllEnv, this.toogleAllEnv, this),
      vscode.commands.registerCommand(commands.refresh, this.refresh, this),
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
  initEnvironmentProvider(configs: Record<string, any>) {
    if (this.environmentProviders) {
      for (const envProvider of this.environmentProviders) {
        if (envProvider.reset) {
          envProvider.reset();
        }
      }
      const otherEnvProvider = environmentStore.environmentProviders.filter(obj => this.environmentProviders && this.environmentProviders.indexOf(obj) < 0);
      environmentStore.environmentProviders.length = 0;
      environmentStore.environmentProviders.push(...otherEnvProvider);
    }
    this.environmentProviders = [];

    if (configs.environmentVariables) {
      this.environmentProviders.push(new environments.JsonEnvProvider(configs.environmentVariables));
    }

    if (configs.intellijEnvEnabled) {
      const factory = (path: string) => new environments.IntellijProvider(path);
      const ignorePaths = this.registerWorkspaceEnvironmentProvider(factory, configs.intellijDirname);
      if (configs.intellijVariableProviderEnabled) {
        httpYacApi.variableProviders.splice(0, 0, new variables.provider.EnvVariableProvider(factory, ignorePaths));
      }
    }
    if (configs.dotenvEnabled) {
      const factory = (path: string) => new environments.DotenvProvider(path, configs.dotenvDefaultFiles || []);
      const ignorePaths = this.registerWorkspaceEnvironmentProvider(factory, configs.dotenvDirname);
      if (configs.dotenvVariableProviderEnabled) {
        httpYacApi.variableProviders.splice(0, 0, new variables.provider.EnvVariableProvider(factory, ignorePaths));
      }
    }
    environmentStore.environmentProviders.push(...this.environmentProviders);
    environmentStore.reset();
  }

  private registerWorkspaceEnvironmentProvider(factory: (path: string) => EnvironmentProvider, additionalDirName: string): Array<string>{
    const result: Array<string> = [];
    if (this.environmentProviders) {
      if (additionalDirName && isAbsolute(additionalDirName)) {
        this.environmentProviders.push(factory(additionalDirName));
        result.push(additionalDirName);
      }
      if (vscode.workspace.workspaceFolders) {
        for (const workspace of vscode.workspace.workspaceFolders) {
          this.environmentProviders.push(factory(workspace.uri.fsPath));
          result.push(workspace.uri.fsPath);
          if (additionalDirName && !isAbsolute(additionalDirName)) {
            const relativePath = join(workspace.uri.fsPath, additionalDirName);
            this.environmentProviders.push(factory(relativePath));
            result.push(additionalDirName);
          }
        }
      }
    }
    return result;
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
    const httpFile = httpFileStore.get(document.fileName);
    const result: Array<vscode.CodeLens> = [];
    if (httpFile) {
      result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        command: commands.toogleEnv,
        title: `env: ${httpFile.activeEnvironment || '-'}`,
      }));
    }
    return result;
  }

  @errorHandler()
  async toogleEnv(doc?: vscode.TextDocument) {
    const document = doc || vscode.window.activeTextEditor?.document;
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
    const envs = await environmentStore.getEnviroments(httpFile);
    if (envs) {
      environmentStore.activeEnvironments = (await vscode.window.showQuickPick(envs.map(env => {
        return {
          label: env,
          picked: environmentStore.activeEnvironments && environmentStore.activeEnvironments.indexOf(env) >= 0
        };
      }), {
        placeHolder: "select environment",
        canPickMany: true,
      }))?.map(obj => obj.label);
    } else {
      vscode.window.showInformationMessage("no environment found");
    }
    return environmentStore.activeEnvironments;
  }

  async toogleAllEnv() {
    const env = await this.pickEnv();
    const httpFiles = httpFileStore.getAll();
    for (const httpFile of httpFiles) {
      if (httpFile) {
        httpFile.activeEnvironment = env;
      }
    }
  }

  refresh() {
    environmentStore.reset();
  }

  toString() {
    return 'environementController';
  }
}