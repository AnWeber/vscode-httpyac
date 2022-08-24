import { ResponseStore } from '../../responseStore';
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

    for (const testItem of await this.enqueuedTestItems(testItems, testRun)) {
      if (!token.isCancellationRequested && this.testItemResolver.isHttpRegionTestItem(testItem)) {
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

  private async enqueuedTestItems(
    testItems: Array<vscode.TestItem>,
    testRun: vscode.TestRun
  ): Promise<Array<vscode.TestItem>> {
    const result: Array<vscode.TestItem> = [];
    for (const testItem of testItems) {
      if (this.testItemResolver.isHttpRegionTestItem(testItem)) {
        testRun.enqueued(testItem);
        result.push(testItem);
      } else {
        result.push(
          ...(await this.enqueuedTestItems(await this.testItemResolver.resolveTestItemChildren(testItem), testRun))
        );
      }
    }
    return result;
  }

  private async runTestItem(testItem: vscode.TestItem, testRunContext: TestRunContext): Promise<void> {
    const testStartTime = Date.now();
    const duration = () => Date.now() - testStartTime;
    testRunContext.testRun.started(testItem);
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
                  if (!obj.result) {
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
        divider: 1,
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
