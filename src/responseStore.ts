import { getConfigSetting } from './config';
import { ResponseHandler, ResponseItem, ResponseStore as IResponseStore } from './extensionApi';
import { StorageProvider } from './io';
import { DisposeProvider } from './utils';
import * as view from './view';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export class ResponseStore extends DisposeProvider implements IResponseStore {
  readonly responseCache: Array<view.ResponseItem> = [];
  private readonly refreshHistory: vscode.EventEmitter<void>;
  private prettyPrintDocuments: Array<vscode.Uri> = [];

  readonly responseHandlers: Array<ResponseHandler>;

  constructor(private readonly storageProvider: StorageProvider) {
    super();
    this.responseHandlers = [
      view.saveFileResponseHandler,
      view.noResponseViewResponseHandler,
      view.openWithResponseHandlerFactory(storageProvider),
      view.previewResponseHandlerFactory(storageProvider),
    ];
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(async editor => {
        const indexOfDocument = (editor?.document && this.prettyPrintDocuments.indexOf(editor.document.uri)) || -1;
        if (editor && indexOfDocument >= 0) {
          await this.prettyPrint(editor);
          this.prettyPrintDocuments.splice(indexOfDocument, 1);
        }
      }),
    ];
    this.refreshHistory = new vscode.EventEmitter<void>();
    this.refreshHistory.event(() =>
      vscode.commands.executeCommand('setContext', 'httpyac.historyEnabled', this.hasItems)
    );
  }

  get historyChanged(): vscode.Event<void> {
    return this.refreshHistory.event;
  }

  findResponseByDocument(document: vscode.TextDocument): view.ResponseItem | undefined {
    const docUri = document.uri.toString();
    return this.responseCache.find(obj => obj.documentUri?.toString() === docUri);
  }

  findResponseByHttpRegion(httpRegion: httpyac.HttpRegion): view.ResponseItem | undefined {
    return this.responseCache.find(
      obj => obj.name === httpRegion.symbol.name && obj.line === httpRegion.symbol.startLine
    );
  }

  public async add(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion, show = true): Promise<void> {
    const responseItem = new view.ResponseItem(response, httpRegion);
    if (show) {
      await this.show(responseItem);
    }
    await this.shrink(responseItem);
    this.addToCache(responseItem);
  }

  private addToCache(responseItem: view.ResponseItem) {
    const config = getConfigSetting();
    this.responseCache.splice(0, 0, responseItem);
    this.responseCache.length = Math.min(this.responseCache.length, config.maxHistoryItems || 50);
    this.refreshHistory.fire();
  }

  async remove(responseItem: ResponseItem): Promise<boolean> {
    const index = this.responseCache.findIndex(obj => obj.id === responseItem.id);
    if (index >= 0) {
      if (responseItem.responseUri) {
        await this.storageProvider.deleteFile(responseItem.responseUri);
      }
      this.responseCache.splice(index, 1);
      this.refreshHistory.fire();
      return true;
    }
    return false;
  }

  get hasItems() {
    return this.responseCache.length > 0;
  }

  async clear(): Promise<void> {
    for (const responseItem of this.responseCache) {
      if (responseItem.responseUri) {
        await this.storageProvider.deleteFile(responseItem.responseUri);
      }
    }
    this.responseCache.length = 0;
    this.refreshHistory.fire();
  }

  public async shrink(responseItem: ResponseItem): Promise<void> {
    const response = responseItem.response;
    if (response.rawBody) {
      const responseUri =
        responseItem.responseUri ||
        (await this.storageProvider.writeFile(response.rawBody, `${responseItem.id}.${responseItem.extension}`));
      if (responseUri) {
        this.shrinkResponseItem(response);
        responseItem.responseUri = responseUri;
        responseItem.isCachedResponse = true;
        responseItem.loadResponseBody = async () => {
          const buffer = await vscode.workspace.fs.readFile(responseUri);
          response.rawBody = Buffer.from(buffer);
          response.body = response.rawBody.toString('utf-8');
          responseItem.isCachedResponse = false;
          delete responseItem.loadResponseBody;
        };
      } else {
        await this.remove(responseItem);
      }
    }
  }

  private shrinkResponseItem(response: httpyac.HttpResponse) {
    delete response.request?.body;
    delete response.parsedBody;
    delete response.body;
    delete response.rawHeaders;
    delete response.rawBody;
    delete response.prettyPrintBody;
  }

  public async show(responseItem: ResponseItem): Promise<void> {
    for (const responseHandler of this.responseHandlers) {
      const result = await responseHandler(responseItem);
      if (result) {
        if (getConfigSetting().responseViewPrettyPrint && vscode.window.activeTextEditor) {
          await this.prettyPrint(vscode.window.activeTextEditor);
        }
        break;
      }
    }
  }

  private async prettyPrint(editor: vscode.TextEditor): Promise<void> {
    if (editor) {
      if (vscode.window.activeTextEditor?.document === editor.document) {
        if (await vscode.commands.executeCommand<boolean>('editor.action.formatDocument', editor)) {
          this.prettyPrintDocuments.push(editor.document.uri);
        }
      } else {
        this.prettyPrintDocuments.push(editor.document.uri);
      }
    }
  }
}
