import { HttpRegion, utils, log } from 'httpyac';

import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { commands } from '../provider/requestCommandsController';
import { saveFileResponseHandler } from './saveFileResponseHandler';
import { openWithResponseHandler } from './openWithResponseHandler';
import { previewDocumentResponseHandler } from './previewDocumentResponseHandler';
import { reuseDocumentResponseHandler } from './reuseDocumentResponseHandler';
import { openDocumentResponseHandler } from './openDocumentResponseHandler';
import { ResponseHandler } from './responseHandler';
import { TempPathFolder } from './responseHandlerUtils';

export const responseHandlers: Array<ResponseHandler> = [
  saveFileResponseHandler,
  openWithResponseHandler,
  previewDocumentResponseHandler,
  reuseDocumentResponseHandler,
  openDocumentResponseHandler,
];

interface OutputCacheItem{
  document: vscode.TextDocument;
  httpRegion: HttpRegion;
  prettyPrintNeeded: boolean;
  deleteFile: boolean;
}

export class ResponseOutputProcessor implements vscode.CodeLensProvider, vscode.HoverProvider {
  private outputCache: Array<OutputCacheItem> = [];
  private subscriptions: Array<vscode.Disposable> = [];

  constructor() {

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
  dispose() : void {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose);
      this.subscriptions = [];
    }
  }

  public provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const result: Array<vscode.CodeLens> = [];

    const cacheItem = this.outputCache.find(obj => obj.document === document);
    if (cacheItem && cacheItem.httpRegion.response) {
      const response = cacheItem.httpRegion.response;
      const lenses = [`HTTP${response.httpVersion} ${response.statusCode} - ${response.statusMessage}`];

      if (cacheItem.httpRegion.testResults) {
        lenses.push(`TestResults ${cacheItem.httpRegion.testResults.filter(obj => obj.result).length}/${cacheItem.httpRegion.testResults.length}`);
      }
      const headers = getConfigSetting().responseViewHeader;
      if (headers) {
        lenses.push(...headers.map(headerName => {
          const val = utils.getHeader(response.headers, headerName);
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
        const responseHover = utils.toMarkdown(cacheItem.httpRegion.response, {
          testResults: cacheItem.httpRegion.testResults,
          responseBody: false,
          requestBody: false,
        });
        return new vscode.Hover(new vscode.MarkdownString(responseHover), document.getWordRangeAtPosition(new vscode.Position(0, 0), /[^-\s]/u) || new vscode.Range(0, 0, 0, 100));
      }
    }
    return undefined;
  }

  public async show(httpRegion: HttpRegion): Promise<void> {
    if (httpRegion.request && httpRegion.response?.body) {
      const visibleDocuments = this.outputCache.map(obj => obj.document);
      for (const responseHandler of responseHandlers) {
        const result = await responseHandler(httpRegion, visibleDocuments);
        if (result) {


          if (result !== true) {
            const prettyPrintNeeded = await this.prettyPrint(result.editor);

            const cacheItem = this.outputCache.find(obj => obj.document === result.document);
            if (cacheItem) {
              cacheItem.httpRegion = httpRegion;
              cacheItem.prettyPrintNeeded = prettyPrintNeeded;
            } else {
              this.outputCache.push({
                document: result.document,
                httpRegion,
                prettyPrintNeeded,
                deleteFile: !!result.deleteFile
              });
            }
          }
          return;
        }
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
          log.error(err);
        }
      }
      this.outputCache.splice(index, 1);
    }
  }
}
