import * as httpyac from 'httpyac';

import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { commands } from '../provider/requestCommandsController';
import { saveFileResponseHandler } from './saveFileResponseHandler';
import { openWithResponseHandler } from './openWithResponseHandler';
import { previewDocumentResponseHandler } from './previewDocumentResponseHandler';
import { reuseDocumentResponseHandler } from './reuseDocumentResponseHandler';
import { openDocumentResponseHandler } from './openDocumentResponseHandler';
import { ResponseHandler } from '../extensionApi';
import { TempPathFolder } from './responseHandlerUtils';
import { DisposeProvider, initContext } from '../utils';
import { getOutputChannel } from '../io';
import { getResourceConfig } from '../config';

export const responseHandlers: Array<ResponseHandler> = [
  saveFileResponseHandler,
  openWithResponseHandler,
  previewDocumentResponseHandler,
  reuseDocumentResponseHandler,
  openDocumentResponseHandler,
];

interface OutputCacheItem{
  document: vscode.TextDocument;
  response: httpyac.HttpResponse;
  httpRegion?: httpyac.HttpRegion;
  prettyPrintNeeded: boolean;
  deleteFile: boolean;
}

export class ResponseOutputProcessor extends DisposeProvider implements vscode.CodeLensProvider, vscode.HoverProvider {
  private outputCache: Array<OutputCacheItem> = [];
  constructor() {
    super();

    const documentFilter = [{
      scheme: 'untitled',
    }, {
      scheme: 'file',
      pattern: `**/${TempPathFolder}/**`
    }];

    this.subscriptions = [
      vscode.languages.registerHoverProvider(documentFilter, this),
      vscode.languages.registerCodeLensProvider(documentFilter, this),
      vscode.workspace.onDidCloseTextDocument(document => {
        this.remove(document);
      }),
      vscode.window.onDidChangeActiveTextEditor(async editor => {
        if (editor) {
          const cacheItem = this.outputCache.find(obj => obj.prettyPrintNeeded && obj.document === editor.document);
          if (cacheItem) {
            await this.prettyPrint(editor);
            cacheItem.prettyPrintNeeded = false;
          }
        }
      }),
    ];
  }

  public provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const result: Array<vscode.CodeLens> = [];

    const cacheItem = this.outputCache.find(obj => obj.document === document);
    if (cacheItem && cacheItem.response) {
      const response = cacheItem.response;
      const lenses = [`HTTP${response.httpVersion} ${response.statusCode} - ${response.statusMessage}`];

      if (cacheItem.httpRegion?.testResults) {
        lenses.push(`TestResults ${cacheItem.httpRegion.testResults.filter(obj => obj.result).length}/${cacheItem.httpRegion.testResults.length}`);
      }
      const headers = getConfigSetting().responseViewHeader;
      if (headers) {
        lenses.push(...headers.map(headerName => {
          const timingsProperty = 'timings.';
          if (headerName.startsWith(timingsProperty) && response.timings) {
            const prop = headerName.slice(timingsProperty.length);
            const timings = response.timings as Record<string, number>;
            return `${prop}: ${timings[prop] || 0}ms`;
          }
          const metaProperty = 'meta.';
          if (headerName.startsWith(metaProperty) && response.meta) {
            const prop = headerName.slice(metaProperty.length);
            if (response.meta[prop]) {
              return `${prop}: ${response.meta[prop]}`;
            }
          }
          const testsProperty = 'tests.';
          if (headerName.startsWith(testsProperty) && cacheItem.httpRegion?.testResults) {
            const prop = headerName.slice(metaProperty.length);
            const testResults = cacheItem.httpRegion.testResults;
            if (prop === 'failed') {
              return `${prop}: ${testResults.filter(obj => !obj.result).length}`;
            }
            if (prop === 'success') {
              return `${prop}: ${testResults.filter(obj => obj.result).length}`;
            }
            if (prop === 'total') {
              return `${prop}: ${testResults.length}`;
            }
          }
          const val = httpyac.utils.getHeader(response.headers, headerName);
          if (val) {
            return `${headerName}: ${val}`;
          }
          return '';
        }).filter(obj => obj.length > 0));
      }
      result.push(
        ...lenses.map(title => new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          arguments: [cacheItem.httpRegion],
          title,
          command: commands.viewHeader
        }))
      );
    }

    return Promise.resolve(result);
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
    if (this.outputCache.length > 0 && position.line === 0) {
      const cacheItem = this.outputCache.find(obj => obj.document === document);
      if (cacheItem?.httpRegion?.response) {
        const responseHover = httpyac.utils.toMarkdown(cacheItem.httpRegion.response, {
          testResults: cacheItem.httpRegion.testResults,
          responseBody: false,
          requestBody: false,
          timings: true,
          meta: true,
        });
        return new vscode.Hover(new vscode.MarkdownString(responseHover), document.getWordRangeAtPosition(new vscode.Position(0, 0), /[^-\s]/u) || new vscode.Range(0, 0, 0, 100));
      }
    }
    return undefined;
  }


  public async sendContext(context: httpyac.HttpRegionSendContext | httpyac.HttpFileSendContext | undefined): Promise<boolean> {

    if (context) {
      initContext(context);

      const resourceConfig = getResourceConfig(context.httpFile);
      const logToOutput = httpyac.utils.requestLoggerFactory((arg: string) => {
        const requestChannel = getOutputChannel('Request');
        requestChannel.appendLine(arg);
      }, {
        requestOutput: true,
        requestHeaders: true,
        requestBodyLength: 0,
        responseHeaders: true,
        responseBodyLength: resourceConfig.logResponseBodyLength,
      });

      context.logResponse = (response, httpRegion) => {
        this.show(response, httpRegion);
        if (resourceConfig.logRequest) {
          logToOutput?.(response, httpRegion);
        }
      };
      return await httpyac.send(context);
    }
    return false;
  }


  public async show(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion): Promise<void> {
    for (const responseHandler of responseHandlers) {
      const result = await responseHandler(response, httpRegion);
      if (result) {
        if (result !== true) {
          const prettyPrintNeeded = await this.prettyPrint(result.editor);

          const cacheItem = this.outputCache.find(obj => obj.document === result.document);
          if (cacheItem) {
            cacheItem.response = response;
            cacheItem.prettyPrintNeeded = prettyPrintNeeded;
          } else {
            this.outputCache.push({
              document: result.document,
              response,
              prettyPrintNeeded,
              deleteFile: !!result.deleteFile
            });
          }
        }
        return;
      }
    }
  }

  private async prettyPrint(editor: vscode.TextEditor) {
    let result = false;
    if (getConfigSetting().responseViewPrettyPrint) {
      if (editor === vscode.window.activeTextEditor) {
        const prettyPrint = await vscode.commands.executeCommand<boolean>('editor.action.formatDocument', editor);
        if (prettyPrint === undefined) {
          result = true;
        } else {
          result = prettyPrint;
        }
      } else {
        result = true;
      }
    }
    editor.revealRange(new vscode.Range(0, 0, editor.document.lineCount, 0), vscode.TextEditorRevealType.AtTop);
    return result;
  }

  private async remove(document: vscode.TextDocument): Promise<void> {
    const index = this.outputCache.findIndex(obj => obj.document === document);
    if (index >= 0) {
      const cacheItem = this.outputCache[index];
      if (cacheItem.deleteFile) {
        try {
          await vscode.workspace.fs.delete(cacheItem.document.uri);
        } catch (err) {
          httpyac.io.log.error(err);
        }
      }
      this.outputCache.splice(index, 1);
    }
  }
}
