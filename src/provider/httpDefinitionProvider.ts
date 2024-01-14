import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DocumentStore } from '../documentStore';

export class HttpDefinitionProvider implements vscode.DefinitionProvider {
  constructor(readonly documentStore: DocumentStore) {}

  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | vscode.LocationLink[]> {
    const result: Array<vscode.Location> = [];
    const httpFile = await this.documentStore.getHttpFile(document);

    if (httpFile) {
      for (const httpRegion of httpFile.httpRegions) {
        const pathSymbols = httpRegion.symbol
          .getSymbolsForLine(position.line)
          .filter(
            symbol =>
              symbol.kind === httpyac.HttpSymbolKind.path &&
              symbol.startOffset <= position.character &&
              position.character <= symbol.endOffset
          );

        for (const pathSymbol of pathSymbols) {
          const path = await httpyac.utils.toAbsoluteFilename(
            pathSymbol.description,
            httpyac.io.fileProvider.dirname(httpFile.fileName)
          );
          if (path instanceof vscode.Uri) {
            result.push(
              new vscode.Location(
                path,
                new vscode.Range(
                  new vscode.Position(pathSymbol.startLine, pathSymbol.startOffset),
                  new vscode.Position(pathSymbol.endLine, pathSymbol.endOffset)
                )
              )
            );
          }
        }
      }
    }
    return result;
  }
}
