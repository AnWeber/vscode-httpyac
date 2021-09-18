import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { ResponseHandler, ResponseItem, ResponseStore as IResponseStore } from './extensionApi';
import * as view from './view';
import { DisposeProvider } from './utils';


export class ResponseStore extends DisposeProvider implements IResponseStore {
  readonly responseCache: Array<ResponseItem> = [];
  private readonly refreshHistory: vscode.EventEmitter<void>;
  private prettyPrintDocuments: Array<vscode.TextDocument> = [];


  readonly responseHandlers: Array<ResponseHandler> = [
    view.saveFileResponseHandler,
    view.openWithResponseHandler,
    view.previewDocumentResponseHandler,
    view.reuseDocumentResponseHandler,
    view.openDocumentResponseHandler,
  ];

  constructor() {
    super();
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(async editor => {
        const indexOfDocument = editor?.document && this.prettyPrintDocuments.indexOf(editor.document) || -1;
        if (editor && indexOfDocument >= 0) {
          await this.prettyPrint(editor);
          this.prettyPrintDocuments.splice(indexOfDocument, 1);
        }
      }),
      vscode.workspace.onDidCloseTextDocument(document => {
        const responseItem = this.findResponseByDocument(document);
        if (responseItem) {
          this.removeDocument(responseItem);
        }
      }),
    ];
    this.refreshHistory = new vscode.EventEmitter<void>();
  }


  get historyChanged(): vscode.Event<void> {
    return this.refreshHistory.event;
  }

  findResponseByDocument(document: vscode.TextDocument): Readonly<ResponseItem> | undefined {
    return this.responseCache.find(obj => obj.document === document);
  }

  public async add(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion): Promise<ResponseItem> {
    let responseItem = this.responseCache.find(obj => obj.response === response);
    if (!responseItem) {
      responseItem = {
        name: this.getName(response, httpRegion),
        created: new Date(),
        response,
        httpRegion,
      };
      this.responseCache.splice(0, 0, responseItem);
      this.refreshHistory.fire();
      vscode.commands.executeCommand('setContext', 'httpyacHistoryEnabled', this.responseCache.length > 0);
      await this.show(responseItem);
    }
    return responseItem;
  }

  private getName(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) {
    if (httpRegion) {
      return httpRegion.symbol.name;
    }
    if (response.request) {
      return `${response.request?.method} ${response.request?.url}`;
    }
    return `${response.protocol} ${response.statusCode}`;
  }

  remove(responseItem: ResponseItem): boolean {
    const index = this.responseCache.indexOf(responseItem);
    if (index >= 0) {
      this.responseCache.splice(index, 1);
      this.refreshHistory.fire();
      if (this.responseCache.length === 0) {
        vscode.commands.executeCommand('setContext', 'httpyacHistoryEnabled', false);
      }
      return true;
    }
    return false;
  }

  clear(): void {
    this.responseCache.length = 0;
    this.refreshHistory.fire();
    vscode.commands.executeCommand('setContext', 'httpyacHistoryEnabled', false);
  }

  public async show(responseItem: ResponseItem): Promise<void> {
    for (const responseHandler of this.responseHandlers) {
      const result = await responseHandler(responseItem.response, responseItem.httpRegion);
      if (result) {
        if (result !== true) {
          await this.prettyPrint(result.editor);

          result.editor.revealRange(new vscode.Range(0, 0, result.editor.document.lineCount, 0), vscode.TextEditorRevealType.AtTop);

          const cacheItem = this.responseCache.find(obj => obj.document === result.document);
          if (cacheItem) {
            await this.removeDocument(cacheItem);
          }
          responseItem.document = result.document;
          responseItem.uri = result.uri;
        }
        return;
      }
    }

  }

  private async prettyPrint(editor: vscode.TextEditor): Promise<void> {
    if (editor) {
      if (vscode.window.activeTextEditor?.document === editor.document) {
        if (await vscode.commands.executeCommand<boolean>('editor.action.formatDocument', vscode.window.activeTextEditor)) {
          this.prettyPrintDocuments.push(editor.document);
        }
      } else {
        this.prettyPrintDocuments.push(editor.document);
      }
    }
  }

  private async removeDocument(responseItem: ResponseItem): Promise<void> {
    if (responseItem.document) {
      try {
        if (responseItem.uri) {
          await vscode.workspace.fs.delete(responseItem.uri);
        }
      } catch (err) {
        httpyac.io.log.error(err);
      } finally {
        delete responseItem.uri;
        delete responseItem.document;
        delete responseItem.httpRegion;
      }
    }
  }
}
