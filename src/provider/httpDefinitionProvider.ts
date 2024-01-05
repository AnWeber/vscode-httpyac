import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DocumentStore } from '../documentStore';

import * as path from 'path';



export class HttpDefinitionProvider implements vscode.DefinitionProvider {
  constructor(readonly documentStore: DocumentStore) {
  }

  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | vscode.LocationLink[]> {

    const result: Array<vscode.Location> = [];
    const httpFile = await this.documentStore.getHttpFile(document);
    const workingDir = path.dirname(document.fileName);
    const word = document.getText(document.getWordRangeAtPosition(position));
    const line = document.lineAt(position);

    if(httpFile){
      for (const httpRegion of httpFile.httpRegions) {
        // find if current position is with in requestBody
        const requestBody =
          httpRegion.symbol.children?.find(obj => 
            // this could be with new new SymbolKind.File 
            obj.kind === httpyac.HttpSymbolKind.requestBody && 
            obj.startLine === line.lineNumber
          );
        if(requestBody){
          // check if request body is link to file
          const source = requestBody.source;
          const reStr = `^<@?\\w*\\s+(.*?${word}.*?)\\s*$`;
          const match = source?.match(reStr);
          if (match) {
            const potentialFname = match[1] || match[2];
            // resolve from relative path to absolute
            const fullPath = path.resolve(workingDir, potentialFname);
            result.push(
              new vscode.Location(vscode.Uri.file(fullPath), new vscode.Position(0, 1))
            );
          }
          break;
        }
      }
    }
    return Promise.resolve(result);
  }

}
