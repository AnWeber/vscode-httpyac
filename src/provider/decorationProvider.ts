import { HttpFile } from 'httpyac';
import * as vscode from 'vscode';
import { watchConfigSettings, getConfigSetting, httpDocumentSelector } from '../config';
import { DocumentStore } from '../documentStore';
import { isNotebook } from '../utils';

export class DecorationProvider {

  private subscriptions: Array<vscode.Disposable>;
  private decorationInactive: vscode.TextEditorDecorationType | undefined;
  private decorationActiveBefore: vscode.TextEditorDecorationType | undefined;
  private decorationActive: vscode.TextEditorDecorationType | undefined;

  constructor(
    refreshCodeLens: vscode.EventEmitter<void>,
    private readonly documentStore: DocumentStore
  ) {
    this.subscriptions = [
      refreshCodeLens.event(() => this.setEditorDecoration(vscode.window.activeTextEditor)),
      vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection, this),
      watchConfigSettings(config => {
        if (this.decorationInactive) {
          this.decorationInactive.dispose();
          this.decorationInactive = undefined;
        }
        if (config.decorationInactiveRegion) {
          this.decorationInactive = vscode.window.createTextEditorDecorationType(
            this.initThemeColors(config.decorationInactiveRegion)
          );
        }

        if (this.decorationActive) {
          this.decorationActive.dispose();
          this.decorationActive = undefined;
        }
        if (config.decorationActiveRegion) {
          const active = this.initThemeColors(config.decorationActiveRegion);
          this.decorationActive = vscode.window.createTextEditorDecorationType(
            active
          );
          this.decorationActiveBefore = vscode.window.createTextEditorDecorationType(
            active
          );
        }
      }),
    ];
  }

  private initThemeColors(options: vscode.DecorationRenderOptions) {
    const result: Record<string, vscode.ThemeColor> = {};
    for (const [key, value] of Object.entries(options)) {
      if (typeof value === 'string' && value.startsWith('theme.')) {
        result[key] = new vscode.ThemeColor(value.slice('theme.'.length));
      }
    }
    return Object.assign({}, options, result);
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
    if (getConfigSetting().useDecorationProvider && !isNotebook(editor.document)) {
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
      if (borderLineRanges.length > 0 && this.decorationInactive) {
        editor.setDecorations(this.decorationInactive, borderLineRanges);
      }
      if (activeBorderLineStart && this.decorationActiveBefore) {
        editor.setDecorations(this.decorationActiveBefore, [activeBorderLineStart]);
      }
      if (activeBorderLineEnd && this.decorationActive) {
        editor.setDecorations(this.decorationActive, [activeBorderLineEnd]);
      }
    }
  }

  dispose(): void {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }
}
