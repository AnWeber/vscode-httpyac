
import {workspace, WorkspaceConfiguration} from 'vscode';

export const APP_NAME = 'httpyac';

export const RESPONSE_VIEW_PREVIEW = 'responseViewPreview';
export const RESPONSE_VIEW_PRESERVE_FOCUS = 'responseViewPreserveFocus';


export function getConfigSetting<T>(section: string, rootSection?: string) {
  const config = workspace.getConfiguration(rootSection || APP_NAME);
  return config.get<T>(section);
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