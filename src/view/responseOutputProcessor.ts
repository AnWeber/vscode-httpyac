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
  prettyPrintNeeded: boolean;
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
      vscode.window.onDidChangeActiveTextEditor(async (editor) => {
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
            command: commands.viewHeader
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


      const openWith = this.getOpenWith(httpRegion);
      if (httpRegion.metaData.save) {

        const filters: Record<string, Array<string>> = {
          'All Files': ['*']  // eslint-disable-line @typescript-eslint/naming-convention
        };
        const ext = httpRegion.metaData.extension || extension(httpRegion.response.contentType?.contentType || 'application/octet-stream');
        if (ext) {
          filters[ext] = [ext];
        }
        const uri = await vscode.window.showSaveDialog({
          filters
        });
        await this.saveAndOpenWith(uri, httpRegion.response.rawBody, openWith);
      }else if (openWith) {
        const { path } = await file({ postfix: `.${httpRegion.metaData.extension || extension(httpRegion.response.contentType?.contentType || 'application/octet-stream')}` });
        await this.saveAndOpenWith(vscode.Uri.file(path), httpRegion.response.rawBody, openWith);
      } else {
        await this.showTextDocument(httpRegion);
      }
    }
  }

  private getOpenWith(httpRegion: HttpRegion): string | undefined{
    if (httpRegion.response) {
      if (httpRegion.metaData.openWith) {
        return httpRegion.metaData.openWith;
      } else if(utils.isMimeTypeImage(httpRegion.response.contentType)) {
        return 'imagePreview.previewEditor';
      } else if (utils.isMimeTypePdf(httpRegion.response.contentType)
        && vscode.extensions.getExtension('tomoki1207.pdf')) {
        return 'pdf.preview';
      }
    }
    return undefined;
  }


  private async saveAndOpenWith(uri: vscode.Uri | undefined, buffer: Buffer, openWith: string | undefined) {
    if (uri) {
      await fs.writeFile(uri.fsPath, new Uint8Array(buffer));
      if (openWith) {
        await vscode.commands.executeCommand('vscode.openWith', uri, openWith);
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
      const language = httpRegion.metaData.language || this.getLanguageId(httpRegion.response?.contentType);



      if (getConfigSetting<boolean>('responseViewReuseEditor')) {
        const cacheItem = this.outputCache.find(obj => obj.document.languageId === language && obj.document.isUntitled);
        if (cacheItem) {
          const lineCount = cacheItem.document.lineCount;
          let editor = vscode.window.visibleTextEditors.find(obj => obj.document === cacheItem.document);
          if (editor !== vscode.window.activeTextEditor) {
            editor = await this.showTextEditor(cacheItem.document);
          }
          if (editor) {
            await editor.edit((obj => obj.replace(new vscode.Range(0, 0, lineCount || 0, 0), content)));
            cacheItem.httpRegion = httpRegion;
            cacheItem.prettyPrintNeeded = await this.prettyPrint(editor);
            return;
          }
        }
      }
      const { document, editor } = await this.createEditor(content, language);
      const prettyPrintNeeded = await this.prettyPrint(editor);
      this.outputCache.push({
        document,
        httpRegion,
        prettyPrintNeeded
      });
    }
  }


  private async prettyPrint(editor: vscode.TextEditor) {
    if (getConfigSetting<boolean>('responseViewPrettyPrint')) {
      if (editor === vscode.window.activeTextEditor) {
        await vscode.commands.executeCommand('editor.action.formatDocument', editor);
      } else {
        return true;
      }
    }
    return false;
  }

  private async createEditor(content: string, language: string) {
    const document = await vscode.workspace.openTextDocument({ language, content });

    const editor = await this.showTextEditor(document);
    return { document, editor };
  }

  private async showTextEditor(document: vscode.TextDocument) {
    let viewColumn = vscode.ViewColumn.Beside;
    if (getConfigSetting<string>('responseViewColumn') === 'current') {
      viewColumn = vscode.ViewColumn.Active;
    }
    return await vscode.window.showTextDocument(document, {
      viewColumn,
      preserveFocus: getConfigSetting<boolean>('responseViewPreserveFocus'),
      preview: getConfigSetting<boolean>('responseViewPreview'),
    });
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




