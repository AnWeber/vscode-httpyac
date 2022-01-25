import * as config from './config';
import { DocumentStore } from './documentStore';
import { HttpYacExtensionApi } from './extensionApi';
import * as io from './io';
import * as provider from './provider';
import { ResponseStore } from './responseStore';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): HttpYacExtensionApi {
  io.initFileProvider();

  const storageProvider = new io.StorageProvider(context.globalStorageUri);
  const documentStore = new DocumentStore();
  const responseStore = new ResponseStore(storageProvider);

  const storeController = new provider.StoreController(documentStore);
  context.subscriptions.push(
    ...[
      documentStore,
      responseStore,
      storeController,
      io.initUserInteractionProvider(),
      new provider.CodeLensProvider(documentStore, responseStore),
      new provider.HistoryController(documentStore, responseStore),
      new provider.ResponseDocumentController(responseStore),
      new provider.HarCommandsController(documentStore),
      new provider.RequestCommandsController(documentStore, responseStore, storageProvider),
      new provider.DecorationProvider(documentStore),
      new provider.HttpCompletionItemProvider(documentStore),
      new provider.UserSessionTreeDataProvider(documentStore),
      new provider.DebugTreeDataProvider(documentStore),
      new provider.VariablesTreeDataProvider(documentStore, storeController.environmentChanged),
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
