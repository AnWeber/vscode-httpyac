import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { commands, getEnvironmentConfig } from '../config';
import { errorHandler } from './errorHandler';
import { extension } from 'mime-types';
import { file } from 'tmp-promise';
import * as utils from '../utils';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';
import { openJsonInTextEditor } from '../view/responseHandlerUtils';
import { ResponseStore } from '../responseStore';


export class RequestCommandsController extends DisposeProvider {

  private tmpFiles: Array<vscode.Uri> = [];

  onDidChangeCodeLenses: vscode.Event<void>;

  constructor(
    private readonly documentStore: DocumentStore,
    private readonly responseStore: ResponseStore,
  ) {
    super();
    this.onDidChangeCodeLenses = documentStore.documentStoreChanged;
    this.subscriptions = [
      vscode.commands.registerCommand(commands.send, this.send, this),
      vscode.commands.registerCommand(commands.sendRepeat, this.sendRepeat, this),
      vscode.commands.registerCommand(commands.sendAll, this.sendAll, this),
      vscode.commands.registerCommand(commands.sendSelected, this.sendSelected, this),
      vscode.commands.registerCommand(commands.resend, this.resend, this),
      vscode.commands.registerCommand(commands.show, this.show, this),
      vscode.commands.registerCommand(commands.showVariables, this.showVariables, this),
      vscode.commands.registerCommand(commands.validateVariables, this.validateVariables, this),
      vscode.commands.registerCommand(commands.save, this.save, this),
      vscode.commands.registerCommand(commands.viewHeader, this.viewHeader, this),
      vscode.commands.registerCommand(commands.new, this.newHttpFile, this),
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
    ], {
      ignoreFocusOut: true,
    });
    const count = await vscode.window.showInputBox({
      placeHolder: 'repeat count',
      ignoreFocusOut: true
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
        ignoreFocusOut: true
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
        context.logResponse = async (response, httpRegion) => {
          await this.responseStore.add(response, httpRegion);
        };
        await this.documentStore.send(context);
      });
    }
  }


  @errorHandler()
  private async show(document?: utils.DocumentArgument, line?: utils.LineArgument) : Promise<void> {
    const context = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    if (context?.httpRegion?.response) {
      const responseItem = this.responseStore.responseCache.find(obj => obj.response === context.httpRegion.response);
      if (responseItem) {
        await this.responseStore.show(responseItem);
      }
    }
  }

  @errorHandler()
  private async showVariables() : Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await this.documentStore.getHttpFile(document);
      if (httpFile) {
        await this.openVariablesInEditor(httpFile);
      }
    }
  }

  private async openVariablesInEditor(httpFile: httpyac.HttpFile, status?: unknown) {
    let variables = await httpyac.getVariables({
      httpFile,
      config: await getEnvironmentConfig(httpFile.fileName)
    });
    if (status) {
      variables = {
        '_status': status,
        ...variables
      };
    }
    openJsonInTextEditor('variables', JSON.stringify(variables, null, 2));
  }

  @errorHandler()
  private async validateVariables(document?: utils.DocumentArgument, line?: utils.LineArgument) : Promise<void> {
    const result = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    if (result) {
      let status: unknown;
      const abortInterceptor = {
        afterLoop: async () => false
      };
      try {
        result.httpFile.hooks.onRequest.addInterceptor(abortInterceptor);
        await this.sendRequest(result);
        status = {
          message: 'variables are valid',
        };
      } catch (err) {
        status = {
          message: 'variables are invalid',
          err
        };
      } finally {
        result.httpFile.hooks.onRequest.removeInterceptor(abortInterceptor);
        await this.openVariablesInEditor(result.httpFile, status);
      }
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
