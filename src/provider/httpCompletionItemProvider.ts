import { httpDocumentSelector } from '../config';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';
import * as httpyac from 'httpyac';
import { types } from 'mime-types';
import * as vscode from 'vscode';

interface HttpCompletionItem {
  name: string;
  description: string;
  text?: string | vscode.SnippetString;
  kind: vscode.CompletionItemKind;
}

export class HttpCompletionItemProvider extends DisposeProvider implements vscode.CompletionItemProvider {
  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.subscriptions = [vscode.languages.registerCompletionItemProvider(httpDocumentSelector, this)];
  }

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[] | undefined> {
    const textLine = document.getText(new vscode.Range(position.line, 0, position.line, position.character)).trim();
    const httpFile = await this.documentStore.getHttpFile(document);

    const httpRegion =
      httpFile &&
      httpFile.httpRegions.find(obj => obj.symbol.startLine <= position.line && position.line <= obj.symbol.endLine);
    const isInRequestLine = !!httpRegion && this.isInRequestLine(httpRegion, position.line);

    const result: Array<HttpCompletionItem> = [];

    result.push(...this.getRequestMethodCompletionItems(textLine));

    result.push(...this.getRequestHeaders(textLine, isInRequestLine, httpRegion));

    result.push(...this.getMimetypes(textLine, isInRequestLine));
    result.push(...this.getAuthorization(textLine, isInRequestLine));
    result.push(...this.getMetaData(textLine, isInRequestLine));
    result.push(...(await this.getRefName(textLine, httpFile)));

    return result.map(obj => {
      const item = new vscode.CompletionItem(obj.name, obj.kind);
      item.detail = obj.description;
      item.documentation = obj.description;
      item.insertText = obj.text || obj.name;
      return item;
    });
  }

  private getRequestMethodCompletionItems(textLine: string): Array<HttpCompletionItem> {
    const items = [];
    const line = textLine.trim();
    for (const provider of httpyac.io.completionItemProvider.emptyLineProvider) {
      items.push(
        ...provider(line).map(obj => ({
          ...obj,
          kind: vscode.CompletionItemKind.Function,
        }))
      );
    }
    if (line.length > 0) {
      const result = [];
      for (const item of items) {
        const text = item.text || item.name;
        if (text.startsWith(line)) {
          result.push(item);
          item.text = text.slice(line.length);
        }
      }
      return result;
    }
    return items;
  }

  private getRequestHeaders(
    textLine: string,
    isInRequestLine: boolean,
    httpRegion?: httpyac.HttpRegion
  ): Array<HttpCompletionItem> {
    if (isInRequestLine && httpRegion?.request) {
      const result: Array<HttpCompletionItem> = [];

      for (const provider of httpyac.io.completionItemProvider.requestHeaderProvider) {
        result.push(...provider(httpRegion.request).map(obj => ({ ...obj, kind: vscode.CompletionItemKind.Field })));
      }

      if (result) {
        return result.filter(
          obj => textLine.length === 0 || obj.name.toLowerCase().startsWith(textLine.trim().toLowerCase())
        );
      }
    }
    return [];
  }

  private isInRequestLine(httpRegion: httpyac.HttpRegion, line: number) {
    if (httpRegion.symbol.children) {
      const preLine = httpRegion.symbol.children.find(obj => obj.startLine === line - 1);
      if (
        preLine &&
        (preLine.kind === httpyac.HttpSymbolKind.requestLine || preLine.kind === httpyac.HttpSymbolKind.requestHeader)
      ) {
        return true;
      }
    }
    return false;
  }

  private getMimetypes(line: string, isInRequestLine: boolean): Array<HttpCompletionItem> {
    if (isInRequestLine && line.toLowerCase().indexOf('content-type') >= 0) {
      const result = Object.entries(types).map(([key, value]) => ({
        name: value,
        description: key,
        kind: vscode.CompletionItemKind.Value,
      }));
      result.push({
        name: 'application/x-www-form-urlencoded',
        description: 'application/x-www-form-urlencoded',
        kind: vscode.CompletionItemKind.Value,
      });
      return result;
    }
    return [];
  }

  private getAuthorization(line: string, isInRequestLine: boolean): Array<HttpCompletionItem> {
    if (isInRequestLine && line.toLowerCase().indexOf('authorization') >= 0) {
      return [
        {
          name: 'Basic',
          description: 'Basic Authentication',
          kind: vscode.CompletionItemKind.Value,
        },
        {
          name: 'Digest',
          description: 'Digest Authentication',
          kind: vscode.CompletionItemKind.Value,
        },
        {
          name: 'AWS',
          description: 'AWS Signnature v4',
          kind: vscode.CompletionItemKind.Value,
        },
        {
          name: 'OAuth2',
          description: 'OAuth2',
          kind: vscode.CompletionItemKind.Value,
        },
        {
          name: 'OpenId',
          description: 'OpenId',
          kind: vscode.CompletionItemKind.Value,
        },
        {
          name: 'Bearer',
          description: 'Bearer Authentication',
          kind: vscode.CompletionItemKind.Value,
        },
      ];
    }
    return [];
  }

  private getMetaData(textLine: string, isInRequestLine: boolean): Array<HttpCompletionItem> {
    if (textLine.trim().startsWith('#') && !isInRequestLine) {
      const result: Array<{
        name: string;
        description: string;
        kind: vscode.CompletionItemKind;
        text?: string;
      }> = [];
      const line = textLine.trim().slice(1).trim();
      for (const obj of httpyac.utils.knownMetaData) {
        const item = {
          name: `@${obj.name}`,
          description: obj.description,
          kind: vscode.CompletionItemKind.Field,
          text: `@${obj.name}`,
        };

        if (line.length === 0 || item.name.startsWith(line)) {
          if (obj.completions) {
            for (const completion of obj.completions) {
              result.push({
                ...item,
                name: `@${obj.name} ${completion}`,
                text: `@${obj.name} ${completion}`.slice(line.length),
              });
            }
          } else {
            result.push({
              ...item,
              text: item.name.slice(line.length),
            });
          }
        }
      }
      return result;
    }
    return [];
  }

  private async getRefName(line: string, httpFile: httpyac.HttpFile | undefined): Promise<Array<HttpCompletionItem>> {
    if (httpFile && line.startsWith('#') && line.toLowerCase().indexOf('ref') >= 0) {
      const result: Array<HttpCompletionItem> = [];

      const toHttpCompletionItem = (httpRegion: httpyac.HttpRegion) => ({
        name: httpRegion && httpyac.utils.isString(httpRegion.metaData.name) ? httpRegion.metaData.name : '',
        description: 'httpRegion name',
        kind: vscode.CompletionItemKind.Reference,
      });

      result.push(...httpFile.httpRegions.filter(obj => !!obj.metaData.name).map(toHttpCompletionItem));
      return result;
    }
    return [];
  }
}
