import { DocumentStore } from '../documentStore';
import { HttpSymbol, HttpSymbolKind, io } from 'httpyac';
import * as vscode from 'vscode';

export class HttpDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  constructor(private readonly documentStore: DocumentStore) {}

  async provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
    const httpFile = await this.documentStore.getHttpFile(document);

    const symbols: Array<vscode.DocumentSymbol> = [];

    if (httpFile && httpFile.httpRegions.some(obj => !obj.isGlobal())) {
      for (const httpRegion of httpFile.httpRegions) {
        const httpRegionSymbol = this.toDocumentSymbol(httpRegion.symbol);
        if (httpRegionSymbol) {
          symbols.push(httpRegionSymbol);
        }
      }
    }

    return symbols;
  }

  private toDocumentSymbol(symbol: HttpSymbol): vscode.DocumentSymbol | undefined {
    const range = new vscode.Range(symbol.startLine, symbol.startOffset, symbol.endLine, symbol.endOffset);
    try {
      const result = new vscode.DocumentSymbol(
        symbol.name,
        `${symbol.description}`,
        this.toDocumentSymbolKind(symbol.kind),
        range,
        range
      );
      if (symbol.children) {
        for (const child of symbol.children) {
          const childSymbol = this.toDocumentSymbol(child);
          if (childSymbol) {
            result.children.push(childSymbol);
          }
        }
      }

      return result;
    } catch (err) {
      io.log.error(
        `symbol for "${symbol.source || symbol.name}" (Line ${symbol.startLine}-${
          symbol.endLine
        }) could not be provided`,
        err
      );
    }
    return undefined;
  }

  private toDocumentSymbolKind(kind: HttpSymbolKind) {
    switch (kind) {
      case HttpSymbolKind.metaData:
        return vscode.SymbolKind.Field;
      case HttpSymbolKind.key:
        return vscode.SymbolKind.Key;
      case HttpSymbolKind.value:
        return vscode.SymbolKind.String;
      case HttpSymbolKind.operator:
        return vscode.SymbolKind.Operator;
      case HttpSymbolKind.requestLine:
        return vscode.SymbolKind.Method;
      case HttpSymbolKind.proto:
        return vscode.SymbolKind.Method;
      case HttpSymbolKind.url:
        return vscode.SymbolKind.String;
      case HttpSymbolKind.script:
        return vscode.SymbolKind.Function;
      case HttpSymbolKind.requestHeader:
        return vscode.SymbolKind.Key;
      case HttpSymbolKind.variableDefinition:
        return vscode.SymbolKind.Variable;
      case HttpSymbolKind.variable:
        return vscode.SymbolKind.Variable;
      case HttpSymbolKind.text:
        return vscode.SymbolKind.String;
      case HttpSymbolKind.gql:
        return vscode.SymbolKind.String;
      case HttpSymbolKind.response:
        return vscode.SymbolKind.Package;
      case HttpSymbolKind.path:
        return vscode.SymbolKind.File;
      default:
        return vscode.SymbolKind.Object;
    }
  }
}
