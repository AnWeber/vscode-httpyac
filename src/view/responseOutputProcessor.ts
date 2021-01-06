import { httpYacApi, HttpRegion, HttpFile, HttpRequest, HttpResponse, ContentType, utils } from 'httpyac';

import * as vscode from 'vscode';
import { EOL } from 'os';
import { APP_NAME, getConfigSetting } from '../config';

const commands = {
  openHeaders: `${APP_NAME}.openHeader`
};

interface OutputCacheItem{
  document: vscode.TextDocument;
  request: HttpRequest;
  response: HttpResponse;
}

export class ResponseOutputProcessor implements vscode.CodeLensProvider, vscode.HoverProvider {


  private outputCache: Array<OutputCacheItem> = [];
  private subscriptions: Array<vscode.Disposable> = [];

  constructor() {
    httpYacApi.httpOutputProcessors.push(this.show.bind(this));

    this.subscriptions = [
			vscode.languages.registerHoverProvider({ scheme: 'untitled' }, this),
      vscode.languages.registerCodeLensProvider({ scheme: 'untitled' }, this),
      vscode.commands.registerCommand(commands.openHeaders, this.openHeaders, this),
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
    if (cacheItem) {

      const title = [`HTTP${cacheItem.response.httpVersion} ${cacheItem.response.statusCode} - ${cacheItem.response.statusMessage}`];
      const headers = getConfigSetting<Array<string>>('responseViewHeader');
      if (headers) {
        title.push(...headers.map(headerName => {
          const val = utils.getHeader(cacheItem.response.headers, headerName);
          if (val) {
            return `${headerName}: ${val}`;
          }
          return '';
        }).filter(obj => obj.length > 0));
      }
      result.push(
        new vscode.CodeLens(
          new vscode.Range(0, 0, 0, 0), {
          arguments: [cacheItem],
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
        if (cacheItem.response?.headers) {

          const responseHover = this.toMarkdown(cacheItem);
          return new vscode.Hover(new vscode.MarkdownString(responseHover), document.getWordRangeAtPosition(new vscode.Position(0,0),/[^-\s]/) || new vscode.Range(0,0,0,100));
        }
      }
    }
    return undefined;
  }

  private toMarkdown(cacheItem: OutputCacheItem) {
    return `${utils.responseToString(cacheItem.response)}

---
### timings
${utils.timingsToString(cacheItem.response.timings)}

---
### request
${utils.requestToString(cacheItem.request)}
          `.split(EOL).join(`  ${EOL}`);
  }

  public async show(httpRegion: HttpRegion, httpFile: HttpFile): Promise<void> {
    if (httpRegion.request && httpRegion.response) {
      await this.showResponse(httpRegion.request,httpRegion.response);
    }
  }

  async openHeaders(cacheItem: OutputCacheItem) {
    if (cacheItem) {
      const content = this.toMarkdown(cacheItem);
      const document = await vscode.workspace.openTextDocument({ language: 'markdown', content });
      await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: getConfigSetting<boolean>('responseViewPreserveFocus'),
        preview: getConfigSetting<boolean>('responseViewPreview'),
      });
    }
  }

  private async showResponse(request: HttpRequest, response: HttpResponse) {
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
      request,
      response
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
      }
    }
    return 'text';
  }
}




