import * as vscode from 'vscode';
import { DocumentStore } from '../documentStore';

import * as fs from 'fs';
import * as path from 'path';

import * as httpyac from 'httpyac';

// thanks to https://github.com/abierbaum/vscode-file-peek

export class HttpDefinitionProvider implements vscode.DefinitionProvider {

  protected fileSearchExtensions: string[] = ['json'];

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
        const requestBody =
          httpRegion.symbol.children?.find(obj => 
            obj.kind === httpyac.HttpSymbolKind.requestBody && 
            obj.startLine === line.lineNumber
          );
        if(requestBody){
          const source = requestBody.source;
          const reStr = `^<@?\\w*\\s+(.*?${word}.*?)\\s*$`;
          const match = source?.match(reStr);
          if (match) {
            const potentialFname = match[1] || match[2];
            console.log("potentialFname", potentialFname)
            const fullPath = path.resolve(workingDir, potentialFname);
            const potentialFnames: string[] = this.getPotentialPaths(fullPath);
            const foundFname = potentialFnames.find(fnameFull => fs.existsSync(fnameFull)) || "";
            result.push(
              new vscode.Location(vscode.Uri.file(foundFname), new vscode.Position(0, 1))
            );
          }
          break;
        }
      }
    }

    return Promise.resolve(result);
  }



  getPotentialPaths(lookupPath: string): string[] {
    const potential_paths: string[] = [lookupPath];

    // Add on list where we just add the file extension directly
    this.fileSearchExtensions.forEach(extStr => {
      potential_paths.push(lookupPath + extStr);
    });

    // if we have an extension, then try replacing it.
    const parsed_path = path.parse(lookupPath);
    if (parsed_path.ext !== '') {
      this.fileSearchExtensions.forEach(extStr => {
        const new_path = path.format({
          base: parsed_path.name + extStr,
          dir: parsed_path.dir,
          ext: extStr,
          name: parsed_path.name,
          root: parsed_path.root,
        });
        potential_paths.push(new_path);
      });
    }

    return potential_paths;
  }
}
