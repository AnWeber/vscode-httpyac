import * as vscode from 'vscode';
import { httpFileStore, HttpRegion, HttpFile, httpYacApi, HttpSymbolKind, log, HttpRegionSendContext, HttpFileSendContext, utils, RepeatOrder } from 'httpyac';
import { APP_NAME, getConfigSetting } from '../config';
import { errorHandler } from './errorHandler';
import { extension } from 'mime-types';
import { promises as fs } from 'fs';
import { httpDocumentSelector } from '../config';
import { file } from 'tmp-promise';
import { getHttpRegionFromLine, toMarkdown } from '../utils';

interface CommandData{
  httpRegion: HttpRegion;
  httpFile: HttpFile
}
export const commands = {
  send: `${APP_NAME}.send`,
  sendRepeat: `${APP_NAME}.sendRepeat`,
  resend: `${APP_NAME}.resend`,
  sendAll:`${APP_NAME}.sendall`,
  clearAll:`${APP_NAME}.clearall`,
  show: `${APP_NAME}.show`,
  viewHeader: `${APP_NAME}.viewHeader`,
  save: `${APP_NAME}.save`,
  new: `${APP_NAME}.new`,
};

export class RequestCommandsController implements vscode.CodeLensProvider {

  private tmpFiles: Array<string> = [];

  subscriptions: Array<vscode.Disposable>;
  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(private readonly refreshCodeLens: vscode.EventEmitter<void>) {
    this.onDidChangeCodeLenses = refreshCodeLens.event;
    this.subscriptions = [
      vscode.commands.registerCommand(commands.send, this.send, this),
      vscode.commands.registerCommand(commands.sendRepeat, this.sendRepeat, this),
      vscode.commands.registerCommand(commands.clearAll, this.clearAll, this),
      vscode.commands.registerCommand(commands.sendAll, this.sendAll, this),
      vscode.commands.registerCommand(commands.resend, this.resend, this),
      vscode.commands.registerCommand(commands.show, this.show, this),
      vscode.commands.registerCommand(commands.save, this.save, this),
      vscode.commands.registerCommand(commands.viewHeader, this.viewHeader, this),
      vscode.commands.registerCommand(commands.new, this.newHttpFile, this),
      vscode.languages.registerCodeLensProvider(httpDocumentSelector, this),
      vscode.workspace.onDidCloseTextDocument(async (doc) => {
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

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

  @errorHandler()
  public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    const httpFile = httpFileStore.get(document.fileName);

    const result: Array<vscode.CodeLens> = [];

    if (httpFile && httpFile.httpRegions.length > 0) {

      result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        command: commands.sendAll,
        title: 'send all'
      }));

      const useMethodInSendCodeLens = getConfigSetting<boolean>('useMethodInSendCodeLens');

      for (const httpRegion of httpFile.httpRegions) {
        const requestLine = httpRegion.symbol.children?.find(obj => obj.kind === HttpSymbolKind.requestLine)?.startLine || httpRegion.symbol.startLine;
        const range = new vscode.Range(requestLine, 0, httpRegion.symbol.endLine, 0);
        const args = [document, requestLine];

        if (!!httpRegion.request && !httpRegion.metaData.disabled) {
          result.push(new vscode.CodeLens(range, {
            command: commands.send,
            arguments: args,
            title:  useMethodInSendCodeLens? `send (${httpRegion.request.method})` : 'send'
          }));

        }

        if (httpRegion.response) {
          result.push(new vscode.CodeLens(range, {
            command: commands.show,
            arguments: args,
            title: 'show'
          }));

          result.push(new vscode.CodeLens(range, {
            command: commands.save,
            arguments: args,
            title: 'save'
          }));

          result.push(new vscode.CodeLens(range, {
            command: commands.viewHeader,
            arguments: args,
            title: 'show headers'
          }));
        }
      }
    }
    return Promise.resolve(result);
  }

  private httpRegionSendContext: HttpRegionSendContext | undefined;

  @errorHandler()
  async send(document?: vscode.TextDocument, line?: number) {
    this.httpRegionSendContext = await getHttpRegionFromLine(document, line);
    await this.sendRequest(this.httpRegionSendContext);
  }

  @errorHandler()
  async sendRepeat(document?: vscode.TextDocument, line?: number) {
    this.httpRegionSendContext = await getHttpRegionFromLine(document, line);
    const repeatOrder = await vscode.window.showQuickPick([{label: 'parallel', value: RepeatOrder.parallel}, {label: 'sequential', value: RepeatOrder.sequential}]);
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
  async resend() {
    await this.sendRequest(this.httpRegionSendContext);
  }

  @errorHandler()
  async sendAll() {
    const document  = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
      await this.sendRequest({httpFile, httpClient: httpYacApi.httpClient});

    }
  }

  private async sendRequest(context: HttpRegionSendContext | HttpFileSendContext | undefined) {

    if (context) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: "send",
      }, async (progress, token) => {
          context.progress = {
            isCanceled: () => token.isCancellationRequested,
            register: (event: () => void) => {
              const dispose = token.onCancellationRequested(event);
              return () => dispose.dispose();
            },
            report: (data) => progress.report(data),
          };

          const result = await httpYacApi.send(context);
          if (this.refreshCodeLens) {
            this.refreshCodeLens.fire();
          }
          if (result && utils.isHttpRegionSendContext(context)) {
            await httpYacApi.show(context.httpRegion,context.httpFile);
          }

      });
    }

  }


  @errorHandler()
  async clearAll() {
    let document = vscode.window.activeTextEditor?.document;
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
  async show(document?: vscode.TextDocument, line?: number) {
    const parsedDocument = await getHttpRegionFromLine(document, line);
    if (parsedDocument) {
      await httpYacApi.show(parsedDocument.httpRegion, parsedDocument.httpFile);
    }
  }

  @errorHandler()
  async viewHeader(document: vscode.TextDocument | HttpRegion | undefined, line: number | undefined) {
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

      if (httpRegion) {
        const content = toMarkdown(httpRegion);
        const { path } = await file({ postfix: `.md` });
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
  async save(document?: vscode.TextDocument, line?: number) {
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
  async newHttpFile() {
    const language = 'http';
    const document = await vscode.workspace.openTextDocument({ language, content: '' });
    await vscode.window.showTextDocument(document);
  }



  toString() {
    return 'requestCommandsController';
  }
  isHttpRegion(obj: any): obj is HttpRegion{
    return obj.actions && obj.symbol && obj.metaData;
  }
}
