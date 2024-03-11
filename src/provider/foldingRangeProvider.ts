import * as vscode from 'vscode';
import { allHttpDocumentSelector } from '../config';

import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';

export class FoldingRangeProvider extends DisposeProvider implements vscode.FoldingRangeProvider {
  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.subscriptions = [vscode.languages.registerFoldingRangeProvider(allHttpDocumentSelector, this)];
  }
  onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
  public async provideFoldingRanges(document: vscode.TextDocument): Promise<vscode.FoldingRange[]> {
    const httpFile = await this.documentStore.getHttpFile(document);

    const result: Array<vscode.FoldingRange> = [];
    if (httpFile) {
      for (const httpRegion of httpFile.httpRegions) {
        const symbols = httpRegion.symbol.filter(s => s.startLine < s.endLine);
        for (const symbol of symbols) {
          const foldingRange = new vscode.FoldingRange(
            symbol.startLine,
            symbol.endLine,
            vscode.FoldingRangeKind.Region
          );
          result.push(foldingRange);
        }
      }
    }

    return result;
  }
}
