import * as httpyac from 'httpyac';
import { Disposable, workspace, DecorationRenderOptions } from 'vscode';
import { toUri } from './io';

export const APP_NAME = 'httpyac';

export type ResponseViewContent = 'body' | 'headers' | 'full' | 'exchange';


export interface ResourceConfig {
  requestBodyInjectVariablesExtensions?: string[];
  requestDefaultHeaders?: Record<string, string>
  requestGotOptions?: httpyac.HttpRequest,
  cookieJarEnabled?: boolean,
  clientCertficates?: Record<string, httpyac.ClientCertificateOptions>
  environmentVariables?: Record<string, httpyac.Variables>,
  envDirName?: string,
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
  decorationActiveRegion?: DecorationRenderOptions,
  decorationInactiveRegion?: DecorationRenderOptions,
  showNotificationPopup?: boolean,
  useCodeLensInNotebook?: boolean;
  showCodeLensEnvironment?:boolean,
  showCodeLensResetEnvironment?:boolean,
  showCodeLensLogoutUserSession?:boolean,
  showCodeLensRemoveCookies?:boolean,
  showCodeLensSendAll?: boolean,
  showCodeLensSendSelected?: boolean,
  showCodeLensSend?: boolean,
  showCodeLensClearAll?: boolean,
  showCodeLensSendRepeat?: boolean,
  showCodeLensTestResult?: boolean,
  showCodeLensShowResponse?:boolean,
  showCodeLensSaveResponse?:boolean,
  showCodeLensShowResponseHeaders?:boolean,
}

export function getConfigSetting() : AppConfig {
  const result: AppConfig = {};
  Object.assign(result, workspace.getConfiguration(APP_NAME));
  return result;
}

export function getResourceConfig(fileName: httpyac.io.PathLike) : ResourceConfig {
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

export async function getEnvironmentConfig(fileName: httpyac.io.PathLike): Promise<httpyac.EnvironmentConfig> {
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
  if (uri) {
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
