import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { commands, getConfigSetting } from '../config';
import { errorHandler } from './errorHandler';
import { DocumentArgument, getHttpRegionFromLine, LineArgument, DisposeProvider } from '../utils';
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
      if (config.generateCodeDefaultLanguage) {
        const target = this.getGenerationTargets().find(
          obj =>
            obj.client === config.generateCodeDefaultLanguage?.client &&
            obj.target === config.generateCodeDefaultLanguage?.target
        );
        if (target) {
          await this.generateCodeRequest(context, target);
        }
      } else {
        this.generateCodeSelectLanguage(document, line);
      }
    }
  }
  @errorHandler()
  private async generateCodeSelectLanguage(document?: DocumentArgument, line?: LineArgument) {
    const context = await getHttpRegionFromLine(document, line, this.documentStore);
    if (context) {
      const codeTarget = await vscode.window.showQuickPick(this.getGenerationTargets(), { ignoreFocusOut: true });
      if (codeTarget) {
        await this.generateCodeRequest(context, codeTarget);
      }
    }
  }

  private async generateCodeRequest(context: httpyac.HttpRegionSendContext, target: GenerationTarget) {
    const config = getConfigSetting();
    const content = await target.generate(context);
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
}
