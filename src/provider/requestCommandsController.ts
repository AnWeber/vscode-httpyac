import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { getConfigSetting, APP_NAME } from '../config';
import { errorHandler } from './errorHandler';
import { extension } from 'mime-types';
import { httpDocumentSelector } from '../config';
import { file } from 'tmp-promise';
import * as utils from '../utils';
import { ResponseOutputProcessor } from '../view/responseOutputProcessor';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';

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

export class RequestCommandsController extends DisposeProvider implements vscode.CodeLensProvider {

  private tmpFiles: Array<vscode.Uri> = [];

  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(
    private readonly refreshCodeLens: vscode.EventEmitter<void>,
    private readonly responseOutputProcessor: ResponseOutputProcessor,
    private readonly documentStore: DocumentStore
  ) {
    super();
    this.onDidChangeCodeLenses = refreshCodeLens.event;
    this.subscriptions = [
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
        const index = this.tmpFiles.indexOf(doc.uri);
        if (index >= 0) {
          try {
            this.tmpFiles.splice(index, 1);
            await vscode.workspace.fs.delete(doc.uri);
          } catch (err) {
            httpyac.io.log.error(err);
          }
        }
      })
    ];
  }

  @errorHandler()
  public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const httpFile = await this.documentStore.getHttpFile(document);

    const config = getConfigSetting();
    const result: Array<vscode.CodeLens> = [];

    if (!config?.useCodeLensInNotebook && utils.isNotebook(document)) {
      return result;
    }

    if (httpFile && httpFile.httpRegions.length > 0) {
      if (config?.showCodeLensSendAll) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.sendAll,
          title: 'send all'
        }));
      }

      if (config?.showCodeLensSendSelected) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.sendSelected,
          title: 'send selected'
        }));
      }

      if (config?.showCodeLensClearAll) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.clearAll,
          title: 'clear all'
        }));
      }

      for (const httpRegion of httpFile.httpRegions) {
        const requestLine = httpRegion.symbol.children?.find(obj => obj.kind === httpyac.HttpSymbolKind.requestLine)?.startLine || httpRegion.symbol.startLine;
        const range = new vscode.Range(requestLine, 0, httpRegion.symbol.endLine, 0);
        const args = [document.uri, requestLine];

        if (!!httpRegion.request && !httpRegion.metaData.disabled) {
          if (config?.showCodeLensSend) {
            result.push(new vscode.CodeLens(range, {
              command: commands.send,
              arguments: args,
              title: config?.useMethodInSendCodeLens ? `send (${httpRegion.request.method})` : 'send'
            }));
          }
          if (config?.showCodeLensSendRepeat) {
            result.push(new vscode.CodeLens(range, {
              command: commands.sendRepeat,
              arguments: args,
              title: config?.useMethodInSendCodeLens ? `send repeat (${httpRegion.request.method})` : 'send repeat'
            }));
          }
        }

        if (httpRegion.testResults && config?.showCodeLensTestResult) {
          result.push(new vscode.CodeLens(range, {
            arguments: [httpRegion],
            title: `TestResults ${httpRegion.testResults.filter(obj => obj.result).length}/${httpRegion.testResults.length}`,
            command: commands.viewHeader
          }));
        }

        if (httpRegion.response) {
          if (config?.showCodeLensShowResponse) {
            result.push(new vscode.CodeLens(range, {
              command: commands.show,
              arguments: args,
              title: 'show'
            }));
          }

          if (config?.showCodeLensSaveResponse) {
            result.push(new vscode.CodeLens(range, {
              command: commands.save,
              arguments: args,
              title: 'save'
            }));
          }

          if (config?.showCodeLensShowResponseHeaders) {
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

  private httpRegionSendContext: httpyac.HttpRegionSendContext | undefined;

  @errorHandler()
  private async send(document?: utils.DocumentArgument, line?: utils.LineArgument) : Promise<void> {
    this.httpRegionSendContext = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    await this.sendRequest(this.httpRegionSendContext);
  }

  @errorHandler()
  private async sendRepeat(document?: utils.DocumentArgument, line?: utils.LineArgument) : Promise<void> {
    this.httpRegionSendContext = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    const repeatOrder = await vscode.window.showQuickPick([
      { label: 'parallel', value: httpyac.RepeatOrder.parallel },
      { label: 'sequential', value: httpyac.RepeatOrder.sequential }
    ]);
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
      const httpFile = await this.documentStore.getHttpFile(document);
      await this.sendRequest({
        httpFile,
      });

    }
  }

  @errorHandler()
  private async sendSelected() : Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await this.documentStore.getHttpFile(document);

      const httpRegions = httpFile.httpRegions.filter(obj => !!obj.request);

      const pickedObjs = await vscode.window.showQuickPick(httpRegions.map(httpRegion => ({
        label: httpyac.utils.getDisplayName(httpRegion),
        data: httpRegion
      })), {
        placeHolder: 'select requests',
        canPickMany: true,
      });

      if (pickedObjs) {
        await this.sendRequest({
          httpFile,
          httpRegionPredicate: httpRegion => pickedObjs.some(obj => obj.data === httpRegion)
        });
      }

    }
  }

  private async sendRequest(context: httpyac.HttpRegionSendContext | httpyac.HttpFileSendContext | undefined) {

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


        const result = await utils.sendContext(context);
        if (this.refreshCodeLens) {
          this.refreshCodeLens.fire();
        }
        if (result && httpyac.utils.isHttpRegionSendContext(context)) {
          await this.responseOutputProcessor.show(context.httpRegion);
        }
      });
    }

  }


  @errorHandler()
  private async clearAll() : Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await this.documentStore.getHttpFile(document);
      if (httpFile) {
        for (const httpRegion of httpFile.httpRegions) {
          delete httpRegion.response;
        }
      }
    }
  }

  @errorHandler()
  private async show(document?: utils.DocumentArgument, line?: utils.LineArgument) : Promise<void> {
    const context = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    if (context) {
      await this.responseOutputProcessor.show(context.httpRegion);
    }
  }

  @errorHandler()
  private async viewHeader(document: utils.DocumentArgument | httpyac.HttpRegion | undefined, line: utils.LineArgument) : Promise<void> {
    if (document) {
      let httpRegion: httpyac.HttpRegion | undefined;
      if (this.isHttpRegion(document)) {
        httpRegion = document;
      } else {
        const context = await utils.getHttpRegionFromLine(document, line, this.documentStore);
        if (context) {
          httpRegion = context.httpRegion;
        }
      }

      if (httpRegion?.response) {
        const content = httpyac.utils.toMarkdown(httpRegion.response, {
          testResults: httpRegion.testResults,
          meta: true,
          timings: true,
          responseBody: true,
          requestBody: true,
          prettyPrint: true,
        });
        const { path } = await file({ postfix: '.md' });
        const uri = vscode.Uri.file(path);
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
          this.tmpFiles.push(uri);
          await vscode.commands.executeCommand('vscode.openWith', uri, 'vscode.markdown.preview.editor');
        }
      }
    }
  }

  @errorHandler()
  private async save(document?: utils.DocumentArgument, line?: utils.LineArgument) : Promise<void> {
    const context = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    if (context?.httpRegion?.response) {
      const { response, metaData } = context.httpRegion;
      const ext = metaData.extension || extension(response.contentType?.contentType || 'application/octet-stream');
      const filters: Record<string, Array<string>> = {};
      if (ext) {
        filters[ext] = [ext];
      }
      const uri = await vscode.window.showSaveDialog({
        filters
      });
      if (uri && response.rawBody) {
        await vscode.workspace.fs.writeFile(uri, new Uint8Array(response.rawBody));
      }
    }
  }

  @errorHandler()
  private async newHttpFile(): Promise<void> {
    const language = 'http';
    const document = await vscode.workspace.openTextDocument({ language, content: '' });
    await vscode.window.showTextDocument(document);
  }

  private isHttpRegion(obj: unknown): obj is httpyac.HttpRegion {
    const guard = obj as httpyac.HttpRegion;
    return !!guard.symbol && !!guard.metaData;
  }
}
