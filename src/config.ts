
import {workspace, WorkspaceConfiguration} from 'vscode';

export const APP_NAME = 'httpyac';


export function getConfigSetting<T>(section: string) {
  const config = workspace.getConfiguration(APP_NAME);
  return config.get<T>(section);
}


export function watchConfigSettings(watcher: (config: Record<string, any>) => void, ...sections: Array<string>) {
  const config = workspace.getConfiguration(APP_NAME);


  watcher(getConfigs(sections, config));

  return workspace.onDidChangeConfiguration((changeEvent) => {
    if (changeEvent.affectsConfiguration(APP_NAME)) {
      watcher(getConfigs(sections, config));
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