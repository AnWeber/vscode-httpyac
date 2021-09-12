import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { errorHandler } from './errorHandler';
import { DocumentArgument, getHttpRegionFromLine, LineArgument, DisposeProvider, sendContext } from '../utils';
import { default as HttpSnippet, availableTargets } from 'httpsnippet';

import { Request, Header, Param, QueryString } from './harRequest';
import { DocumentStore } from '../documentStore';
import { APP_NAME } from '../config';

const commands = {
  generateCode: `${APP_NAME}.generateCode`,
};

export class HarCommandsController extends DisposeProvider {

  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.subscriptions = [
      vscode.commands.registerCommand(commands.generateCode, this.generateCode, this),
    ];
  }

  @errorHandler()
  private async generateCode(document?: DocumentArgument, line?: LineArgument) {
    const context = await getHttpRegionFromLine(document, line, this.documentStore);
    if (context) {
      await this.generateCodeRequest(context);
    }
  }

  private async generateCodeRequest(context: httpyac.HttpRegionSendContext | httpyac.HttpFileSendContext) {
    const target = await this.pickHttpSnippetResult();
    if (target && context) {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        title: 'create har',
      }, async (progress, token) => {
        context.progress = {
          isCanceled: () => token.isCancellationRequested,
          register: (event: () => void) => {
            const dispose = token.onCancellationRequested(event);
            return () => dispose.dispose();
          },
          report: data => progress.report(data),
        };
        context.logResponse = async response => {
          if (response.request) {
            const harRequest: Request = this.getHarRequest(response.request);
            const snippet = new HttpSnippet(harRequest);
            const content = snippet.convert(target.target, target.client);
            const document = await vscode.workspace.openTextDocument({
              content
            });
            await vscode.window.showTextDocument(document);
          }
        };
        await sendContext(context);
      });
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
    return await vscode.window.showQuickPick(items);
  }


  getHarRequest(options: httpyac.HttpResponseRequest): Request {

    const initHeader: Header[] = [];

    const url: string = options.url ? `${options.url}` : '';
    const indexOfQuery = url.indexOf('?');

    const harRequest: Request = {
      method: options.method || 'GET',
      url,
      headers: options.headers && Object.entries(options.headers || {}).reduce((prev, current) => {
        const [name, value] = current;
        if (Array.isArray(value)) {
          prev.push(...value.map(val => ({
            name,
            value: val,
          })));
        } else {
          prev.push({
            name,
            value: `${value || ''}`
          });
        }
        return prev;
      }, initHeader) || []
    };

    if (indexOfQuery > 0) {
      harRequest.url = harRequest.url.slice(0, indexOfQuery);
      const initQueryString: QueryString[] = [];
      harRequest.queryString = url.slice(url.indexOf('?') + 1).split('&').reduce((prev, current) => {
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
          mimeType
        };
      } else {
        harRequest.postData = {
          text: options.body,
          mimeType
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
