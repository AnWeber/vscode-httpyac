
import { gotHttpClientFactory, HttpDefaultOptions } from 'httpyac';
import {workspace, WorkspaceConfiguration} from 'vscode';

export const APP_NAME = 'httpyac';

export const RESPONSE_VIEW_PREVIEW = 'responseViewPreview';
export const RESPONSE_VIEW_PRESERVE_FOCUS = 'responseViewPreserveFocus';
export interface AppConfig {
  requestDefaultHeaders?: Record<string, string>

  requestOptions?: HttpDefaultOptions,
  environmentSelectedOnStart?: Array<string>,
  environmentPickMany?:boolean,
  environmentVariables?: Record<string, Record<string, any>>,
  dotenvEnabled?:boolean,
  dotenvDirname?:string,
  dotenvDefaultFiles?:Array<string>,
  dotenvVariableProviderEnabled?:boolean,
  intellijEnvEnabled?:boolean,
  intellijDirname?:string,
  intellijVariableProviderEnabled?:boolean,
  responseViewHeader?:Array<string>,
  responseViewMode?: 'preview' | 'reuse' | 'open',
  responseViewPrettyPrint?:boolean,
  responseViewPreserveFocus?:boolean,
  responseViewLanguageMap?:Record<string,string>,
  responseViewColumn?:string,
  logLevel?:string,
  logResponseBodyLength?:number,
  logRequest?:boolean,
  useMethodInSendCodeLens?:boolean,
  showGutterIcon?:boolean,
  showNotificationPopup?:boolean,
  showCodeLensEnvironment?:boolean,
  showCodeLensResetEnvironment?:boolean,
  showCodeLensLogoutUserSession?:boolean,
  showCodeLensSendAll?: boolean,
  showCodeLensSend?:boolean,
  showCodeLensSendRepeat?:boolean,
  showCodeLensShowResponse?:boolean,
  showCodeLensSaveResponse?:boolean,
  showCodeLensShowResponseHeaders?:boolean,
  extensionScript?:string,
  httpRegionScript?: string,

  readonly [key: string]: any;

};


export function getConfigSetting() : AppConfig {
  return workspace.getConfiguration(APP_NAME);
}


export function watchConfigSettings(watcher: (appConfig: AppConfig, ...config: Array<Record<string, any>>) => void, ...sections: Array<string>) {
  const rootSections = [...sections];
  watcher(getConfigSetting(), ...sections.map(section => workspace.getConfiguration(section)));
  return workspace.onDidChangeConfiguration((changeEvent) => {
    if (rootSections.some(section => changeEvent.affectsConfiguration(section))) {
      watcher(getConfigSetting(), ...sections.map(section => workspace.getConfiguration(section)));
    }
  });
}


export const httpDocumentSelector = [
	{ language: 'http', scheme: '*' }
];

export function initHttpClient(){
  const config = getConfigSetting();
  const httpConfig = workspace.getConfiguration('http');
  return gotHttpClientFactory(config.requestOptions, httpConfig.proxy);
}