import * as vscode from 'vscode';
import * as provider from './provider';
import * as httpyac from 'httpyac';
import { responseHandlers, ResponseOutputProcessor } from './view';
import * as config from './config';
import { initUserInteractionProvider, initFileProvider } from './io';
import { DocumentStore } from './documentStore';
import { HttpYacExtensionApi } from './extensionApi';
import { sendContext } from './utils';


export function activate(context: vscode.ExtensionContext): HttpYacExtensionApi {
  initFileProvider();
  httpyac.httpYacApi.additionalRequire.vscode = vscode;

  const responseOutputProcessor = new ResponseOutputProcessor();

  const refreshCodeLens = new vscode.EventEmitter<void>();

  const environementChanged = new vscode.EventEmitter<string[] | undefined>();

  const httpFileStore = new httpyac.HttpFileStore();
  const documentStore = new DocumentStore(httpFileStore);
  context.subscriptions.push(...[
    initUserInteractionProvider(),
    refreshCodeLens,
    new provider.HttpFileStoreController(documentStore, refreshCodeLens),
    new provider.HarCommandsController(documentStore),
    new provider.RequestCommandsController(refreshCodeLens, responseOutputProcessor, documentStore),
    new provider.EnvironmentController(environementChanged, refreshCodeLens, documentStore),
    new provider.DecorationProvider(refreshCodeLens, documentStore),
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
                const file = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
                try {
                  const content = await vscode.workspace.fs.readFile(file);
                  const script = Buffer.from(content).toString('utf-8');
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
    documentStore,
    responseHandlers,
    responseOutputProcessor,
    httpDocumentSelector: config.httpDocumentSelector,
    refreshCodeLens,
    environementChanged,
    getErrorQuickFix: provider.getErrorQuickFix,
    sendContext,
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
          httpyac.log.error('extenionscript not found');
        }
      }
    } catch (err) {
      httpyac.log.error(err);
    }
  });
  return disposable;
}
