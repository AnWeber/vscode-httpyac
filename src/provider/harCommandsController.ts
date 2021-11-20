import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { commands, getConfigSetting } from '../config';
import { errorHandler } from './errorHandler';
import { DocumentArgument, getHttpRegionFromLine, LineArgument, DisposeProvider } from '../utils';
import { default as HttpSnippet, availableTargets } from 'httpsnippet';

import { Request, Header, Param, QueryString } from './harRequest';
import { DocumentStore } from '../documentStore';

export class HarCommandsController extends DisposeProvider {
  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.subscriptions = [
      vscode.commands.registerCommand(commands.generateCode, this.generateCode, this),
      vscode.commands.registerCommand(commands.generateCodeSelectLanguage, this.generateCodeSelectLanguage, this),
    ];
  }

  @errorHandler()
  private async generateCode(document?: DocumentArgument, line?: LineArgument) {
    const context = await getHttpRegionFromLine(document, line, this.documentStore);
    if (context) {
      const config = getConfigSetting();
      if (config.generateCodeDefaultLanguage) {
        await this.generateCodeRequest(context, config.generateCodeDefaultLanguage);
      } else {
        this.generateCodeSelectLanguage(document, line);
      }
    }
  }
  @errorHandler()
  private async generateCodeSelectLanguage(document?: DocumentArgument, line?: LineArgument) {
    const context = await getHttpRegionFromLine(document, line, this.documentStore);
    if (context) {
      const codeTarget = await this.pickHttpSnippetResult();
      if (codeTarget) {
        await this.generateCodeRequest(context, codeTarget);
      }
    }
  }

  private async generateCodeRequest(
    context: httpyac.HttpRegionSendContext | httpyac.HttpFileSendContext,
    codeTarget: { target: string; client: string }
  ) {
    if (context) {
      const config = getConfigSetting();
      await vscode.window.withProgress(
        {
          location:
            config.progressDefaultLocation === 'window'
              ? vscode.ProgressLocation.Window
              : vscode.ProgressLocation.Notification,
          cancellable: true,
          title: 'create har',
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
          const hookId = 'code_generation';
          context.httpFile.hooks.onRequest.addHook(hookId, async request => {
            const harRequest: Request = this.getHarRequest(request);
            const snippet = new HttpSnippet(harRequest);
            const content = snippet.convert(codeTarget.target, codeTarget.client);
            if (config.generateCodeTargetOutput === 'clipboard') {
              await vscode.env.clipboard.writeText(content);
            } else {
              const document = await vscode.workspace.openTextDocument({
                content,
              });
              await vscode.window.showTextDocument(document);
            }
            if (httpyac.utils.isHttpRegionSendContext(context)) {
              return httpyac.HookCancel;
            }
            return request;
          });
          try {
            await this.documentStore.send(context);
          } finally {
            context.httpFile.hooks.onRequest.removeHook(hookId);
          }
        }
      );
    }
  }

  private async pickHttpSnippetResult() {
    const init: Array<GenerationTarget> = [];
    const items = availableTargets().reduce((prev, current) => {
      const clients = current.clients.map(client => ({
        label: `${current.title} - ${client.title}`,
        target: current.key,
        client: client.key,
        description: client.description,
      }));
      prev.push(...clients);
      return prev;
    }, init);
    return await vscode.window.showQuickPick(items, { ignoreFocusOut: true });
  }

  getHarRequest(options: httpyac.Request): Request {
    const initHeader: Header[] = [];

    const url: string = options.url ? `${options.url}` : '';
    const indexOfQuery = url.indexOf('?');

    const harRequest: Request = {
      method: options.method || 'GET',
      url,
      headers:
        (options.headers &&
          Object.entries(options.headers || {}).reduce((prev, current) => {
            const [name, value] = current;
            if (Array.isArray(value)) {
              prev.push(
                ...value.map(val => ({
                  name,
                  value: val,
                }))
              );
            } else {
              prev.push({
                name,
                value: `${value || ''}`,
              });
            }
            return prev;
          }, initHeader)) ||
        [],
    };

    if (indexOfQuery > 0) {
      harRequest.url = harRequest.url.slice(0, indexOfQuery);
      const initQueryString: QueryString[] = [];
      harRequest.queryString = url
        .slice(url.indexOf('?') + 1)
        .split('&')
        .reduce((prev, current) => {
          const [name, value] = current.split('=');
          prev.push({ name, value });
          return prev;
        }, initQueryString);
    }

    if (httpyac.utils.isString(options.body)) {
      let mimeType = 'application/json';
      const header = httpyac.utils.getHeader(options.headers || {}, 'content-type');
      if (httpyac.utils.isString(header)) {
        mimeType = header;
      }
      if (mimeType === 'application/x-www-form-urlencoded') {
        const initParams: Param[] = [];
        harRequest.postData = {
          params: options.body.split('&').reduce((prev, current) => {
            const [name, value] = current.split('=');
            prev.push({ name, value });
            return prev;
          }, initParams),
          mimeType,
        };
      } else {
        harRequest.postData = {
          text: options.body,
          mimeType,
        };
      }
    }
    return harRequest;
  }
}

interface GenerationTarget {
  label: string;
  target: string;
  client: string;
  description: string;
}
