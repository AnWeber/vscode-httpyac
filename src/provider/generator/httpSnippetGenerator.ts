import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { getConfigSetting } from '../../config';
import { default as HttpSnippet, availableTargets } from 'httpsnippet';

import { Request, Header, Param, QueryString } from './harRequest';
import { GenerationTarget } from './generationTarget';

export function getHttpSnippetTargets() {
  return availableTargets().reduce((prev, current) => {
    const clients = current.clients.map(client => ({
      label: `${current.title} - ${client.title}`,
      target: current.key,
      client: client.key,
      description: client.description,
      generate: async (context: httpyac.HttpRegionSendContext) =>
        await generateHttpSnippetCodeRequest(context, current.key, client.key),
    }));
    prev.push(...clients);
    return prev;
  }, [] as Array<GenerationTarget>);
}

async function generateHttpSnippetCodeRequest(
  context: httpyac.HttpRegionSendContext,
  targetKey: string,
  clientKey: string
) {
  let result: string | undefined;
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

      const interceptor = {
        async afterLoop(ctx: { args: [httpyac.Request<string>, httpyac.ProcessorContext] }) {
          const harRequest: Request = getHarRequest(ctx.args[0]);
          const snippet = new HttpSnippet(harRequest);
          result = snippet.convert(targetKey, clientKey);
          return false;
        },
      };
      context.httpRegion.hooks.onRequest.addInterceptor(interceptor);
      try {
        await httpyac.send(context);
      } finally {
        context.httpRegion.hooks.onRequest.removeInterceptor(interceptor);
      }
    }
  );
  return result;
}

function getHarRequest(options: httpyac.Request): Request {
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
