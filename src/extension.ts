import * as config from './config';
import { DocumentStore } from './documentStore';
import { HttpYacExtensionApi } from './extensionApi';
import { initIOProvider, StorageProvider } from './io';
import * as provider from './provider';
import { ResponseStore } from './responseStore';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): HttpYacExtensionApi {
  const storageProvider = new StorageProvider(context.globalStorageUri);
  const documentStore = new DocumentStore();
  const responseStore = new ResponseStore(storageProvider);

  const storeController = new provider.StoreController(documentStore, responseStore);
  context.subscriptions.push(
    ...[
      documentStore,
      responseStore,
      storeController,
      initIOProvider(),
      new provider.CodeLensProvider(documentStore, responseStore),
      new provider.HistoryController(documentStore, responseStore),
      new provider.ResponseDocumentController(responseStore),
      new provider.CodeGenerationController(documentStore),
      new provider.RequestCommandsController(documentStore, responseStore, storageProvider),
      new provider.DecorationProvider(documentStore),
      new provider.HttpCompletionItemProvider(documentStore),
      new provider.UserSessionTreeDataProvider(documentStore),
      new provider.DebugTreeDataProvider(documentStore, responseStore),
      new provider.EnvironmentTreeDataProvider(documentStore, storeController.environmentChanged),
      new provider.VariablesHoverProvider(documentStore, storeController.environmentChanged),
      new provider.VariablesTreeDataProvider(documentStore, storeController.environmentChanged),
      new provider.TestController(documentStore, responseStore, storeController),
      vscode.languages.registerDocumentSymbolProvider(
        config.allHttpDocumentSelector,
        new provider.HttpDocumentSymbolProvider(documentStore)
      ),
    ]
  );
  vscode.commands.executeCommand(
    'setContext',
    'httpyac.supportedLanguages',
    config.allHttpDocumentSelector.map(obj => obj.language)
  );

  return {
    httpyac,
    documentStore,
    responseStore,
    httpDocumentSelector: config.httpDocumentSelector,
    allHttpDocumentSelector: config.allHttpDocumentSelector,
    environmentChanged: storeController.environmentChanged,
    getErrorQuickFix: provider.getErrorQuickFix,
    getEnvironmentConfig: config.getEnvironmentConfig,
  };
}
