
import {workspace, WorkspaceConfiguration} from 'vscode';

export const APP_NAME = 'httpyac';

export const RESPONSE_VIEW_PREVIEW = 'responseViewPreview';
export const RESPONSE_VIEW_PRESERVE_FOCUS = 'responseViewPreserveFocus';



export interface AppConfig {
  requestDefaultHeaders?: Record<string, string>

  requestSslCertficateValidation?: boolean,
  requestFollowRedirect?:boolean,
  requestTimeout?:number,
  environmentSelectedOnStart?: Array<string>,
  environmentPickMany?:boolean,
  environmentVariables?:object,
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


export function watchConfigSettings(watcher: (...config: Array<Record<string, any>>) => void, ...sections: Array<string>) {
  const rootSections = [APP_NAME, ...sections];
  watcher(...rootSections.map(section => workspace.getConfiguration(section)));
  return workspace.onDidChangeConfiguration((changeEvent) => {
    if (rootSections.some(section => changeEvent.affectsConfiguration(section))) {
      watcher(...rootSections.map(section => workspace.getConfiguration(section)));
    }
  });
}

function getConfigs(sections: Array<string>, config: WorkspaceConfiguration) {
  const result: Record<string, any> = {};
  for (const section of sections) {
    result[section] = config.get<any>(section);
  }
  return result;
}

export const httpDocumentSelector = [
	{ language: 'http', scheme: '*' }
];