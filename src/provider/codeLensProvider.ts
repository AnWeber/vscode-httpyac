import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { getConfigSetting, commands, allHttpDocumentSelector } from '../config';
import { errorHandler } from './errorHandler';
import * as utils from '../utils';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';
import { ResponseStore } from '../responseStore';

export class CodeLensProvider extends DisposeProvider implements vscode.CodeLensProvider {
  constructor(
    private readonly documentStore: DocumentStore,
    private readonly responseStore: ResponseStore
  ) {
    super();
    this.subscriptions = [vscode.languages.registerCodeLensProvider(allHttpDocumentSelector, this)];
  }

  @errorHandler()
  public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const httpFile = await this.documentStore.getHttpFile(document);

    const config = getConfigSetting();
    const result: Array<vscode.CodeLens> = [];

    if (!config?.useCodeLensInNotebook && utils.isNotebook(document)) {
      return result;
    }
    if (httpFile?.httpRegions.some(obj => !obj.isGlobal())) {
      if (config?.codelens?.sendAll) {
        result.push(
          new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            command: commands.sendAll,
            title: 'send all',
          })
        );
      }

      if (config?.codelens?.sendSelected) {
        result.push(
          new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            command: commands.sendSelected,
            title: 'send selected',
          })
        );
      }

      if (config?.codelens?.clearResponseHistory) {
        result.push(
          new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            command: commands.clearHistory,
            title: 'clear all',
          })
        );
      }

      if (config?.codelens?.showVariables) {
        result.push(
          new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            command: commands.showVariables,
            title: 'show variables',
          })
        );
      }

      for (const httpRegion of httpFile.httpRegions) {
        const requestLine =
          httpRegion.symbol.children?.find(obj => obj.kind === httpyac.HttpSymbolKind.requestLine)?.startLine ||
          httpRegion.symbol.startLine;
        const range = new vscode.Range(requestLine, 0, httpRegion.symbol.endLine, 0);
        const args = [document.uri, requestLine];

        if (!httpRegion.isGlobal()) {
          if (config?.codelens?.send) {
            let title = 'send';
            if (!httpRegion.request) {
              title = 'execute';
            } else if (
              httpRegion.request.protocol &&
              ['AMQP', 'MQTT', 'SSE', 'WS', 'GRPC'].indexOf(httpRegion.request.protocol) >= 0
            ) {
              title = 'connect';
            }

            result.push(
              new vscode.CodeLens(range, {
                command: commands.send,
                arguments: args,
                title:
                  config?.useMethodInSendCodeLens && httpRegion.request
                    ? `${title} (${httpRegion.request.method})`
                    : title,
              })
            );
          }
          if (config?.codelens?.sendRepeat && httpyac.utils.isHttpRequest(httpRegion.request)) {
            result.push(
              new vscode.CodeLens(range, {
                command: commands.sendRepeat,
                arguments: args,
                title: config?.useMethodInSendCodeLens ? `send repeat (${httpRegion.request.method})` : 'send repeat',
              })
            );
          }

          if (config?.codelens?.validateVariables) {
            result.push(
              new vscode.CodeLens(range, {
                command: commands.validateVariables,
                arguments: args,
                title: 'validate',
              })
            );
          }
        }
        if (httpRegion.testResults && config?.codelens?.testResult) {
          result.push(
            new vscode.CodeLens(range, {
              arguments: [httpRegion],
              title: `TestResults ${httpRegion.testResults.filter(obj => obj.status === httpyac.TestResultStatus.SUCCESS).length}/${
                httpRegion.testResults.length
              }`,
              command: commands.viewHeader,
            })
          );
        }

        const responseItem = await this.responseStore.findResponseByHttpRegion(httpRegion);
        if (responseItem) {
          if (config?.codelens?.showResponse) {
            result.push(
              new vscode.CodeLens(range, {
                command: commands.show,
                arguments: args,
                title: 'show',
              })
            );
          }

          if (config?.codelens?.saveResponse) {
            result.push(
              new vscode.CodeLens(range, {
                command: commands.save,
                arguments: args,
                title: 'save',
              })
            );
          }

          if (config?.codelens?.showResponseHeaders) {
            result.push(
              new vscode.CodeLens(range, {
                command: commands.viewHeader,
                arguments: args,
                title: 'show headers',
              })
            );
          }
        }
        if (httpyac.utils.isHttpRequest(httpRegion.request)) {
          if (config?.codelens?.generateCode && config.generateCodeDefaultLanguage) {
            result.push(
              new vscode.CodeLens(range, {
                command: commands.generateCode,
                arguments: args,
                title: `generate ${config.generateCodeDefaultLanguage.target}${
                  config.generateCodeDefaultLanguage.client ? ` - ${config.generateCodeDefaultLanguage.client}` : ''
                }`,
              })
            );
          }
          if (config?.codelens?.generateCodeSelectLanguage) {
            result.push(
              new vscode.CodeLens(range, {
                command: commands.generateCodeSelectLanguage,
                arguments: args,
                title: 'generate code',
              })
            );
          }
        }
      }
    }
    return Promise.resolve(result);
  }
}
