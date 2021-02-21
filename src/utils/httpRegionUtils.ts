
import * as vscode from 'vscode';
import { httpFileStore, httpYacApi } from 'httpyac';

export async function getHttpRegionFromLine(doc: vscode.TextDocument  | undefined, line: number | undefined) {
  const document = doc || vscode.window.activeTextEditor?.document;
  if (document) {
    const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
    if (httpFile) {
      const currentLine = line ?? vscode.window.activeTextEditor?.selection.active.line;
      if (currentLine !== undefined) {
        const httpRegion = httpFile.httpRegions.find(obj => obj.symbol.startLine <= currentLine && currentLine <= obj.symbol.endLine);
        if (httpRegion) {
          return { httpRegion, httpFile, httpClient: httpYacApi.httpClient };
        }
      }
    }
  }
  return undefined;
}