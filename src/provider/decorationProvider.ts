import { HttpFile, HttpSymbolKind, httpFileStore } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting, httpDocumentSelector } from '../config';

export class DecorationProvider {

  private subscriptions: Array<vscode.Disposable>;
  private decoration: vscode.TextEditorDecorationType;

  constructor(context: vscode.ExtensionContext, httpFileEmitter: vscode.EventEmitter<{ httpFile: HttpFile, document: vscode.TextDocument }>) {
    this.decoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: context.asAbsolutePath('./assets/gutter.svg'),
      gutterIconSize: '70%',
    });

    this.subscriptions = [
      httpFileEmitter.event(({ document, httpFile }) => this.showGutterIcon(document, httpFile)),
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && vscode.languages.match(httpDocumentSelector, editor.document)) {
          const httpFile = httpFileStore.get(editor.document.fileName);
          if (httpFile) {
            this.setDecoration(httpFile, editor);
          }
        }
      }, this)
    ];
  }


  private showGutterIcon(document: vscode.TextDocument, httpFile: HttpFile) {
    const editor = vscode.window.visibleTextEditors.find(obj => obj.document === document);
    if (editor) {
      this.setDecoration(httpFile, editor);
    }

  }

  private setDecoration(httpFile: HttpFile, editor: vscode.TextEditor) {
    if (getConfigSetting().showGutterIcon) {
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

  dispose() : void {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }
}
