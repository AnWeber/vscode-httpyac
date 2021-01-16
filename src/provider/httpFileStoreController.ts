import * as vscode from 'vscode';
import { HttpFile, httpFileStore, HttpSymbolKind } from 'httpyac';
import throttle from 'lodash/throttle';
import { errorHandler } from './errorHandler';
import { getConfigSetting } from '../config';

export class HttpFileStoreController {

  private subscriptions: Array<vscode.Disposable> = [];
  private decoration: vscode.TextEditorDecorationType;
  constructor(context: vscode.ExtensionContext, private readonly refreshCodeLens: vscode.EventEmitter<void>) {
    this.decoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: context.asAbsolutePath('./assets/gutter.svg'),
      gutterIconSize: "70%",
    });
    const refreshHttpFileThrottled = throttle(this.refreshHttpFile.bind(this), 200);
    const document = vscode.window.activeTextEditor?.document;
    if (document) {
      refreshHttpFileThrottled(document);
    }
    this.subscriptions = [
      vscode.workspace.onDidCloseTextDocument((document) => {
        httpFileStore.remove(document.fileName);
      }),
      vscode.workspace.onDidOpenTextDocument( async (document: vscode.TextDocument) => {
        await this.refreshHttpFile(document);
      }),
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        await refreshHttpFileThrottled(event.document);
      }),
      vscode.workspace.onDidRenameFiles((fileRenameEvent) => {
        fileRenameEvent.files.forEach(file => {
          httpFileStore.rename(file.oldUri.fsPath, file.newUri.fsPath);
        });
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        await refreshHttpFileThrottled(event.document);
      })
    ];
  }

  @errorHandler()
  async refreshHttpFile(document: vscode.TextDocument){
    if (document.languageId === 'http') {
      const httpFile = await httpFileStore.getOrCreate(document.fileName, () => Promise.resolve(document.getText()), document.version);
      if (this.refreshCodeLens) {
        this.refreshCodeLens.fire();
      }
      this.showGutterIcon(document, httpFile);
      return httpFile;
    }
    return undefined;
  }

  private showGutterIcon(document: vscode.TextDocument, httpFile: HttpFile) {
    if (getConfigSetting('showGutterIcon')) {
      const editor = vscode.window.visibleTextEditors.find(obj => obj.document === document);
      if (editor) {
        const ranges: Array<vscode.Range> = [];

        for (const httpRegion of httpFile.httpRegions) {
          if (httpRegion.symbol.children) {
            const symbol = httpRegion.symbol.children.find(obj => obj.kind === HttpSymbolKind.requestLine);
            if (symbol) {
              ranges.push(new vscode.Range(symbol.startLine, symbol.startOffset, symbol.endLine, symbol.endOffset));
            }
          }
        }
        if (ranges.length > 0) {
          editor.setDecorations(this.decoration, ranges);
        }
      }
    }
  }

  dispose() {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }

}