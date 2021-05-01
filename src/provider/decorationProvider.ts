import { HttpFile, HttpSymbolKind, HttpFileStore } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting, httpDocumentSelector } from '../config';

export class DecorationProvider {

  private subscriptions: Array<vscode.Disposable>;
  private decoration: vscode.TextEditorDecorationType;

  constructor(
    context: vscode.ExtensionContext,
    refreshCodeLens: vscode.EventEmitter<void>,
    private readonly httpFileStore: HttpFileStore
  ) {
    this.decoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: context.asAbsolutePath('./assets/gutter.svg'),
      gutterIconSize: '70%',
    });

    this.subscriptions = [
      refreshCodeLens.event(() => this.setEditorDecoration(vscode.window.activeTextEditor)),
      vscode.window.onDidChangeActiveTextEditor(this.setEditorDecoration, this)
    ];
  }

  private setEditorDecoration(editor: vscode.TextEditor | undefined) {
    if (editor && vscode.languages.match(httpDocumentSelector, editor.document)) {
      const httpFile = this.httpFileStore.get(editor.document.fileName);
      if (httpFile) {
        this.setDecoration(httpFile, editor);
      }
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
