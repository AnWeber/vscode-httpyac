import { httpYacApi, HttpRegion, HttpFile, HttpRequest, HttpResponse, ContentType, utils } from 'httpyac';

import * as vscode from 'vscode';
import { getConfigSetting } from '../config';
import { file } from 'tmp-promise';
import { extension } from 'mime-types';
import { promises as fs } from 'fs';
import { commands } from '../provider/requestCommandsController';


interface OutputCacheItem{
  document: vscode.TextDocument;
  httpRegion: HttpRegion;
}

export class ResponseOutputProcessor implements vscode.CodeLensProvider, vscode.HoverProvider {

  private outputCache: Array<OutputCacheItem> = [];
  private subscriptions: Array<vscode.Disposable> = [];

  constructor() {
    httpYacApi.httpOutputProcessors.push(this.show.bind(this));

    this.subscriptions = [
			vscode.languages.registerHoverProvider({ scheme: 'untitled' }, this),
      vscode.languages.registerCodeLensProvider({ scheme: 'untitled' }, this),
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.remove(document);
      }),
    ];
  }
  dispose() {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose);
      this.subscriptions = [];
    }
  }

  public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    const result: Array<vscode.CodeLens> = [];

    const cacheItem = this.outputCache.find(obj => obj.document === document);
    if (cacheItem && cacheItem.httpRegion.response) {
      const response = cacheItem.httpRegion.response;

      const title = [`HTTP${response.httpVersion} ${response.statusCode} - ${response.statusMessage}`];
      const headers = getConfigSetting<Array<string>>('responseViewHeader');
      if (headers) {
        title.push(...headers.map(headerName => {
          const val = utils.getHeader(response.headers, headerName);
          if (val) {
            return `${headerName}: ${val}`;
          }
          return '';
        }).filter(obj => obj.length > 0));
      }
      result.push(
        new vscode.CodeLens(
          new vscode.Range(0, 0, 0, 0), {
          arguments: [cacheItem.httpRegion],
          title: title.join(' | '),
            command: commands.openHeaders
        }));
    }

    return Promise.resolve(result);
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    if (position.line === 0) {
      const cacheItem = this.outputCache.find(obj => obj.document === document);
      if (cacheItem) {

        const responseHover = utils.toMarkdown(cacheItem.httpRegion);
        return new vscode.Hover(new vscode.MarkdownString(responseHover), document.getWordRangeAtPosition(new vscode.Position(0, 0), /[^-\s]/) || new vscode.Range(0, 0, 0, 100));
      }
    }
    return undefined;
  }

  public async show(httpRegion: HttpRegion, httpFile: HttpFile): Promise<void> {
    if (httpRegion.request && httpRegion.response) {

      if (httpRegion.metaParams?.save) {
        const ext = extension(httpRegion.response.contentType?.contentType || 'application/octet-stream');
        const filters: Record<string, Array<string>> = {};
        if (ext) {
          filters[ext] = [ext];
        }
        const uri = await vscode.window.showSaveDialog({
          filters
        });
        if (uri) {
          await fs.writeFile(uri.fsPath, new Uint8Array(httpRegion.response.rawBody));
          if (httpRegion.metaParams?.openWith) {
            await vscode.commands.executeCommand('vscode.openWith', uri, httpRegion.metaParams?.openWith);
          }
        }
      }else if (httpRegion.metaParams?.openWith) {
        const { path } = await file({ postfix: `.${extension(httpRegion.response.contentType?.contentType || 'application/octet-stream')}` });
        await fs.writeFile(path, new Uint8Array(httpRegion.response.rawBody));
        await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(path), httpRegion.metaParams?.openWith);
      } else {
        await this.showTextDocument(httpRegion);
      }
    }
  }


  private async showTextDocument(httpRegion: HttpRegion) {
    const response = httpRegion.response;
    if (response) {
      let content: string;
      if (utils.isString(response.body)) {
        content = response.body;
      } else {
        content = JSON.stringify(response.body, null, 2);
      }
      const language = this.getLanguageId(response.contentType);

      const document = await vscode.workspace.openTextDocument({ language, content });
      this.outputCache.push({
        document,
        httpRegion
      });
      let viewColumn = vscode.ViewColumn.Beside;
      if (getConfigSetting<string>('responseViewColumn') === 'current') {
        viewColumn = vscode.ViewColumn.Active;
      }
      const editor = await vscode.window.showTextDocument(document, {
        viewColumn,
        preserveFocus: getConfigSetting<boolean>('responseViewPreserveFocus'),
        preview: getConfigSetting<boolean>('responseViewPreview'),
      });

      if (getConfigSetting<boolean>('responseViewPrettyPrint')) {
        await vscode.commands.executeCommand('editor.action.formatDocument', editor);
      }
    }
  }

  remove(document: vscode.TextDocument) {
    const index = this.outputCache.findIndex(obj => obj.document === document);
    if (index >= 0) {
      this.outputCache.splice(index, 1);
    }
  }

  private getLanguageId(contentType: ContentType | undefined) {
    if (contentType) {
      if (utils.isMimeTypeJSON(contentType)) {
        return 'json';
      } else if (utils.isMimeTypeJavascript(contentType)) {
        return 'javascript';
      } else if (utils.isMimeTypeXml(contentType)) {
        return 'xml';
      } else if (utils.isMimeTypeHtml(contentType)) {
        return 'html';
      } else if (utils.isMimeTypeCSS(contentType)) {
        return 'css';
      } else if (utils.isMimeTypeMarkdown(contentType)) {
        return 'markdown';
      }
    }
    return 'text';
  }
}




