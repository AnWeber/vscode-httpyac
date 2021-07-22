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

  const responseOutputProcessor = new ResponseOutputProcessor();

  const refreshCodeLens = new vscode.EventEmitter<void>();

  const environementChanged = new vscode.EventEmitter<string[] | undefined>();

  const httpFileStore = new httpyac.store.HttpFileStore();
  const documentStore = new DocumentStore(httpFileStore);
  context.subscriptions.push(...[
    initUserInteractionProvider(),
    refreshCodeLens,
    new provider.HttpFileStoreController(documentStore, refreshCodeLens),
    new provider.HarCommandsController(documentStore),
    new provider.RequestCommandsController(refreshCodeLens, responseOutputProcessor, documentStore),
    new provider.StoreController(environementChanged, refreshCodeLens, documentStore),
    new provider.DecorationProvider(refreshCodeLens, documentStore),
    new provider.HttpCompletionItemProvider(documentStore),
    responseOutputProcessor,
    vscode.languages.registerDocumentSymbolProvider(config.httpDocumentSelector, new provider.HttpDocumentSymbolProvider(documentStore)),
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
    getEnvironmentConfig: config.getEnvironmentConfig,
  };
}
