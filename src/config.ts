import * as httpyac from 'httpyac';
import { Disposable, workspace, DecorationRenderOptions } from 'vscode';
import { toUri } from './io';

export const APP_NAME = 'httpyac';

export const commands = {
  send: `${APP_NAME}.send`,
  sendRepeat: `${APP_NAME}.sendRepeat`,
  resend: `${APP_NAME}.resend`,
  sendSelected: `${APP_NAME}.sendSelected`,
  sendAll: `${APP_NAME}.sendall`,
  clearHistory: `${APP_NAME}.clearHistory`,
  show: `${APP_NAME}.show`,
  viewHeader: `${APP_NAME}.viewHeader`,
  showVariables: `${APP_NAME}.showVariables`,
  validateVariables: `${APP_NAME}.validateVariables`,
  save: `${APP_NAME}.save`,
  new: `${APP_NAME}.new`,
  generateCode: `${APP_NAME}.generateCode`,
  generateCodeSelectLanguage: `${APP_NAME}.generateCodeSelectLanguage`,
  showHistory: `${APP_NAME}.showHistory`,
  removeHistory: `${APP_NAME}.removeHistory`,
  showHistoryResponse: `${APP_NAME}.showHistoryResponse`,
};

export type ResponseViewContent = 'body' | 'headers' | 'full' | 'exchange';

export interface ResourceConfig {
  requestBodyInjectVariablesExtensions?: string[];
  requestDefaultHeaders?: Record<string, string>
  requestGotOptions?: httpyac.HttpRequest,
  cookieJarEnabled?: boolean,
  clientCertficates?: Record<string, httpyac.ClientCertificateOptions>
  environmentVariables?: Record<string, httpyac.Variables>,
  envDirName?: string,
  rootDir?: string,
  logLevel?: string,
  logResponseBodyLength?:number,
  logRequest?: boolean,
}


export interface AppConfig {
  environmentSelectedOnStart?: Array<string>,
  environmentStoreSelectedOnStart?: boolean,
  environmentPickMany?:boolean,
  responseViewHeader?:Array<string>,
  responseViewContent?: ResponseViewContent,
  responseViewMode?: 'preview' | 'reuse' | 'open' | 'none',
  responseViewPrettyPrint?:boolean,
  responseViewPreserveFocus?:boolean,
  responseViewLanguageMap?:Record<string, string>,
  responseViewColumn?:string,
  useMethodInSendCodeLens?:boolean,
  useDecorationProvider?: boolean,
  maxHistoryItems?: number;
  decorationActiveRegion?: DecorationRenderOptions,
  decorationInactiveRegion?: DecorationRenderOptions,
  showNotificationPopup?: boolean,
  useCodeLensInNotebook?: boolean;
  generateCodeDefaultLanguage?: {
    target: string;
    client: string;
  },
  generateCodeTargetOutput?: 'clipboard' | 'window',
  codelens?: {
    pickEnvironment: boolean,
    resetEnvironment: boolean,
    logoutUserSession: boolean,
    removeCookies: boolean,
    generateCode: boolean,
    generateCodeSelectLanguage: boolean,
    send: boolean,
    sendRepeat: boolean,
    sendAll: boolean,
    sendSelected: boolean,
    clearResponseHistory: boolean,
    testResult: boolean,
    showResponse: boolean,
    saveResponse: boolean,
    showResponseHeaders: boolean,
    showVariables: false,
    validateVariables: false,
  }
}

export function getConfigSetting() : AppConfig {
  const result: AppConfig = {};
  Object.assign(result, workspace.getConfiguration(APP_NAME));
  return result;
}

export function getResourceConfig(fileName: httpyac.PathLike) : ResourceConfig {
  const result: ResourceConfig = {};

  Object.assign(result, workspace.getConfiguration(APP_NAME), toUri(fileName) || undefined);
  return result;
}


function toLogLevel(level: string | undefined): httpyac.LogLevel {
  switch (level) {
    case 'trace':
      return httpyac.LogLevel.trace;
    case 'debug':
      return httpyac.LogLevel.debug;
    case 'warn':
      return httpyac.LogLevel.warn;
    case 'error':
      return httpyac.LogLevel.error;
    default:
      return httpyac.LogLevel.info;
  }
}

export async function getEnvironmentConfig(fileName: httpyac.PathLike): Promise<httpyac.EnvironmentConfig> {
  const config = getResourceConfig(fileName);
  const httpOptions = workspace.getConfiguration('http');

  const environmentConfig: httpyac.EnvironmentConfig = {
    environments: config.environmentVariables,
    log: {
      level: toLogLevel(config.logLevel),
      supportAnsiColors: false,
    },
    cookieJarEnabled: config.cookieJarEnabled,
    clientCertificates: config.clientCertficates,
    request: config.requestGotOptions,
    requestBodyInjectVariablesExtensions: config.requestBodyInjectVariablesExtensions,
    proxy: httpyac.utils.isString(httpOptions.proxy) ? httpOptions.proxy : undefined,
    defaultHeaders: config.requestDefaultHeaders,
    envDirName: config.envDirName,
  };

  const uri = toUri(fileName);
  if (uri && config.clientCertficates) {
    const workspaceFolder = workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      httpyac.utils.resolveClientCertficates(config, workspaceFolder);
    }
  }
  return environmentConfig;
}


export function watchConfigSettings(watcher: (appConfig: AppConfig) => void) : Disposable {
  watcher(getConfigSetting());
  return workspace.onDidChangeConfiguration(changeEvent => {
    if (changeEvent.affectsConfiguration(APP_NAME)) {
      watcher(getConfigSetting());
    }
  });
}


export const httpDocumentSelector = [
  { language: 'http', scheme: '*' }
];
