import * as vscode from 'vscode';
import { Progress as httpProgress, httpYacApi, HttpRegionSendContext, HttpFileSendContext, utils, HttpClientOptions, HttpResponse } from 'httpyac';
import { APP_NAME } from '../config';
import { errorHandler } from './errorHandler';
import { getHttpRegionFromLine } from '../utils';
import { default as HttpSnippet, availableTargets } from 'httpsnippet';

const commands = {
  generateCode: `${APP_NAME}.generateCode`,
};

export class HarCommandsController {


  subscriptions: Array<vscode.Disposable>;

  constructor() {
    this.subscriptions = [
      vscode.commands.registerCommand(commands.generateCode, this.generateCode, this),
    ];
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

  @errorHandler()
  async generateCode(document?: vscode.TextDocument, line?: number) {
    const httpRegionSendContext = await getHttpRegionFromLine(document, line);
    await this.generateCodeRequest(httpRegionSendContext);
  }

  private async generateCodeRequest(context: HttpRegionSendContext | HttpFileSendContext | undefined) {
    const target = await  this.pickHttpSnippetResult();
    if (target && context) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: "create har",
      }, async (progress, token) => {
          context.progress = {
            isCanceled: () => token.isCancellationRequested,
            register: (event: () => void) => {
              const dispose = token.onCancellationRequested(event);
              return () => dispose.dispose();
            },
            report: (data) => progress.report(data),
          };

          const httpClient = context.httpClient;

          context.httpClient = async (options: HttpClientOptions, progress: httpProgress | undefined, showProgressBar: boolean): Promise<HttpResponse | false> => {
            if (showProgressBar) {
              const harRequest: any = this.getHarRequest(options);
              const snippet = new HttpSnippet(harRequest);
              const content = snippet.convert(target.target, target.client);
              const document = await vscode.workspace.openTextDocument({
                content
              });
              await vscode.window.showTextDocument(document);
              return false;
            }
            return await httpClient(options, progress, showProgressBar);
          };
          await httpYacApi.send(context);
      });
    }

  }

  private async pickHttpSnippetResult() {
    const init: Array<GenerationTarget> = [];
    const items = availableTargets().reduce((prev, current) => {
      const clients = current.clients.map(client => {
        return {
          label: `${current.title} - ${client.title}`,
          target: current.key,
          client: client.key,
          description: client.description,
        };
      });
      prev.push(...clients);
      return prev;
    }, init);
    return await vscode.window.showQuickPick(items);
  }



  getHarRequest(options: HttpClientOptions) {
    const harRequest: any = {
      method: options.method,
      url: options.url,
      headers: Object.entries(options.headers).map(([name, value]) => {
        return {
          name,
          value
        };
      }),
    };

    const indexOfQuery = options.url.indexOf('?');
    if (indexOfQuery > 0) {
      harRequest.url = options.url.substring(0, indexOfQuery);
      harRequest.queryString = options.url.substring(indexOfQuery + 1).split('&').reduce((prev, current) => {
        const [key, value] = current.split('=');
        prev.push({ key, value });
        return prev;
      }, [] as Array<{ key: string, value: string }>);
    }

    if (options.body) {
      harRequest.postData = {
        text: options.body,
        mimeType: utils.getHeader(options.headers, 'content-type') || 'application/json'
      };

      if (utils.isMimeTypeFormUrlEncoded(harRequest.postData.mimeType) && utils.isString(options.body)) {
        harRequest.postData.params = options.body.split('&').reduce((prev, current) => {
          const [key, value] = current.split('=');
          prev.push({ key, value });
          return prev;
        }, [] as Array<{ key: string, value: string }>);
      }
    }
    return harRequest;
  }

  toString() {
    return 'harCommandsController';
  }
}

interface GenerationTarget{
  label: string;
  target: string;
  client: string;
  description: string;
}