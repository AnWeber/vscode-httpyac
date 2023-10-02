import { ResponseStore } from '../../responseStore';
import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DocumentStore } from '../../documentStore';
import { getConfigSetting } from '../../config';
import { TestItemResolver } from './testItemResolver';
import { StoreController } from '../storeController';

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
    private readonly responseStore: ResponseStore,
    private readonly storeController: StoreController
  ) {}

  public async run(request: vscode.TestRunRequest, token: vscode.CancellationToken): Promise<void> {
    const testRun = this.testController.createTestRun(request);
    const testItems: Array<vscode.TestItem> = await this.testItemResolver.resolveTestItemsForRequest(request);

    await this.resetEnvironmentIfNeeded();
    const testFuncs = (await this.enqueuedTestItems(testItems, testRun)).map(items => async () => {
      for (const item of items) {
        if (!token.isCancellationRequested && this.testItemResolver.isHttpRegionTestItem(item)) {
          await this.runTestItem(item, {
            testRun,
            testItems,
            token,
          });
        } else {
          testRun.skipped(item);
        }
      }
    });
    await httpyac.utils.promiseQueue(getConfigSetting().testMaxConcurrency || 1, ...testFuncs);
    testRun.end();
  }

  private async resetEnvironmentIfNeeded() {
    const config = getConfigSetting();
    if (config.testResetEnvBeforeRun) {
      await this.storeController.reset();
    }
  }

  private async enqueuedTestItems(
    testItems: Array<vscode.TestItem>,
    testRun: vscode.TestRun
  ): Promise<Array<Array<vscode.TestItem>>> {
    const result: Array<Array<vscode.TestItem>> = [];
    for (const testItem of testItems) {
      if (this.testItemResolver.isHttpRegionTestItem(testItem)) {
        testRun.enqueued(testItem);
        result.push([testItem]);
      } else if (this.testItemResolver.isHttpFileItem(testItem)) {
        const childTestItems = await this.testItemResolver.resolveTestItemChildren(testItem);
        for (const childTestItem of childTestItems) {
          testRun.enqueued(childTestItem);
        }
        result.push(childTestItems);
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
      sendContext.logResponse = async (response, httpRegion) => {
        await tmpLogResponse?.(response, httpRegion);
      };
      sendContext.variables = {
        TEST_RUNNER: true,
      };
      try {
        await this.documentStore.send(sendContext);
        const testResults = sendContext.httpRegion?.testResults;

        if (!testResults || testResults.every(obj => !obj.error)) {
          testRunContext.testRun.passed(testItem, duration());
        } else if (sendContext.httpRegion.metaData.disabled) {
          testRunContext.testRun.skipped(testItem);
        } else {
          testRunContext.testRun.failed(
            testItem,
            testResults.reduce((prev, obj) => {
              if (!obj.result) {
                prev.push(new vscode.TestMessage(obj.message));
                if (obj.error) {
                  prev.push(new vscode.TestMessage(obj.error.displayMessage));
                }
              }
              return prev;
            }, [] as Array<vscode.TestMessage>),
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
        activeEnvironment: config.testRunAlwaysUseEnv || this.documentStore.getActiveEnvironment(httpFile),
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
          if (response) {
            await this.responseStore.add(response, httpRegion);
          }
        };
      }
      return context;
    }
    return undefined;
  }
}
