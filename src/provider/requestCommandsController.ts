import * as vscode from 'vscode';
import { httpFileStore, HttpRegion, httpYacApi, HttpSymbolKind, log, HttpRegionSendContext, HttpFileSendContext, utils, RepeatOrder } from 'httpyac';
import { AppConfig, APP_NAME, initHttpClient } from '../config';
import { errorHandler } from './errorHandler';
import { extension } from 'mime-types';
import { promises as fs } from 'fs';
import { httpDocumentSelector, watchConfigSettings } from '../config';
import { file } from 'tmp-promise';
import { getHttpRegionFromLine } from '../utils';
import { ResponseOutputProcessor } from '../view/responseOutputProcessor';

export const commands = {
  send: `${APP_NAME}.send`,
  sendRepeat: `${APP_NAME}.sendRepeat`,
  resend: `${APP_NAME}.resend`,
  sendSelected: `${APP_NAME}.sendSelected`,
  sendAll: `${APP_NAME}.sendall`,
  clearAll: `${APP_NAME}.clearall`,
  show: `${APP_NAME}.show`,
  viewHeader: `${APP_NAME}.viewHeader`,
  save: `${APP_NAME}.save`,
  new: `${APP_NAME}.new`,
};

export class RequestCommandsController implements vscode.CodeLensProvider {

  private config: AppConfig | undefined;
  private tmpFiles: Array<string> = [];

  subscriptions: Array<vscode.Disposable>;
  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(private readonly refreshCodeLens: vscode.EventEmitter<void>,
    private readonly responseOutputProcessor: ResponseOutputProcessor) {
    this.onDidChangeCodeLenses = refreshCodeLens.event;
    this.subscriptions = [
      watchConfigSettings(config => {
        this.config = config;
      }),
      vscode.commands.registerCommand(commands.send, this.send, this),
      vscode.commands.registerCommand(commands.sendRepeat, this.sendRepeat, this),
      vscode.commands.registerCommand(commands.clearAll, this.clearAll, this),
      vscode.commands.registerCommand(commands.sendAll, this.sendAll, this),
      vscode.commands.registerCommand(commands.sendSelected, this.sendSelected, this),
      vscode.commands.registerCommand(commands.resend, this.resend, this),
      vscode.commands.registerCommand(commands.show, this.show, this),
      vscode.commands.registerCommand(commands.save, this.save, this),
      vscode.commands.registerCommand(commands.viewHeader, this.viewHeader, this),
      vscode.commands.registerCommand(commands.new, this.newHttpFile, this),
      vscode.languages.registerCodeLensProvider(httpDocumentSelector, this),
      vscode.workspace.onDidCloseTextDocument(async doc => {
        const index = this.tmpFiles.indexOf(doc.fileName);
        if (index >= 0) {
          try {
            this.tmpFiles.splice(index, 1);
            await fs.unlink(doc.fileName);
          } catch (err) {
            log.error(err);
          }
        }
      })
    ];
  }

  public dispose(): void {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

  @errorHandler()
  public provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const httpFile = httpFileStore.get(document.fileName);

    const result: Array<vscode.CodeLens> = [];

    if (httpFile && httpFile.httpRegions.length > 0) {


      if (this.config?.showCodeLensSendAll) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.sendAll,
          title: 'send all'
        }));
      }

      if (this.config?.showCodeLensSendSelected) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.sendSelected,
          title: 'send selected'
        }));
      }

      if (this.config?.showCodeLensClearAll) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.clearAll,
          title: 'clear all'
        }));
      }

      for (const httpRegion of httpFile.httpRegions) {
        const requestLine = httpRegion.symbol.children?.find(obj => obj.kind === HttpSymbolKind.requestLine)?.startLine || httpRegion.symbol.startLine;
        const range = new vscode.Range(requestLine, 0, httpRegion.symbol.endLine, 0);
        const args = [document, requestLine];

        if (!!httpRegion.request && !httpRegion.metaData.disabled) {
          if (this.config?.showCodeLensSend) {
            result.push(new vscode.CodeLens(range, {
              command: commands.send,
              arguments: args,
              title: this.config?.useMethodInSendCodeLens ? `send (${httpRegion.request.method})` : 'send'
            }));
          }
          if (this.config?.showCodeLensSendRepeat) {
            result.push(new vscode.CodeLens(range, {
              command: commands.sendRepeat,
              arguments: args,
              title: this.config?.useMethodInSendCodeLens ? `send repeat (${httpRegion.request.method})` : 'send repeat'
            }));
          }
        }

        if (httpRegion.testResults && this.config?.showCodeLensTestResult) {
          result.push(new vscode.CodeLens(range, {
            arguments: [httpRegion],
            title: `TestResults ${httpRegion.testResults.filter(obj => obj.result).length}/${httpRegion.testResults.length}`,
            command: commands.viewHeader
          }));
        }

        if (httpRegion.response) {
          if (this.config?.showCodeLensShowResponse) {
            result.push(new vscode.CodeLens(range, {
              command: commands.show,
              arguments: args,
              title: 'show'
            }));
          }

          if (this.config?.showCodeLensSaveResponse) {
            result.push(new vscode.CodeLens(range, {
              command: commands.save,
              arguments: args,
              title: 'save'
            }));
          }

          if (this.config?.showCodeLensShowResponseHeaders) {
            result.push(new vscode.CodeLens(range, {
              command: commands.viewHeader,
              arguments: args,
              title: 'show headers'
            }));
          }
        }
      }
    }
    return Promise.resolve(result);
  }

  private httpRegionSendContext: HttpRegionSendContext | undefined;

  @errorHandler()
  private async send(document?: vscode.TextDocument, line?: number) : Promise<void> {
    this.httpRegionSendContext = await getHttpRegionFromLine(document, line);
    await this.sendRequest(this.httpRegionSendContext);
  }

  @errorHandler()
  private async sendRepeat(document?: vscode.TextDocument, line?: number) : Promise<void> {
    this.httpRegionSendContext = await getHttpRegionFromLine(document, line);
    const repeatOrder = await vscode.window.showQuickPick([{ label: 'parallel', value: RepeatOrder.parallel }, { label: 'sequential', value: RepeatOrder.sequential }]);
    const count = await vscode.window.showInputBox({
      placeHolder: 'repeat count',
    });

    if (repeatOrder && count && +count > 0 && this.httpRegionSendContext) {
      this.httpRegionSendContext.repeat = {
        count: +count,
        type: repeatOrder?.value
      };
      await this.sendRequest(this.httpRegionSendContext);
    }
  }

  @errorHandler()
  private async resend() : Promise<void> {
    await this.sendRequest(this.httpRegionSendContext);
  }

  @errorHandler()
  private async sendAll() : Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
      await this.sendRequest({
        httpFile,
        httpClient: initHttpClient()
      });

    }
  }

  @errorHandler()
  private async sendSelected() : Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);

      const httpRegions = httpFile.httpRegions.filter(obj => !!obj.request);

      const pickedObjs = await vscode.window.showQuickPick(httpRegions.map(httpRegion => ({
        label: utils.getRegionName(httpRegion),
        data: httpRegion
      })), {
        placeHolder: 'select requests',
        canPickMany: true,
      });

      if (pickedObjs) {
        await this.sendRequest({
          httpFile,
          httpClient: initHttpClient(),
          httpRegionPredicate: httpRegion => pickedObjs.some(obj => obj.data === httpRegion)
        });
      }

    }
  }

  private async sendRequest(context: HttpRegionSendContext | HttpFileSendContext | undefined) {

    if (context) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'send',
      }, async (progress, token) => {
        context.progress = {
          isCanceled: () => token.isCancellationRequested,
          register: (event: () => void) => {
            const dispose = token.onCancellationRequested(event);
            return () => dispose.dispose();
          },
          report: data => progress.report(data),
        };

        const result = await httpYacApi.send(context);
        if (this.refreshCodeLens) {
          this.refreshCodeLens.fire();
        }
        if (result && utils.isHttpRegionSendContext(context)) {
          await this.responseOutputProcessor.show(context.httpRegion);
        }
      });
    }

  }


  @errorHandler()
  private async clearAll() : Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = httpFileStore.get(document.fileName);
      if (httpFile) {
        for (const httpRegion of httpFile.httpRegions) {
          delete httpRegion.response;
        }
      }
    }
  }

  @errorHandler()
  private async show(document?: vscode.TextDocument, line?: number) : Promise<void> {
    const parsedDocument = await getHttpRegionFromLine(document, line);
    if (parsedDocument) {
      await this.responseOutputProcessor.show(parsedDocument.httpRegion);
    }
  }

  @errorHandler()
  private async viewHeader(document: vscode.TextDocument | HttpRegion | undefined, line: number | undefined) : Promise<void> {
    if (document) {
      let httpRegion: HttpRegion | undefined;
      if (this.isHttpRegion(document)) {
        httpRegion = document;
      } else {
        const parsedDocument = await getHttpRegionFromLine(document, line);
        if (parsedDocument) {
          httpRegion = parsedDocument.httpRegion;
        }
      }

      if (httpRegion?.response) {
        const content = utils.toMarkdownPreview(httpRegion.response, httpRegion.testResults);
        const { path } = await file({ postfix: '.md' });
        const uri = vscode.Uri.file(path);
        if (uri) {
          await fs.writeFile(uri.fsPath, content);
          this.tmpFiles.push(uri.fsPath);
          await vscode.commands.executeCommand('vscode.openWith', uri, 'vscode.markdown.preview.editor');
        }
      }
    }
  }

  @errorHandler()
  private async save(document?: vscode.TextDocument, line?: number) : Promise<void> {
    const parsedDocument = await getHttpRegionFromLine(document, line);
    if (parsedDocument && parsedDocument.httpRegion.response) {
      const ext = parsedDocument.httpRegion.metaData.extension || extension(parsedDocument.httpRegion.response.contentType?.contentType || 'application/octet-stream');
      const filters: Record<string, Array<string>> = {};
      if (ext) {
        filters[ext] = [ext];
      }
      const uri = await vscode.window.showSaveDialog({
        filters
      });
      if (uri && parsedDocument.httpRegion.response.rawBody) {
        await fs.writeFile(uri.fsPath, new Uint8Array(parsedDocument.httpRegion.response.rawBody));
      }
    }
  }

  @errorHandler()
  private async newHttpFile(): Promise<void> {
    const language = 'http';
    const document = await vscode.workspace.openTextDocument({ language, content: '' });
    await vscode.window.showTextDocument(document);
  }

  private isHttpRegion(obj: unknown): obj is HttpRegion {
    const guard = obj as HttpRegion;
    return Array.isArray(guard.actions) && !!guard.symbol && !!guard.metaData;
  }
}
