import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { getConfigSetting, commands, httpDocumentSelector } from '../config';
import { errorHandler } from './errorHandler';
import * as utils from '../utils';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';

export class CodeLensProvider extends DisposeProvider implements vscode.CodeLensProvider {

  constructor(
    private readonly documentStore: DocumentStore,
  ) {
    super();
    this.subscriptions = [
      vscode.languages.registerCodeLensProvider(httpDocumentSelector, this),
    ];
  }

  @errorHandler()
  public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const httpFile = await this.documentStore.getHttpFile(document);

    const config = getConfigSetting();
    const result: Array<vscode.CodeLens> = [];

    if (!config?.useCodeLensInNotebook && utils.isNotebook(document)) {
      return result;
    }

    if (httpFile && httpFile.httpRegions.length > 0) {
      if (config?.codelens?.sendAll) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.sendAll,
          title: 'send all'
        }));
      }

      if (config?.codelens?.sendSelected) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.sendSelected,
          title: 'send selected'
        }));
      }

      if (config?.codelens?.clearResponseHistory) {
        result.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
          command: commands.clearHistory,
          title: 'clear all'
        }));
      }

      for (const httpRegion of httpFile.httpRegions) {
        const requestLine = httpRegion.symbol.children?.find(obj => obj.kind === httpyac.HttpSymbolKind.requestLine)?.startLine || httpRegion.symbol.startLine;
        const range = new vscode.Range(requestLine, 0, httpRegion.symbol.endLine, 0);
        const args = [document.uri, requestLine];

        if (!!httpRegion.request && !httpRegion.metaData.disabled) {
          if (config?.codelens?.send) {
            result.push(new vscode.CodeLens(range, {
              command: commands.send,
              arguments: args,
              title: config?.useMethodInSendCodeLens ? `send (${httpRegion.request.method})` : 'send'
            }));
          }
          if (config?.codelens?.sendRepeat) {
            result.push(new vscode.CodeLens(range, {
              command: commands.sendRepeat,
              arguments: args,
              title: config?.useMethodInSendCodeLens ? `send repeat (${httpRegion.request.method})` : 'send repeat'
            }));
          }
        }

        if (httpRegion.testResults && config?.codelens?.testResult) {
          result.push(new vscode.CodeLens(range, {
            arguments: [httpRegion],
            title: `TestResults ${httpRegion.testResults.filter(obj => obj.result).length}/${httpRegion.testResults.length}`,
            command: commands.viewHeader
          }));
        }

        if (httpyac.utils.isHttpRequest(httpRegion.request)) {
          if (config?.codelens?.generateCode && config.generateCodeDefaultLanguage) {
            result.push(new vscode.CodeLens(range, {
              command: commands.generateCode,
              arguments: args,
              title: `generate ${config.generateCodeDefaultLanguage.target}${config.generateCodeDefaultLanguage.client ? ` - ${config.generateCodeDefaultLanguage.client}` : ''}`
            }));
          }
          if (config?.codelens?.generateCodeSelectLanguage) {
            result.push(new vscode.CodeLens(range, {
              command: commands.generateCodeSelectLanguage,
              arguments: args,
              title: 'generate code'
            }));
          }
        }
        if (httpRegion.response) {
          if (config?.codelens?.showResponse) {
            result.push(new vscode.CodeLens(range, {
              command: commands.show,
              arguments: args,
              title: 'show'
            }));
          }

          if (config?.codelens?.saveResponse) {
            result.push(new vscode.CodeLens(range, {
              command: commands.save,
              arguments: args,
              title: 'save'
            }));
          }

          if (config?.codelens?.showResponseHeaders) {
            result.push(new vscode.CodeLens(range, {
              command: commands.viewHeader,
              arguments: args,
              title: 'show headers'
            }));
          }
        }
      }
    }
    return Promise.resolve(result);
  }
}