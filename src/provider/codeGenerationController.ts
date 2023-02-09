import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { commands, getConfigSetting } from '../config';
import { errorHandler } from './errorHandler';
import {
  DocumentArgument,
  getHttpRegionFromLine,
  LineArgument,
  DisposeProvider,
  getTextEditor,
  getLine,
} from '../utils';
import { getHttpyacTargets, getHttpSnippetTargets, GenerationTarget } from './generator';
import { DocumentStore } from '../documentStore';

export class CodeGenerationController extends DisposeProvider {
  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.subscriptions = [
      vscode.commands.registerCommand(commands.generateCode, this.generateCode, this),
      vscode.commands.registerCommand(commands.generateCodeSelectLanguage, this.generateCodeSelectLanguage, this),
    ];
  }

  @errorHandler()
  private async generateCode(document?: DocumentArgument, line?: LineArgument) {
    const context = await getHttpRegionFromLine(document, line, this.documentStore);
    if (context) {
      const config = getConfigSetting();
      const refName = this.getRefNameAtLine(document, line);
      if (config.generateCodeDefaultLanguage) {
        const target = this.getGenerationTargets().find(
          obj =>
            obj.client === config.generateCodeDefaultLanguage?.client &&
            obj.target === config.generateCodeDefaultLanguage?.target
        );
        if (target) {
          await this.generateCodeRequest(context, target, refName);
        }
      } else {
        this.generateCodeSelectLanguage(document, line, refName);
      }
    }
  }
  @errorHandler()
  private async generateCodeSelectLanguage(document?: DocumentArgument, line?: LineArgument, refName?: string) {
    const context = await getHttpRegionFromLine(document, line, this.documentStore);
    if (context) {
      const codeTarget = await vscode.window.showQuickPick(this.getGenerationTargets(), { ignoreFocusOut: true });
      if (codeTarget) {
        await this.generateCodeRequest(context, codeTarget, refName);
      }
    }
  }

  private async generateCodeRequest(
    context: httpyac.HttpRegionSendContext,
    target: GenerationTarget,
    refName?: string
  ) {
    const config = getConfigSetting();
    const content = await target.generate(context, refName);
    if (content) {
      if (config.generateCodeTargetOutput === 'clipboard') {
        await vscode.env.clipboard.writeText(content);
      } else {
        const document = await vscode.workspace.openTextDocument({
          content,
        });
        await vscode.window.showTextDocument(document);
      }
    }
  }
  private getGenerationTargets() {
    return [...getHttpSnippetTargets(), ...getHttpyacTargets()];
  }

  private getRefNameAtLine(document: DocumentArgument, line?: LineArgument) {
    const editor = getTextEditor(document) || vscode.window.activeTextEditor;
    const lineNumber = editor && getLine(line || editor.selection?.start?.line, editor);
    if (lineNumber && editor) {
      const text = editor.document
        .getText(new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber + 1, 0)))
        .trim();
      const match = /^\s*(#+|\/{2})\s*@(force)?ref\s*(?<name>.*)\s*$/u.exec(text);
      if (match?.groups?.name) {
        return match.groups.name;
      }
    }
    return undefined;
  }
}
