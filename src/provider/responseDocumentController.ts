import * as httpyac from 'httpyac';

import * as vscode from 'vscode';
import { getConfigSetting, commands } from '../config';
import { TempPathFolder } from '../view/responseHandlerUtils';
import { DisposeProvider } from '../utils';
import { ResponseStore } from '../responseStore';


export class ResponseDocumentController
  extends DisposeProvider
  implements vscode.CodeLensProvider, vscode.HoverProvider {

  constructor(private readonly responseStore: ResponseStore) {
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
    ];
  }

  public provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const result: Array<vscode.CodeLens> = [];

    const cacheItem = this.responseStore.findResponseByDocument(document);
    if (cacheItem && cacheItem.response) {
      const response = cacheItem.response;
      const lenses = [`${response.protocol} ${response.statusCode}${response.statusMessage ? ` - ${response.statusMessage}` : ''}`];

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
    if (position.line === 0) {
      const responseItem = this.responseStore.findResponseByDocument(document);
      if (responseItem?.response) {
        const responseHover = httpyac.utils.toMarkdown(responseItem.response, {
          testResults: responseItem.httpRegion?.testResults,
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
}
