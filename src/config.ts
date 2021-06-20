import { ClientCertificateOptions, HttpRequest, Variables } from 'httpyac';
import { Disposable, workspace, DecorationRenderOptions } from 'vscode';

export const APP_NAME = 'httpyac';

export const RESPONSE_VIEW_PREVIEW = 'responseViewPreview';
export const RESPONSE_VIEW_PRESERVE_FOCUS = 'responseViewPreserveFocus';
export type ResponseViewContent = 'body' | 'headers' | 'full' | 'exchange';
export interface AppConfig {
  requestBodyInjectVariablesExtensions?: string[];
  requestDefaultHeaders?: Record<string, string>
  requestOptions?: HttpRequest,
  cookieJarEnabled?: boolean,
  clientCertficates?: Record<string, ClientCertificateOptions>
  environmentSelectedOnStart?: Array<string>,
  environmentStoreSelectedOnStart?: boolean,
  environmentPickMany?:boolean,
  environmentVariables?: Record<string, Variables>,
  dotenvEnabled?:boolean,
  dotenvDirname?:string,
  dotenvDefaultFiles?:Array<string>,
  dotenvVariableProviderEnabled?:boolean,
  intellijEnvEnabled?:boolean,
  intellijDirname?:string,
  intellijVariableProviderEnabled?:boolean,
  responseViewHeader?:Array<string>,
  responseViewContent?: ResponseViewContent,
  responseViewMode?: 'preview' | 'reuse' | 'open' | 'none',
  responseViewPrettyPrint?:boolean,
  responseViewPreserveFocus?:boolean,
  responseViewLanguageMap?:Record<string, string>,
  responseViewColumn?:string,
  logLevel?:string,
  logResponseBodyLength?:number,
  logRequest?: boolean,
  showlogRequestOutput?: boolean,
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
  showCodeLensSend?:boolean,
  showCodeLensSendRepeat?: boolean,
  showCodeLensTestResult?: boolean,
  showCodeLensShowResponse?:boolean,
  showCodeLensSaveResponse?:boolean,
  showCodeLensShowResponseHeaders?:boolean,
  extensionScript?:string,
  httpRegionScript?: string,

  readonly [key: string]: unknown;

}

export function getConfigSetting() : AppConfig {
  return workspace.getConfiguration(APP_NAME);
}

export type ConfigWatcher = (appConfig: AppConfig, ...config: Array<Record<string, unknown>>) => void

export function watchConfigSettings(watcher: ConfigWatcher, ...sections: Array<string>) : Disposable {
  const rootSections = [APP_NAME, ...sections];
  watcher(getConfigSetting(), ...sections.map(section => workspace.getConfiguration(section)));
  return workspace.onDidChangeConfiguration(changeEvent => {
    if (rootSections.some(section => changeEvent.affectsConfiguration(section))) {
      watcher(getConfigSetting(), ...sections.map(section => workspace.getConfiguration(section)));
    }
  });
}


export const httpDocumentSelector = [
  { language: 'http', scheme: '*' }
];
