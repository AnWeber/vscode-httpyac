import * as vscode from 'vscode';
import { httpDocumentSelector } from '../config';

import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';
import { HttpSymbol, HttpSymbolKind, utils } from 'httpyac';

export class FoldingRangeProvider extends DisposeProvider implements vscode.FoldingRangeProvider {
  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.subscriptions = [vscode.languages.registerFoldingRangeProvider(httpDocumentSelector, this)];
  }
  onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
  public async provideFoldingRanges(document: vscode.TextDocument): Promise<vscode.FoldingRange[]> {
    const httpFile = await this.documentStore.getHttpFile(document);

    const result: Array<vscode.FoldingRange> = [];
    if (httpFile) {
      for (const httpRegion of httpFile.httpRegions) {
        const symbols = httpRegion.symbol.filter(s => s.startLine < s.endLine);
        for (const symbol of symbols) {
          if ([HttpSymbolKind.requestBody].includes(symbol.kind) && httpRegion.request?.contentType?.boundary) {
            result.push(...this.getBoundaryFoldingRange(symbol, httpRegion.request?.contentType?.boundary));
          } else if ([HttpSymbolKind.requestBody, HttpSymbolKind.script, HttpSymbolKind.gql].includes(symbol.kind)) {
            result.push(...this.getIndentationFoldingRange(symbol));
          } else {
            const foldingRange = new vscode.FoldingRange(
              symbol.startLine,
              symbol.endLine,
              vscode.FoldingRangeKind.Region
            );
            result.push(foldingRange);
          }
        }
      }
    }
    return result;
  }

  private getBoundaryFoldingRange(symbol: HttpSymbol, boundary: string): vscode.FoldingRange[] {
    const result: vscode.FoldingRange[] = [];

    if (!symbol.source) {
      return result;
    }
    const lines = utils.toMultiLineArray(symbol.source);
    let currentLine = symbol.startLine;

    let startLine = currentLine;
    for (const line of lines) {
      if (line.trim().startsWith(`--${boundary}`)) {
        if (startLine !== currentLine) {
          result.push(new vscode.FoldingRange(startLine, currentLine - 1, vscode.FoldingRangeKind.Region));
        }
        startLine = currentLine;
      }
      currentLine++;
    }

    return result;
  }

  private getIndentationFoldingRange(symbol: HttpSymbol): vscode.FoldingRange[] {
    const result: vscode.FoldingRange[] = [];

    if (!symbol.source) {
      return result;
    }
    const lines = utils.toMultiLineArray(symbol.source);
    let currentLine = symbol.startLine;
    const openFolds: Array<{
      level: number;
      startLine: number;
      endline: number;
    }> = [];

    for (const line of lines) {
      const level = line.search(/\S/u);

      const currentFold = openFolds.at(-1);
      if (currentFold) {
        if (currentFold.level === level) {
          currentFold.endline = currentLine;
        } else if (currentFold.level < level) {
          openFolds.push({
            level,
            startLine: currentLine - 1,
            endline: currentLine,
          });
        } else {
          for (const fold of openFolds.slice().reverse()) {
            if (fold.level > level) {
              result.push(new vscode.FoldingRange(currentFold.startLine, currentLine, vscode.FoldingRangeKind.Region));
              openFolds.pop();
            }
          }
        }
      } else {
        openFolds.push({
          level,
          startLine: currentLine,
          endline: currentLine,
        });
      }
      currentLine++;
    }

    for (const fold of openFolds) {
      if (fold.level > 0) {
        result.push(new vscode.FoldingRange(fold.startLine, currentLine, vscode.FoldingRangeKind.Region));
      }
    }

    return result;
  }
}
