import * as vscode from 'vscode';
import { APP_NAME , watchConfigSettings} from '../config';
import { httpFileStore, environmentStore, environments } from 'httpyac';
import { join, isAbsolute } from 'path';
import { errorHandler } from './errorHandler';
import { getConfigSetting } from '../config';

const commands = {
  toogleEnv: `${APP_NAME}.toggle-env`,
  toogleAllEnv: `${APP_NAME}.toggle-allenv`,
  refresh: `${APP_NAME}.refresh`,
};

export class EnvironmentController implements vscode.CodeLensProvider{

  private subscriptions: Array<vscode.Disposable> = [];
  private environmentProviders: Array<environments.EnvironmentProvider> | undefined;
  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(refreshCodeLens: vscode.EventEmitter<void>, httpDocumentSelector: vscode.DocumentSelector) {
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
      const otherEnvProvider = environmentStore.environmentProviders.filter(obj => this.environmentProviders && this.environmentProviders.indexOf(obj) < 0);
      environmentStore.environmentProviders.length = 0;
      environmentStore.environmentProviders.push(...otherEnvProvider);
    }
    this.environmentProviders = [];

    if (configs.environmentVariables) {
      this.environmentProviders.push(new environments.JsonEnvProvider(configs.environmentVariables));
    }
    const dotEnvDirname: string = configs.dotenvDirname;
    const dotenvDefaultFiles: Array<string> = configs.dotenvDefaultFiles || [];
    if (dotEnvDirname && isAbsolute(dotEnvDirname)) {
      this.environmentProviders.push(new environments.DotenvProvider(dotEnvDirname, dotenvDefaultFiles));
    }
    if (vscode.workspace.workspaceFolders) {
      for (const workspace of vscode.workspace.workspaceFolders) {
        this.environmentProviders.push(new environments.DotenvProvider(workspace.uri.fsPath, dotenvDefaultFiles));
        if (dotEnvDirname && !isAbsolute(dotEnvDirname)) {
          this.environmentProviders.push(new environments.DotenvProvider(join(workspace.uri.fsPath, dotEnvDirname), dotenvDefaultFiles));
        }
      }
    }
    environmentStore.environmentProviders.push(...this.environmentProviders);
    environmentStore.refresh();
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
    const httpFile = httpFileStore.get(document.fileName);
    const result: Array<vscode.CodeLens> = [];
    if (httpFile) {
      result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        command: commands.toogleEnv,
        title: `env: ${httpFile.env || '-'}`,
      }));
    }
    return result;
  }

  @errorHandler()
  async toogleEnv(doc?: vscode.TextDocument) {
    const env = await this.pickEnv();
    const document = doc || vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = httpFileStore.get(document.fileName);
      if (httpFile) {
        httpFile.env = env;
      }
    }
  }

  @errorHandler()
  private async pickEnv() {
    const envs = await environmentStore.getEnviroments();
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
        httpFile.env = env;
      }
    }
  }

  refresh() {
    environmentStore.refresh();
  }

  toString() {
    return 'environementController';
  }
}