
import * as vscode from 'vscode';
import { httpFileStore, HttpRegionSendContext } from 'httpyac';
import { initHttpClient } from '../config';


export async function getHttpRegionFromLine(doc: vscode.TextDocument  | undefined, line: number | undefined) : Promise<HttpRegionSendContext | undefined> {
  const document = doc?.getText ? doc : vscode.window.activeTextEditor?.document;
  if (document) {
    const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
    if (httpFile) {
      const currentLine = Number.isInteger(line) ? line : vscode.window.activeTextEditor?.selection.active.line;
      if (currentLine !== undefined) {
        const httpRegion = httpFile.httpRegions.find(obj => obj.symbol.startLine <= currentLine && currentLine <= obj.symbol.endLine);
        if (httpRegion) {
          return { httpRegion, httpFile, httpClient: initHttpClient() };
        }
      }
    }
  }
  return undefined;
}


