import { ResponseStore } from '../../responseStore';
import { TestResult } from './testResult';
import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DocumentStore } from '../../documentStore';
import { getConfigSetting } from '../../config';
import { TestItemResolver } from './testItemResolver';

interface TestRunContext {
  testRun: vscode.TestRun;
  testItems: Array<vscode.TestItem>;
  token: vscode.CancellationToken;
}

export class TestRunner {
  constructor(
    private readonly testController: vscode.TestController,
    private readonly testItemResolver: TestItemResolver,
    private readonly documentStore: DocumentStore,
    private readonly responseStore: ResponseStore
  ) {}

  public async run(
    request: vscode.TestRunRequest,
    testItems: Array<vscode.TestItem>,
    token: vscode.CancellationToken
  ): Promise<void> {
    const testRun = this.testController.createTestRun(request);
    for (const testItem of testItems) {
      if (!token.isCancellationRequested) {
        await this.runTestItem(testItem, {
          testRun,
          testItems,
          token,
        });
      } else {
        testRun.skipped(testItem);
      }
    }
    testRun.end();
  }

  private async runTestItem(testItem: vscode.TestItem, testRunContext: TestRunContext): Promise<void> {
    if (testRunContext.token.isCancellationRequested) {
      return;
    }
    const testStartTime = Date.now();
    const duration = () => Date.now() - testStartTime;
    testRunContext.testRun.enqueued(testItem);
    testRunContext.testRun.started(testItem);

    if (this.testItemResolver.isHttpRegionTestItem(testItem)) {
      await this.runTestItemHttpRegion(testItem, duration, testRunContext);
    } else {
      await this.runTestItemFile(testItem, testRunContext);
    }
  }

  private async runTestItemFile(testItem: vscode.TestItem, testRunContext: TestRunContext) {
    for (const childTestItem of await this.testItemResolver.resolveTestItemChildren(testItem)) {
      await this.runTestItem(childTestItem, testRunContext);
    }
  }

  private async runTestItemHttpRegion(
    testItem: vscode.TestItem,
    duration: () => number,
    testRunContext: TestRunContext
  ): Promise<void> {
    const sendContext = await this.getSendContext(testItem, testRunContext);
    if (
      sendContext &&
      httpyac.utils.isHttpRegionSendContext(sendContext) &&
      !sendContext.httpRegion.metaData.disabled &&
      !sendContext.httpRegion.metaData.testDisabled
    ) {
      const tmpLogResponse = sendContext.logResponse;
      let hasTestResponse = false;
      sendContext.logResponse = async (response, httpRegion) => {
        await tmpLogResponse?.(response, httpRegion);
        hasTestResponse = true;
      };
      try {
        await this.documentStore.send(sendContext);
        const testResults = sendContext.httpRegion?.testResults;

        if ((!testResults && hasTestResponse) || (testResults && testResults.every(obj => !obj.error))) {
          testRunContext.testRun.passed(testItem, duration());
        } else if (sendContext.httpRegion.metaData.disabled) {
          testRunContext.testRun.skipped(testItem);
        } else {
          testRunContext.testRun.failed(
            testItem,
            testResults
              ? testResults.reduce((prev, obj) => {
                  if (obj.result) {
                    prev.push(new vscode.TestMessage(obj.message));
                    if (obj.error) {
                      prev.push(new vscode.TestMessage(obj.error.displayMessage));
                    }
                  }
                  return prev;
                }, [] as Array<vscode.TestMessage>)
              : new vscode.TestMessage('no response received'),
            duration()
          );
        }
      } catch (err) {
        httpyac.io.log.error(err);
        testRunContext.testRun.errored(
          testItem,
          new vscode.TestMessage(httpyac.utils.toString(err) || `${err}`),
          duration()
        );
      }
    } else {
      testRunContext.testRun.skipped(testItem);
    }
  }

  private async getSendContext(
    testItem: vscode.TestItem,
    testRunContext: TestRunContext
  ): Promise<httpyac.HttpFileSendContext | httpyac.HttpRegionSendContext | undefined> {
    if (testItem.uri) {
      const config = getConfigSetting();

      const testItemUri = testItem.uri;
      const httpFile = await this.documentStore.getOrCreate(
        testItemUri,
        () => httpyac.io.fileProvider.readFile(testItemUri, 'utf-8'),
        0
      );
      const line = testItem.range?.start.line || 0;
      const httpRegion = httpFile.httpRegions.find(obj => obj.symbol.startLine <= line && obj.symbol.endLine >= line);
      const context: httpyac.HttpFileSendContext | httpyac.HttpRegionSendContext = {
        httpFile,
        httpRegion,
      };
      context.progress = {
        isCanceled: () => testRunContext.token.isCancellationRequested,
        register: (event: () => void) => {
          const dispose = testRunContext.token.onCancellationRequested(event);
          return () => dispose.dispose();
        },
      };
      if (testRunContext.testItems.indexOf(testItem) >= 0) {
        context.logStream = async (_type, response) => {
          if (config.addStreamingResponsesToHistory) {
            await this.responseStore.add(response, undefined, false);
          }
        };
        context.logResponse = async (response, httpRegion) => {
          context.progress?.report?.({
            message: 'show view',
          });
          await this.responseStore.add(response, httpRegion);
        };
      }
      return context;
    }
    return undefined;
  }
}
