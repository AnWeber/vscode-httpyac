import { getConfigSetting, commands } from '../config';
import { ResponseStore } from '../responseStore';
import { DisposeProvider } from '../utils';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export class ResponseDocumentController
  extends DisposeProvider
  implements vscode.CodeLensProvider, vscode.HoverProvider
{
  constructor(private readonly responseStore: ResponseStore) {
    super();

    const documentFilter = [
      {
        scheme: 'file',
        pattern: '**/_httpyac_/**',
      },
    ];

    this.subscriptions = [
      vscode.languages.registerHoverProvider(documentFilter, this),
      vscode.languages.registerCodeLensProvider(documentFilter, this),
    ];
  }

  public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const result: Array<vscode.CodeLens> = [];

    const cacheItem = this.responseStore.findResponseByDocument(document);
    if (cacheItem?.response) {
      const response = await cacheItem.response;
      const lenses = [
        `${response.protocol} ${response.statusCode}${response.statusMessage ? ` - ${response.statusMessage}` : ''}`,
      ];

      if (cacheItem?.testResults) {
        lenses.push(
          `TestResults ${cacheItem.testResults.filter(obj => obj.result).length}/${cacheItem.testResults.length}`
        );
      }
      const headers = getConfigSetting().responseViewHeader;
      if (headers) {
        lenses.push(
          ...headers
            .map(headerName => {
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
              if (headerName.startsWith(testsProperty) && cacheItem?.testResults) {
                const prop = headerName.slice(metaProperty.length);
                const testResults = cacheItem.testResults;
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
            })
            .filter(obj => obj.length > 0)
        );
      } else {
        httpyac.io.log.error(`document for ${document.uri?.toString()} not found in cache`);
      }
      result.push(
        ...lenses.map(
          title =>
            new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
              arguments: [cacheItem],
              title,
              command: commands.viewHeader,
            })
        )
      );
    }

    return result;
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
    if (position.line === 0) {
      const responseItem = this.responseStore.findResponseByDocument(document);
      if (responseItem?.response) {
        const responseHover = httpyac.utils.toMarkdown(responseItem.response, {
          testResults: responseItem?.testResults,
          responseBody: false,
          requestBody: false,
          timings: true,
          meta: true,
        });
        return new vscode.Hover(
          new vscode.MarkdownString(responseHover),
          document.getWordRangeAtPosition(new vscode.Position(0, 0), /[^-\s]/u) || new vscode.Range(0, 0, 0, 100)
        );
      }
    }
    return undefined;
  }
}
