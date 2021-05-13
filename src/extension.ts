import * as vscode from 'vscode';
import * as provider from './provider';
import * as httpyac from 'httpyac';
import { responseHandlers, ResponseOutputProcessor } from './view';
import * as config from './config';
import { initVscodeLogger } from './logger';
import { DocumentStore } from './documentStore';
import { initVscodeFileProvider } from './fileProvider';
import { HttpYacExtensionApi } from './extensionApi';


export function activate(context: vscode.ExtensionContext): HttpYacExtensionApi {
  initVscodeFileProvider();
  httpyac.httpYacApi.additionalRequire.vscode = vscode;
  httpyac.httpYacApi.httpRegionParsers.push(new httpyac.parser.NoteMetaHttpRegionParser(async (note: string) => {
    const buttonTitle = 'Execute';
    const result = await vscode.window.showWarningMessage(note, { modal: true }, buttonTitle);
    return result === buttonTitle;
  }));

  httpyac.httpYacApi.variableReplacers.splice(0, 0, new httpyac.variables.replacer.ShowInputBoxVariableReplacer(
    async (message: string, defaultValue: string) => await vscode.window.showInputBox({
      placeHolder: message,
      value: defaultValue,
      prompt: message
    })
  ));
  httpyac.httpYacApi.variableReplacers.splice(0, 0, new httpyac.variables.replacer.ShowQuickpickVariableReplacer(
    async (message: string, values: string[]) => await vscode.window.showQuickPick(values, {
      placeHolder: message
    })
  ));

  const responseOutputProcessor = new ResponseOutputProcessor();

  const refreshCodeLens = new vscode.EventEmitter<void>();

  const environementChanged = new vscode.EventEmitter<string[] | undefined>();

  const httpFileStore = new httpyac.HttpFileStore();
  const documentStore = new DocumentStore(httpFileStore);
  context.subscriptions.push(...[
    initVscodeLogger(),
    refreshCodeLens,
    new provider.HttpFileStoreController(documentStore, refreshCodeLens),
    new provider.HarCommandsController(documentStore),
    new provider.RequestCommandsController(refreshCodeLens, responseOutputProcessor, documentStore),
    new provider.EnvironmentController(environementChanged, refreshCodeLens, documentStore),
    new provider.DecorationProvider(context, refreshCodeLens, documentStore),
    new provider.HttpCompletionItemProvider(documentStore),
    responseOutputProcessor,
    vscode.languages.registerDocumentSymbolProvider(config.httpDocumentSelector, new provider.HttpDocumentSymbolProvider(documentStore)),
    config.watchConfigSettings(configuration => {
      httpFileStore.clear();
      const index = httpyac.httpYacApi.httpRegionParsers.findIndex(obj => obj instanceof httpyac.parser.SettingsScriptHttpRegionParser);
      if (index >= 0) {
        httpyac.httpYacApi.httpRegionParsers.splice(index, 1);
      }
      if (configuration.httpRegionScript) {
        httpyac.httpYacApi.httpRegionParsers.push(new httpyac.parser.SettingsScriptHttpRegionParser(async () => {
          const fileName = config.getConfigSetting().httpRegionScript;
          if (fileName) {
            if (httpyac.fileProvider.isAbsolute(fileName)) {
              try {
                const script = await httpyac.fileProvider.readFile(fileName, 'utf-8');
                return { script, lineOffset: 0 };
              } catch (err) {
                httpyac.log.trace(`file not found: ${fileName}`);
              }
            } else if (vscode.workspace.workspaceFolders) {
              for (const workspaceFolder of vscode.workspace.workspaceFolders) {
                const file = httpyac.fileProvider.joinPath(workspaceFolder.uri, fileName);
                try {
                  const script = await httpyac.fileProvider.readFile(file, 'utf-8');
                  return {
                    script,
                    lineOffset: 0
                  };
                } catch (err) {
                  httpyac.log.trace(`file not found: ${file}`);
                }
              }
            }
          }
          return undefined;
        }));
      }
    }),
    initExtensionScript(),
  ]);

  return {
    httpyac,
    httpFileStore,
    responseHandlers,
    responseOutputProcessor,
    config,
    refreshCodeLens,
    environementChanged
  };
}


function initExtensionScript() {
  const disposable = config.watchConfigSettings(async config => {
    try {
      const extensionScript = config.extensionScript;
      if (extensionScript) {
        if (httpyac.fileProvider.isAbsolute(extensionScript) && await httpyac.fileProvider.exists(extensionScript)) {
          const script = await httpyac.fileProvider.readFile(extensionScript, 'utf-8');
          await httpyac.actions.executeScript({
            script,
            fileName: extensionScript,
            variables: {},
            lineOffset: 0
          });
          httpyac.log.info('extenionscript executed. dispose config watcher');
          if (disposable) {
            disposable.dispose();
          }
        } else {
          httpyac.popupService.error('extenionscript not found');
          httpyac.log.error('extenionscript not found');
        }
      }
    } catch (err) {
      httpyac.log.error(err);
    }
  });
  return disposable;
}
