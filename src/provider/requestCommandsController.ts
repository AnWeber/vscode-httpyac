import * as vscode from 'vscode';
import { httpFileStore, HttpRegion, HttpFile, httpYacApi } from 'httpyac';
import { APP_NAME } from '../config';
import { errorHandler } from './errorHandler';

interface CommandData{
  httpRegion: HttpRegion;
  httpFile: HttpFile
}
const commands = {
  send: `${APP_NAME}.send`,
  resend: `${APP_NAME}.resend`,
  sendAll:`${APP_NAME}.sendall`,
  clearAll:`${APP_NAME}.clearall`,
  show: `${APP_NAME}.show`,
};

export class RequestCommandsController implements vscode.CodeLensProvider {

  subscriptions: Array<vscode.Disposable>;
  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(private readonly refreshCodeLens: vscode.EventEmitter<void>, httpDocumentSelector: vscode.DocumentSelector) {
    this.onDidChangeCodeLenses = refreshCodeLens.event;
    this.subscriptions = [
      vscode.commands.registerCommand(commands.send, this.send, this),
      vscode.commands.registerCommand(commands.clearAll, this.clearAll, this),
      vscode.commands.registerCommand(commands.sendAll, this.sendAll, this),
      vscode.commands.registerCommand(commands.resend, this.resend, this),
      vscode.commands.registerCommand(commands.show, this.show, this),
			vscode.languages.registerCodeLensProvider(httpDocumentSelector, this),
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

    if (httpFile) {

      result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        command: commands.sendAll,
        title: 'send all'
      }));

      for (const httpRegion of httpFile.httpRegions) {
        const range = new vscode.Range(httpRegion.position.requestLine || httpRegion.position.start, 0, httpRegion.position.end, 0);
        const args = [document, httpRegion.position.requestLine || httpRegion.position.start];

        if (httpRegion.position.requestLine !== undefined) {
          result.push(new vscode.CodeLens(range, {
            command: commands.send,
            arguments: args,
            title: 'send'
          }));

        }

        if (httpRegion.response) {
          result.push(new vscode.CodeLens(range, {
            command: commands.show,
            arguments: args,
            title: 'show'
          }));
        }
      }
    }
    return Promise.resolve(result);
  }

  private currentRequest: CommandData | undefined;

  @errorHandler()
  async send(document?: vscode.TextDocument, line?: number) {
    this.currentRequest = await this.getCurrentHttpRegion(document, line);
    await this.sendRequest();
  }

  @errorHandler()
  async resend() {
    await this.sendRequest();
  }

  private async sendRequest() {

    if (this.currentRequest) {
      await httpYacApi.send(this.currentRequest.httpRegion, this.currentRequest.httpFile);
      if (this.refreshCodeLens) {
        this.refreshCodeLens.fire();
      }
      await httpYacApi.show(this.currentRequest.httpRegion, this.currentRequest.httpFile);
    }
  }
  @errorHandler()
  async sendAll() {
    const document  = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
      await httpYacApi.sendAll(httpFile);
      if (this.refreshCodeLens) {
        this.refreshCodeLens.fire();
      }
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
    const parsedDocument = await this.getCurrentHttpRegion(document, line);
    if (parsedDocument) {
      await httpYacApi.show(parsedDocument.httpRegion, parsedDocument.httpFile);
    }
  }

  private async getCurrentHttpRegion(doc: vscode.TextDocument | undefined, line: number | undefined) {
    const document = doc || vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
      if (httpFile) {
        const currentLine = line ?? vscode.window.activeTextEditor?.selection.active.line;
        if (currentLine !== undefined) {
          const httpRegion = httpFile.httpRegions.find(obj => obj.position.start <= currentLine && currentLine <= obj.position.end);
          if (httpRegion) {
            return { httpRegion, httpFile };
          }
        }
      }
    }
    return undefined;
  }

  toString() {
    return 'requestCommandsController';
  }
}