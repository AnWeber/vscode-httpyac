import * as vscode from 'vscode';
import * as provider from './provider';
import * as httpyac from 'httpyac';
import * as config from './config';
import { initUserInteractionProvider, initFileProvider } from './io';
import { DocumentStore } from './documentStore';
import { ResponseStore } from './responseStore';
import { HttpYacExtensionApi } from './extensionApi';


export function activate(context: vscode.ExtensionContext): HttpYacExtensionApi {
  initFileProvider();

  const documentStore = new DocumentStore();
  const responseStore = new ResponseStore();

  const storeController = new provider.StoreController(documentStore);
  context.subscriptions.push(...[
    documentStore,
    responseStore,
    storeController,
    initUserInteractionProvider(),
    new provider.HistoryController(documentStore, responseStore),
    new provider.ResponseDocumentController(responseStore),
    new provider.HarCommandsController(documentStore),
    new provider.RequestCommandsController(documentStore, responseStore),
    new provider.DecorationProvider(documentStore),
    new provider.HttpCompletionItemProvider(documentStore),
    vscode.languages.registerDocumentSymbolProvider(config.httpDocumentSelector, new provider.HttpDocumentSymbolProvider(documentStore)),
  ]);

  return {
    httpyac,
    documentStore,
    responseStore,
    httpDocumentSelector: config.httpDocumentSelector,
    environmentChanged: storeController.environmentChanged,
    getErrorQuickFix: provider.getErrorQuickFix,
    getEnvironmentConfig: config.getEnvironmentConfig,
  };
}
