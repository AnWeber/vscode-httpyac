import * as vscode from 'vscode';
import { HttpRegionSendContext, HttpFileStore } from 'httpyac';


export async function getHttpRegionFromLine(
  doc: vscode.TextDocument | undefined,
  line: number | undefined,
  httpFileStore: HttpFileStore
): Promise<HttpRegionSendContext | undefined> {
  const document = doc?.getText ? doc : vscode.window.activeTextEditor?.document;
  if (document) {
    const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
    if (httpFile) {
      const currentLine = Number.isInteger(line) ? line : vscode.window.activeTextEditor?.selection.active.line;
      if (currentLine !== undefined) {
        const httpRegion = httpFile.httpRegions.find(obj => obj.symbol.startLine <= currentLine && currentLine <= obj.symbol.endLine);
        if (httpRegion) {
          return { httpRegion, httpFile };
        }
      }
    }
  }
  return undefined;
}
