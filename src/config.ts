import { toUri } from './io';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export const APP_NAME = 'httpyac';

export const commands = {
  send: `${APP_NAME}.send`,
  sendRepeat: `${APP_NAME}.sendRepeat`,
  resend: `${APP_NAME}.resend`,
  sendSelected: `${APP_NAME}.sendSelected`,
  sendAll: `${APP_NAME}.sendAll`,
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
  pruneStorage: `${APP_NAME}.pruneStorage`,
};

export type ResponseViewContent = 'body' | 'headers' | 'full' | 'exchange';

export interface ResourceConfig {
  requestBodyInjectVariablesExtensions?: string[];
  requestDefaultHeaders?: Record<string, string>;
  requestGotOptions?: Record<string, unknown>;
  proxyExcludeList?: Array<string>;
  cookieJarEnabled?:
    | boolean
    | {
        allowSpecialUseDomain?: boolean | undefined;
        looseMode?: boolean | undefined;
        rejectPublicSuffixes?: boolean | undefined;
        prefixSecurity?: string | undefined;
      };
  clientCertificates?: Record<string, httpyac.ClientCertificateOptions>;
  environmentVariables?: Record<string, httpyac.Variables>;
  envDirName?: string;
  rootDir?: string;
  logLevel?: string;
  logOutputChannelOptions?: httpyac.utils.RequestLoggerFactoryOptions;
  logRequest?: boolean;
  useRegionScopedVariables?: boolean;
}

export interface AppConfig {
  environmentSelectedOnStart?: Array<string>;
  environmentStoreSelectedOnStart?: boolean;
  environmentStatusBarItemDefaultBackground?: 'none' | 'warning' | 'error';
  environmentStatusBarItemWarningEnvs?: Array<string>;
  environmentStatusBarItemErrorEnvs?: Array<string>;
  environmentShowStatusBarItem?: boolean;
  environmentPickMany?: boolean;
  responseViewHeader?: Array<string>;
  responseViewContent?: ResponseViewContent;
  responseViewExtensionRecognition?: 'mimetype' | 'extension' | 'regex';
  responseViewPreferredFilename?: 'metaData' | 'statusCodeAndUrl' | 'responseCount';
  responseViewMode?: 'preview' | 'reuse' | 'open' | 'none';
  responseViewPrettyPrint?: boolean;
  responseViewRequestBodySize?: number;
  responseViewPreserveFocus?: boolean;
  responseViewLanguageMap?: Record<string, string>;
  responseViewColumn?: string;
  useMethodInSendCodeLens?: boolean;
  useDecorationProvider?: boolean;
  addStreamingResponsesToHistory?: boolean;
  maxHistoryItems?: number;
  decorationActiveRegion?: vscode.DecorationRenderOptions;
  decorationInactiveRegion?: vscode.DecorationRenderOptions;
  showNotificationPopup?: boolean;
  useCodeLensInNotebook?: boolean;
  generateCodeDefaultLanguage?: {
    target: string;
    client: string;
  };
  generateCodeTargetOutput?: 'clipboard' | 'window';
  codelens?: {
    pickEnvironment: boolean;
    resetEnvironment: boolean;
    logoutUserSession: boolean;
    removeCookies: boolean;
    generateCode: boolean;
    generateCodeSelectLanguage: boolean;
    send: boolean;
    sendRepeat: boolean;
    sendAll: boolean;
    sendSelected: boolean;
    clearResponseHistory: boolean;
    testResult: boolean;
    showResponse: boolean;
    saveResponse: boolean;
    showResponseHeaders: boolean;
    showVariables: false;
    validateVariables: false;
  };
  progressDefaultLocation?: 'notification' | 'window';
  testControllerEnabled?: boolean;
  testItemExtensions?: Array<string>;
  testHiearchy?: 'filesystem' | 'flattened' | 'flat';
}

export function getConfigSetting(): AppConfig {
  const result: AppConfig = {};
  Object.assign(result, vscode.workspace.getConfiguration(APP_NAME));
  return result;
}

export function getResourceConfig(fileName: httpyac.PathLike): ResourceConfig {
  const result: ResourceConfig = {};

  Object.assign(result, vscode.workspace.getConfiguration(APP_NAME, toUri(fileName)));
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
  const httpOptions = vscode.workspace.getConfiguration('http');

  const environmentConfig: httpyac.EnvironmentConfig = {
    environments: config.environmentVariables,
    log: {
      level: toLogLevel(config.logLevel),
      supportAnsiColors: false,
    },
    cookieJarEnabled: config.cookieJarEnabled,
    clientCertificates: config.clientCertificates,
    request: config.requestGotOptions,
    requestBodyInjectVariablesExtensions: config.requestBodyInjectVariablesExtensions,
    proxy: httpyac.utils.isString(httpOptions.proxy) ? httpOptions.proxy : undefined,
    proxyExcludeList: config.proxyExcludeList,
    defaultHeaders: config.requestDefaultHeaders,
    envDirName: config.envDirName || undefined,
    useRegionScopedVariables: config.useRegionScopedVariables,
  };

  const uri = toUri(fileName);
  if (uri && config.clientCertificates) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      httpyac.utils.resolveClientCertificates(config, workspaceFolder);
    }
  }
  return environmentConfig;
}

export function watchConfigSettings(watcher: (appConfig: AppConfig) => void): vscode.Disposable {
  watcher(getConfigSetting());
  return vscode.workspace.onDidChangeConfiguration(changeEvent => {
    if (changeEvent.affectsConfiguration(APP_NAME)) {
      watcher(getConfigSetting());
    }
  });
}

export const httpDocumentSelector: Array<vscode.DocumentFilter> = [{ language: 'http', scheme: '*' }];

export const markdownDocumentSelector: Array<vscode.DocumentFilter> = [{ language: 'markdown', scheme: '*' }];

export const asciiDocumentSelector: Array<vscode.DocumentFilter> = [{ language: 'asciidoc', scheme: '*' }];
export const outputDocumentSelector: vscode.DocumentFilter = { scheme: 'output' };

export const allHttpDocumentSelector: Array<vscode.DocumentFilter> = [
  ...httpDocumentSelector,
  ...markdownDocumentSelector,
  ...asciiDocumentSelector,
];
