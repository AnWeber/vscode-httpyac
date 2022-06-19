import * as vscode from 'vscode';
import { DisposeProvider } from '../utils';
import { DocumentStore } from '../documentStore';
import * as httpyac from 'httpyac';
import { getEnvironmentConfig, allHttpDocumentSelector } from '../config';
import { EOL } from 'os';

export class VariablesHoverProvider extends DisposeProvider implements vscode.HoverProvider {
  readonly onDidChangeTreeData: vscode.Event<void>;

  variablesChangedEmitter: vscode.EventEmitter<void>;
  constructor(readonly documentStore: DocumentStore, environmentChanged: vscode.Event<string[] | undefined>) {
    super();

    this.variablesChangedEmitter = new vscode.EventEmitter<void>();
    this.onDidChangeTreeData = this.variablesChangedEmitter.event;
    const fireVariablesChanged = () => this.variablesChangedEmitter.fire();
    documentStore.documentStoreChanged(fireVariablesChanged);
    environmentChanged(fireVariablesChanged);
    this.subscriptions = [vscode.languages.registerHoverProvider(allHttpDocumentSelector, this)];
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
    const httpFile = await this.documentStore.getHttpFile(document);
    if (httpFile) {
      const symbol = this.findSymbolForHttpFile(httpFile, position.line);
      if (symbol) {
        const offsetSymbol = this.findSymbolForOffset(symbol, position.line, position.character);
        if (offsetSymbol) {
          if (offsetSymbol.kind === httpyac.HttpSymbolKind.variable) {
            return await this.getHoverForVariable(httpFile, offsetSymbol);
          }
          if (
            offsetSymbol.kind === httpyac.HttpSymbolKind.value &&
            symbol.kind === httpyac.HttpSymbolKind.requestHeader &&
            symbol.name.toLowerCase() === 'authorization'
          ) {
            return await this.getHoverForOAuth2(httpFile, offsetSymbol);
          }
        }
      }
    }
    return undefined;
  }

  private async getHoverForVariable(httpFile: httpyac.HttpFile, symbol: httpyac.HttpSymbol) {
    const variables = await this.getVariables(httpFile);
    const value = variables[symbol.name];
    if (value) {
      return new vscode.Hover(new vscode.MarkdownString(`${symbol.name}: ${httpyac.utils.toString(value)}`));
    }
    return undefined;
  }

  private async getHoverForOAuth2(httpFile: httpyac.HttpFile, symbol: httpyac.HttpSymbol) {
    const match = httpyac.utils.OAuth2Regex.exec(symbol.name);
    if (match?.groups) {
      const variables = await this.getVariables(httpFile);

      const searchPrefix = ['oauth2'];
      if (match.groups.variablePrefix) {
        searchPrefix.push(match.groups.variablePrefix);
      }
      const value = Object.entries(variables)
        .filter(([key]) => searchPrefix.some(prefix => key.startsWith(prefix)))
        .map(([key, value]) => `${key}: ${httpyac.utils.toString(value)}  `)
        .join(EOL);

      if (value.length > 0) {
        return new vscode.Hover(new vscode.MarkdownString(value));
      }
    }
    return undefined;
  }

  private async getVariables(httpFile: httpyac.HttpFile) {
    return (
      this.documentStore.variables ||
      (await httpyac.getVariables({
        httpFile: {
          ...httpFile,
          activeEnvironment: httpFile.activeEnvironment,
        },
        config: await getEnvironmentConfig(httpFile.fileName),
      }))
    );
  }

  private findSymbolForHttpFile(httpFile: httpyac.HttpFile, line: number) {
    for (const httpRegion of httpFile.httpRegions) {
      if (httpRegion.symbol.startLine <= line && httpRegion.symbol.endLine >= line) {
        return this.findSymbolForLine(httpRegion.symbol, line);
      }
    }
    return undefined;
  }

  private findSymbolForLine(httpSymbol: httpyac.HttpSymbol, line: number): undefined | httpyac.HttpSymbol {
    if (httpSymbol.children) {
      for (const symbol of httpSymbol.children) {
        if (symbol.startLine <= line && symbol.endLine >= line) {
          return symbol;
        }
      }
    }
    return undefined;
  }

  private findSymbolForOffset(
    httpSymbol: httpyac.HttpSymbol,
    line: number,
    offset: number
  ): undefined | httpyac.HttpSymbol {
    if (httpSymbol.children) {
      for (const symbol of httpSymbol.children) {
        const isInFirstLine =
          symbol.startLine === line &&
          symbol.startOffset <= offset &&
          (symbol.endLine > line || symbol.endOffset >= offset);
        const isBetween = symbol.startLine < line && (symbol.endLine > line || symbol.endOffset >= offset);

        if (isInFirstLine || isBetween) {
          if (symbol.children) {
            const childSymbol = this.findSymbolForOffset(symbol, line, offset);
            if (childSymbol) {
              return childSymbol;
            }
          }
          return symbol;
        }
      }
    }
    return undefined;
  }
}
