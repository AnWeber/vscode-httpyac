import { HttpSymbol, HttpSymbolKind, HttpFile } from 'httpyac';
import {HttpFileStoreController} from './httpFileStoreController';
import * as vscode from 'vscode';

export class HttpDocumentSymbolProvider implements vscode.DocumentSymbolProvider{

  constructor(private readonly httpFileStoreController: HttpFileStoreController){}

  async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) : Promise<vscode.DocumentSymbol[]>{
    const httpFile = await this.httpFileStoreController.getHttpFile(document);

    const symbols: Array<vscode.DocumentSymbol> = [];
    if (httpFile) {
      for (const httpRegion of httpFile.httpRegions) {
        symbols.push(this.toDocumentSymbol(httpRegion.symbol));
      }
    }
    return symbols;
  }

  private toDocumentSymbol(symbol: HttpSymbol) : vscode.DocumentSymbol {
    const range = new vscode.Range(symbol.startLine, symbol.startOffset, symbol.endLine, symbol.endOffset);
    const result = new vscode.DocumentSymbol(symbol.name, symbol.description, this.toDocumentSymbolKind(symbol.kind), range, range);
    if (symbol.children) {
      for (const child of symbol.children) {
        result.children.push(this.toDocumentSymbol(child));
      }
    }

    return result;
  }

  private toDocumentSymbolKind(kind: HttpSymbolKind) {
    switch (kind) {
      case HttpSymbolKind.metaData: return vscode.SymbolKind.Field;
      case HttpSymbolKind.metaDataKey: return vscode.SymbolKind.Key;
      case HttpSymbolKind.metaDataValue: return vscode.SymbolKind.String;
      case HttpSymbolKind.requestMethod: return vscode.SymbolKind.Operator;
      case HttpSymbolKind.requestLine: return vscode.SymbolKind.Method;
      case HttpSymbolKind.requestUrl: return vscode.SymbolKind.String;
      case HttpSymbolKind.script: return vscode.SymbolKind.Function;
      case HttpSymbolKind.requestHeader: return vscode.SymbolKind.Key;
      case HttpSymbolKind.requestHeaderKey: return vscode.SymbolKind.Key;
      case HttpSymbolKind.requestHeaderValue: return vscode.SymbolKind.String;
      case HttpSymbolKind.variable: return vscode.SymbolKind.Variable;
      case HttpSymbolKind.variableName: return vscode.SymbolKind.Variable;
      case HttpSymbolKind.varialbeValue: return vscode.SymbolKind.String;
    }
    return vscode.SymbolKind.Object;
  }
}