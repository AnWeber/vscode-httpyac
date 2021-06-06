import { HttpFile } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting, httpDocumentSelector } from '../config';
import { DocumentStore } from '../documentStore';
import { isNotebook } from '../utils';

export class DecorationProvider {

  private subscriptions: Array<vscode.Disposable>;
  private decoration: vscode.TextEditorDecorationType;
  private decorationActive: vscode.TextEditorDecorationType;
  private decorationActiveBefore: vscode.TextEditorDecorationType;

  constructor(
    refreshCodeLens: vscode.EventEmitter<void>,
    private readonly documentStore: DocumentStore
  ) {
    this.decoration = vscode.window.createTextEditorDecorationType({
      border: 'dotted rgba(0, 0, 0, 20%)',
      borderWidth: '0 0 2px 0',
      isWholeLine: true,
    });

    this.decorationActive = vscode.window.createTextEditorDecorationType({
      borderColor: new vscode.ThemeColor('editor.selectionBackground'),
      border: 'solid',
      borderWidth: '0 0 2px 0',
      isWholeLine: true,
    });

    this.decorationActiveBefore = vscode.window.createTextEditorDecorationType({
      borderColor: new vscode.ThemeColor('editor.inactiveSelectionBackground'),
      border: 'solid',
      borderWidth: '0 0 2px 0',
      isWholeLine: true,
    });

    this.subscriptions = [
      refreshCodeLens.event(() => this.setEditorDecoration(vscode.window.activeTextEditor)),
      vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection, this),
    ];
  }

  private async setEditorDecoration(editor: vscode.TextEditor | undefined) {
    if (editor && vscode.languages.match(httpDocumentSelector, editor.document)) {
      const httpFile = await this.documentStore.getHttpFile(editor.document);
      if (httpFile) {
        this.setDecoration(httpFile, editor);
      }
    }
  }

  private async onDidChangeTextEditorSelection({ textEditor }: vscode.TextEditorSelectionChangeEvent) {
    if (textEditor && vscode.languages.match(httpDocumentSelector, textEditor.document)) {
      const httpFile = await this.documentStore.getHttpFile(textEditor.document);
      if (httpFile) {
        this.setDecoration(httpFile, textEditor);
      }
    }
  }

  private setDecoration(httpFile: HttpFile, editor: vscode.TextEditor) {
    if (getConfigSetting().useDecorationProvider && !isNotebook(editor)) {
      const borderLineRanges: Array<vscode.Range> = [];
      let activeBorderLineStart: vscode.Range | undefined;
      let activeBorderLineEnd: vscode.Range | undefined;

      httpFile.httpRegions.forEach((httpRegion, index) => {
        if (httpRegion.symbol.children) {
          const currentRange = new vscode.Range(httpRegion.symbol.endLine, 0, httpRegion.symbol.endLine, httpRegion.symbol.endOffset);

          if (httpRegion.symbol.startLine <= editor.selection.active.line
            && httpRegion.symbol.endLine >= editor.selection.active.line) {

            activeBorderLineStart = borderLineRanges.pop();

            activeBorderLineEnd = currentRange;
          } else if (index < httpFile.httpRegions.length - 1) {
            borderLineRanges.push(currentRange);
          }
        }
      });
      if (borderLineRanges.length > 0) {
        editor.setDecorations(this.decoration, borderLineRanges);
      }
      if (activeBorderLineStart) {
        editor.setDecorations(this.decorationActiveBefore, [activeBorderLineStart]);
      }
      if (activeBorderLineEnd) {
        editor.setDecorations(this.decorationActive, [activeBorderLineEnd]);
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
