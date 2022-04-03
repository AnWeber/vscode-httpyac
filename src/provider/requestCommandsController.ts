import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { commands, getEnvironmentConfig, getConfigSetting } from '../config';
import { errorHandler } from './errorHandler';
import * as utils from '../utils';
import { StorageProvider } from '../io';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';
import { ResponseStore } from '../responseStore';
import { ResponseItem } from '../view';

export class RequestCommandsController extends DisposeProvider {
  constructor(
    private readonly documentStore: DocumentStore,
    private readonly responseStore: ResponseStore,
    private readonly storageProvider: StorageProvider
  ) {
    super();
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
    ];
  }

  private httpRegionSendContext: httpyac.HttpRegionSendContext | undefined;

  @errorHandler()
  private async send(document?: utils.DocumentArgument, line?: utils.LineArgument): Promise<void> {
    this.httpRegionSendContext = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    await this.sendRequest(this.httpRegionSendContext);
  }

  @errorHandler()
  private async sendRepeat(document?: utils.DocumentArgument, line?: utils.LineArgument): Promise<void> {
    this.httpRegionSendContext = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    const repeatOrder = await vscode.window.showQuickPick(
      [
        { label: 'parallel', value: httpyac.RepeatOrder.parallel },
        { label: 'sequential', value: httpyac.RepeatOrder.sequential },
      ],
      {
        ignoreFocusOut: true,
      }
    );
    const count = await vscode.window.showInputBox({
      placeHolder: 'repeat count',
      ignoreFocusOut: true,
    });

    if (repeatOrder && count && +count > 0 && this.httpRegionSendContext) {
      this.httpRegionSendContext.repeat = {
        count: +count,
        type: repeatOrder?.value,
      };
      await this.sendRequest(this.httpRegionSendContext);
    }
  }

  @errorHandler()
  private async resend(): Promise<void> {
    await this.sendRequest(this.httpRegionSendContext);
  }

  @errorHandler()
  private async sendAll(): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await this.documentStore.getHttpFile(document);
      if (httpFile) {
        await this.sendRequest({
          httpFile,
        });
      }
    }
  }

  @errorHandler()
  private async sendSelected(): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await this.documentStore.getHttpFile(document);

      if (httpFile) {
        const httpRegions = httpFile.httpRegions.filter(obj => !!obj.request);

        const pickedObjs = await vscode.window.showQuickPick(
          httpRegions.map(httpRegion => ({
            label: httpRegion.symbol.name,
            data: httpRegion,
          })),
          {
            placeHolder: 'select requests',
            canPickMany: true,
            ignoreFocusOut: true,
          }
        );

        if (pickedObjs) {
          await this.sendRequest({
            httpFile,
            httpRegionPredicate: httpRegion => pickedObjs.some(obj => obj.data === httpRegion),
          });
        }
      }
    }
  }

  private async sendRequest(context: httpyac.HttpRegionSendContext | httpyac.HttpFileSendContext | undefined) {
    if (context) {
      const config = getConfigSetting();
      await vscode.window.withProgress(
        {
          location:
            config.progressDefaultLocation === 'window'
              ? vscode.ProgressLocation.Window
              : vscode.ProgressLocation.Notification,
          cancellable: true,
          title: 'send',
        },
        async (progress, token) => {
          context.progress = {
            isCanceled: () => token.isCancellationRequested,
            register: (event: () => void) => {
              const dispose = token.onCancellationRequested(event);
              return () => dispose.dispose();
            },
            report: data => progress.report(data),
          };
          context.logStream = async (_type, response) => {
            if (config.addStreamingResponsesToHistory) {
              await this.responseStore.add(response, undefined, false);
            }
          };
          context.logResponse = async (response, httpRegion) => {
            context.progress?.report?.({
              message: 'show view',
            });
            await this.responseStore.add(response, httpRegion);
          };
          await this.documentStore.send(context);
        }
      );
    }
  }

  @errorHandler()
  private async show(document?: utils.DocumentArgument, line?: utils.LineArgument): Promise<void> {
    const context = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    if (context?.httpRegion) {
      const responseItem = this.responseStore.findResponseByHttpRegion(context.httpRegion);
      if (responseItem) {
        await this.responseStore.show(responseItem);
      }
    }
  }

  @errorHandler()
  private async showVariables(): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      const httpFile = await this.documentStore.getHttpFile(document);
      if (httpFile) {
        const variables = await httpyac.getVariables({
          httpFile,
          config: await getEnvironmentConfig(httpFile.fileName),
        });
        await this.openVariablesInEditor(variables);
      }
    }
  }

  private async openVariablesInEditor(variables: httpyac.Variables) {
    const uri = await this.storageProvider.writeFile(Buffer.from(JSON.stringify(variables, null, 2)), 'variables.json');
    if (uri) {
      await utils.showTextEditor(uri);
    }
  }

  @errorHandler()
  private async validateVariables(document?: utils.DocumentArgument, line?: utils.LineArgument): Promise<void> {
    const result = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    if (result) {
      const abortInterceptor = {
        afterLoop: async () => false,
      };
      const variables: Record<string, unknown> = {};
      try {
        result.httpFile.hooks.onRequest.addInterceptor(abortInterceptor);
        await this.sendRequest(result);
        variables.status = {
          message: 'variables are valid',
        };
      } catch (err) {
        variables.status = {
          message: 'variables are invalid',
          err,
        };
      } finally {
        if (httpyac.utils.isProcessorContext(result)) {
          Object.assign(variables, result.variables);
        }
        result.httpFile.hooks.onRequest.removeInterceptor(abortInterceptor);
        await this.openVariablesInEditor(variables);
      }
    }
  }

  @errorHandler()
  private async viewHeader(
    document: utils.DocumentArgument | ResponseItem | undefined,
    line: utils.LineArgument
  ): Promise<void> {
    if (document) {
      let responseItem: ResponseItem | undefined;
      if (document instanceof ResponseItem) {
        responseItem = document;
      } else {
        const context = await utils.getHttpRegionFromLine(document, line, this.documentStore);
        if (context) {
          responseItem = this.responseStore.findResponseByHttpRegion(context.httpRegion);
        }
      }
      if (responseItem) {
        if (responseItem?.response) {
          await responseItem.loadResponseBody?.();

          const content = httpyac.utils.toMarkdown(responseItem.response, {
            testResults: responseItem.testResults,
            meta: true,
            timings: true,
            responseBody: true,
            requestBody: true,
            prettyPrint: true,
          });
          const uri = await this.storageProvider.writeFile(Buffer.from(content), `${responseItem.name}.md`);
          if (uri) {
            await vscode.commands.executeCommand('vscode.openWith', uri, 'vscode.markdown.preview.editor');
          }
          await this.responseStore.shrink(responseItem);
        }
      }
    }
  }

  @errorHandler()
  private async save(document?: utils.DocumentArgument, line?: utils.LineArgument): Promise<void> {
    const context = await utils.getHttpRegionFromLine(document, line, this.documentStore);
    if (context?.httpRegion) {
      const responseItem = this.responseStore.findResponseByHttpRegion(context.httpRegion);
      if (responseItem?.response) {
        await responseItem.loadResponseBody?.();
        const ext = responseItem.extension;
        const filters: Record<string, Array<string>> = {};
        if (ext) {
          filters[ext] = [ext];
        }
        const uri = await vscode.window.showSaveDialog({
          filters,
        });
        if (uri && responseItem.response.rawBody) {
          await vscode.workspace.fs.writeFile(uri, new Uint8Array(responseItem.response.rawBody));
        }
        await this.responseStore.shrink(responseItem);
      }
    }
  }

  @errorHandler()
  private async newHttpFile(): Promise<void> {
    const language = 'http';
    const document = await vscode.workspace.openTextDocument({ language, content: '' });
    await vscode.window.showTextDocument(document);
  }
}
