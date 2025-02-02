import { ResponseStore } from '../../responseStore';
import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DocumentStore } from '../../documentStore';
import { getConfigSetting } from '../../config';
import { TestItemResolver } from './testItemResolver';
import { StoreController } from '../storeController';
import { logTestRun } from './testRunOutput';
import { isHttpFileItem, isHttpRegionTestItem } from './testItemKind';
import { resetBail } from '../../plugin';
import { resetOutputChannel, toUri } from '../../io';

interface TestRunContext {
  testRun: vscode.TestRun;
  testItems: Array<vscode.TestItem>;
  token: vscode.CancellationToken;
  processedHttpRegions: Array<httpyac.ProcessedHttpRegion>;
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
    resetOutputChannel();
    const testRun = this.testController.createTestRun(request);
    const testItems: Array<vscode.TestItem> = await this.testItemResolver.resolveTestItemsForRequest(request);

    const testStartTime = Date.now();
    const duration = () => Date.now() - testStartTime;
    const disposeHttpRegionExecuted = this.documentStore.httpRegionExecuted(({ httpRegion, httpFile }) => {
      const fileUri = toUri(httpFile.fileName);
      if (fileUri) {
        this.setTestResult(
          httpRegion,
          testRun,
          this.testItemResolver.getTestItemForHttpRegion(httpRegion, fileUri),
          duration
        );
      }
    });

    try {
      await this.resetEnvironmentIfNeeded();
      const processedHttpRegions: Array<httpyac.ProcessedHttpRegion> = [];
      const testFuncs = (await this.enqueuedTestItems(testItems, testRun)).map(items => async () => {
        for (const item of items) {
          if (!token.isCancellationRequested && isHttpRegionTestItem(item)) {
            await this.runTestItem(
              item,
              {
                testRun,
                testItems,
                token,
                processedHttpRegions,
              },
              duration
            );
          } else {
            testRun.skipped(item);
          }
        }
      });
      const repeatTimes = getConfigSetting().testRunRepeatTimes || 1;
      for (let index = 0; index < repeatTimes; index++) {
        await httpyac.utils.promiseQueue(getConfigSetting().testMaxConcurrency || 1, ...testFuncs);
      }
      logTestRun(processedHttpRegions);
      testRun.end();
      resetBail();
    } finally {
      disposeHttpRegionExecuted.dispose();
    }
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
      if (isHttpRegionTestItem(testItem)) {
        testRun.enqueued(testItem);
        result.push([testItem]);
      } else if (isHttpFileItem(testItem)) {
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

  private async runTestItem(
    testItem: vscode.TestItem,
    testRunContext: TestRunContext,
    duration: () => number
  ): Promise<void> {
    testRunContext.testRun.started(testItem);
    const sendContext = await this.getSendContext(testItem, testRunContext);
    if (
      sendContext &&
      httpyac.utils.isHttpRegionSendContext(sendContext) &&
      !sendContext.httpRegion.metaData.disabled &&
      !sendContext.httpRegion.metaData.testDisabled
    ) {
      try {
        await this.documentStore.send(sendContext);
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

  private setTestResult(
    httpRegion: httpyac.HttpRegion,
    testRun: vscode.TestRun,
    testItem: vscode.TestItem,
    duration: () => number
  ) {
    const testResults = httpRegion?.testResults;

    if (testResults?.some(t => t.status === httpyac.TestResultStatus.ERROR)) {
      const testResult = testResults?.find(t => t.status === httpyac.TestResultStatus.ERROR);
      testRun.errored(testItem, new vscode.TestMessage(testResult?.message || ''), duration());
    } else if (testResults?.find(t => t.status === httpyac.TestResultStatus.SKIPPED)) {
      testRun.skipped(testItem);
    } else if (!testResults || testResults.every(t => t.status === httpyac.TestResultStatus.SUCCESS)) {
      testRun.passed(testItem, duration());
    } else {
      testRun.failed(
        testItem,
        testResults.reduce((prev, obj) => {
          if (obj.status !== httpyac.TestResultStatus.SUCCESS) {
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
  }

  private async getSendContext(
    testItem: vscode.TestItem,
    testRunContext: TestRunContext
  ): Promise<httpyac.HttpFileSendContext | httpyac.HttpRegionSendContext | undefined> {
    if (testItem.uri) {
      const config = getConfigSetting();

      const testItemUri = testItem.uri;
      const httpFile = await this.documentStore.getWithUri(testItemUri);
      const line = testItem.range?.start.line || 0;
      const httpRegion = httpFile.httpRegions.find(obj => obj.symbol.startLine <= line && obj.symbol.endLine >= line);
      const context: httpyac.HttpFileSendContext | httpyac.HttpRegionSendContext = {
        activeEnvironment: config.testRunAlwaysUseEnv || this.documentStore.getActiveEnvironment(httpFile),
        httpFile,
        httpRegion,
        variables: {
          TEST_RUNNER: true,
        },
        processedHttpRegions: testRunContext.processedHttpRegions,
      };
      context.progress = {
        divider: 1,
        isCanceled: () => testRunContext.testRun.token.isCancellationRequested,
        register: (event: () => void) => {
          const dispose = testRunContext.testRun.token.onCancellationRequested(event);
          return () => dispose.dispose();
        },
      };

      context.scriptConsole = new httpyac.io.Logger({
        level: httpyac.LogLevel.trace,
        logMethod(level, ...params: unknown[]) {
          testRunContext.testRun.appendOutput('\r\n', undefined, testItem);
          testRunContext.testRun.appendOutput(
            `${toLevelString(level)} ${params.map(p => httpyac.utils.toString(p)).join(' ')}`,
            undefined,
            testItem
          );
        },
      });
      const hasOnlyOneTestItem = testRunContext.testItems.indexOf(testItem) >= 0;

      const testRunContextLogResponse = httpyac.utils.requestLoggerFactory(
        (arg: string) => {
          testRunContext.testRun.appendOutput('\r\n', undefined, testItem);
          testRunContext.testRun.appendOutput(arg, undefined, testItem);
        },
        { useShort: true }
      );
      context.logResponse = async (response, httpRegion) => {
        testRunContextLogResponse(response, httpRegion);
        if (response) {
          await this.responseStore.add(response, httpRegion, hasOnlyOneTestItem);
        }
      };
      if (hasOnlyOneTestItem) {
        context.logStream = async (_type, response) => {
          if (config.addStreamingResponsesToHistory) {
            await this.responseStore.add(response, undefined, false);
          }
        };
      }

      return context;
    }
    return undefined;
  }
}
function toLevelString(level: httpyac.LogLevel) {
  switch (level) {
    case httpyac.LogLevel.trace:
      return 'TRACE';
    case httpyac.LogLevel.debug:
      return 'DEBUG';
    case httpyac.LogLevel.warn:
      return 'WARN';
    case httpyac.LogLevel.error:
      return 'ERROR';
    default:
      return 'INFO';
  }
}
