import * as vscode from 'vscode';
import { HttpRegionSendContext } from 'httpyac';
import { DocumentStore } from '../documentStore';


export async function getHttpRegionFromLine(
  doc: vscode.TextDocument | undefined,
  line: number | undefined,
  documentStore: DocumentStore
): Promise<HttpRegionSendContext | undefined> {
  const document = doc?.getText ? doc : vscode.window.activeTextEditor?.document;
  if (document) {
    const httpFile = await documentStore.getHttpFile(document);
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
