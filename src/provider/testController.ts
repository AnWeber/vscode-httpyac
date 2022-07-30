import * as vscode from 'vscode';
import { allHttpDocumentSelector, getConfigSetting } from '../config';
import * as httpyac from 'httpyac';
import { DocumentStore } from '../documentStore';
import * as utils from '../utils';
import { basename } from 'path';
import { ResponseStore } from '../responseStore';

enum TestResult {
  PASSED,
  FAILED,
  SKIPPED,
  ERROR,
}

interface TestRunContext {
  testItem: vscode.TestItem;
  testRun: vscode.TestRun;
  token: vscode.CancellationToken;
  duration?: () => number;
  isRoot?: boolean;
}

export class TestController extends utils.DisposeProvider {
  private testController: vscode.TestController;
  private items: Array<vscode.TestItem> = [];

  constructor(private readonly documentStore: DocumentStore, private readonly responseStore: ResponseStore) {
    super();

    this.testController = vscode.tests.createTestController('httpYacTests', 'httpYac Tests');
    this.testController.createRunProfile('Run', vscode.TestRunProfileKind.Run, this.runHandler.bind(this));
    this.testController.resolveHandler = this.resolveHandler.bind(this);

    this.subscriptions = [
      vscode.workspace.onDidDeleteFiles(async event => {
        event.files.forEach(async filePath => {
          this.testController.items.delete(filePath.toString());
        });
      }),
      vscode.workspace.onDidRenameFiles(async fileRenameEvent => {
        fileRenameEvent.files.forEach(async file => {
          this.testController.items.delete(file.oldUri.toString());
          const renamedfile = await vscode.workspace.openTextDocument(file.newUri);
          const renamedHttpFile = await documentStore.getHttpFile(renamedfile);
          if (renamedHttpFile) {
            // TODO AW missing update
            // this.addHttpFileToTestExplorer(renamedHttpFile);
          }
        });
      }),
      this.testController,
    ];
  }

  private async resolveHandler(testItem: vscode.TestItem | undefined) {
    try {
      if (testItem?.uri && (await vscode.workspace.fs.stat(testItem.uri)).type === vscode.FileType.File) {
        const itemUri = testItem.uri;
        if (itemUri) {
          const httpFile = await this.documentStore.getOrCreate(
            itemUri,
            () => httpyac.io.fileProvider.readFile(itemUri, 'utf-8'),
            0
          );
          this.addHttpFileToTestExplorer(httpFile, testItem);
        }
      } else {
        for (const file of await this.loadAllHttpFilesInWorkspace()) {
          this.addHttpUriToTestExplorer(file);
        }
      }
    } catch (err) {
      httpyac.io.log.error(err);
      if (testItem) {
        testItem.error = httpyac.utils.toString(err);
      }
    }
  }

  private addHttpUriToTestExplorer(file: vscode.Uri) {
    const uris = this.getAllUrisToWorkspaceRoot(file);

    let parent: vscode.TestItem | undefined;
    for (const uri of uris.reverse()) {
      let testItem = this.items.find(obj => obj.id === uri.toString());
      if (!testItem) {
        testItem = this.testController.createTestItem(uri.toString(), basename(uri.toString()), uri);
        testItem.canResolveChildren = true;
        if (!parent) {
          this.testController.items.add(testItem);
        }
      }
      if (parent) {
        parent.children.add(testItem);
      }
      this.items.push(testItem);
      parent = testItem;
    }
  }

  private getAllUrisToWorkspaceRoot(file: vscode.Uri) {
    const workspaceRoot = vscode.workspace.getWorkspaceFolder(file);
    const result: Array<vscode.Uri> = [];

    if (workspaceRoot) {
      let current = file;
      while (current.toString() !== workspaceRoot?.uri.toString()) {
        result.push(current);
        current = vscode.Uri.joinPath(current, '..');
      }
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders?.length > 1) {
        result.push(workspaceRoot.uri);
      }
    } else {
      result.push(file);
    }
    return result;
  }

  private addHttpFileToTestExplorer(file: httpyac.HttpFile, parent: vscode.TestItem) {
    const fileUri = parent.uri;
    if (fileUri) {
      file.httpRegions.forEach(httpRegion => {
        if (!httpyac.utils.isGlobalHttpRegion(httpRegion)) {
          const testItem = this.testController.createTestItem(
            `${fileUri.toString()}#region#${httpRegion.symbol.startLine}`,
            httpRegion.symbol.name,
            fileUri
          );
          const requestLine =
            httpRegion.symbol.children?.find(obj => obj.kind === httpyac.HttpSymbolKind.requestLine)?.startLine ||
            httpRegion.symbol.startLine;
          testItem.range = new vscode.Range(
            new vscode.Position(requestLine, 0),
            new vscode.Position(httpRegion.symbol.endLine, httpRegion.symbol.endOffset)
          );
          parent.children.add(testItem);
        }
      });
    }
  }

  private async runHandler(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
    const testRun = this.testController.createTestRun(request);
    const queue: Array<vscode.TestItem> = [];

    if (request.include) {
      queue.push(...request.include);
    } else {
      this.testController.items.forEach(testItem => queue.push(testItem));
    }
    for (const testItem of queue) {
      if (!request.exclude?.includes(testItem) && !token.isCancellationRequested) {
        await this.runTestItem({ testItem, testRun, token, isRoot: true });
      }
    }
    testRun.end();
  }

  private async runTestItem(testRunContext: TestRunContext): Promise<TestResult> {
    const { testItem, testRun } = testRunContext;
    if (testRunContext.token.isCancellationRequested) {
      return TestResult.SKIPPED;
    }
    const testStartTime = Date.now();
    testRunContext.duration = () => Date.now() - testStartTime;
    testRun.enqueued(testItem);
    testRun.started(testItem);

    if (testItem.canResolveChildren) {
      return await this.runTestItemFile(testRunContext);
    }
    if (testItem.uri) {
      return await this.runTestItemHttpRegion(testRunContext);
    }
    testRun.skipped(testItem);
    return TestResult.SKIPPED;
  }

  private async runTestItemFile(testRunContext: TestRunContext) {
    const { testItem, testRun } = testRunContext;
    if (testItem.children.size === 0) {
      await this.resolveHandler(testItem);
    }
    const testResults: Array<Promise<TestResult>> = [];
    testItem.children.forEach(async childTestItem => {
      testResults.push(this.runTestItem({ ...testRunContext, testItem: childTestItem, isRoot: false }));
    });
    const result = this.getTestResult(await Promise.all(testResults));
    if (result === TestResult.ERROR) {
      testRun.errored(testItem, new vscode.TestMessage('test errored'), testRunContext?.duration?.());
    } else if (result === TestResult.FAILED) {
      testRun.failed(testItem, new vscode.TestMessage('test failed'), testRunContext?.duration?.());
    } else if (result === TestResult.PASSED) {
      testRun.passed(testItem, testRunContext?.duration?.());
    } else {
      testRun.skipped(testItem);
    }
    return result;
  }

  private getTestResult(results: Array<TestResult>) {
    if (results.some(obj => obj === TestResult.ERROR)) {
      return TestResult.ERROR;
    }
    if (results.some(obj => obj === TestResult.FAILED)) {
      return TestResult.FAILED;
    }
    if (results.some(obj => obj === TestResult.PASSED)) {
      return TestResult.PASSED;
    }
    return TestResult.PASSED;
  }

  private async runTestItemHttpRegion(testRunContext: TestRunContext): Promise<TestResult> {
    const { testItem, testRun } = testRunContext;
    const sendContext = await this.getSendContext(testRunContext);
    if (sendContext && httpyac.utils.isHttpRegionSendContext(sendContext)) {
      try {
        const tmpLogResponse = sendContext.logResponse;
        let hasTestResponse = false;
        sendContext.logResponse = async (response, httpRegion) => {
          await tmpLogResponse?.(response, httpRegion);
          hasTestResponse = true;
        };
        await this.documentStore.send(sendContext);
        const testResults = sendContext.httpRegion?.testResults;

        if ((!testResults && hasTestResponse) || (testResults && testResults.every(obj => !obj.error))) {
          testRun.passed(testItem, testRunContext?.duration?.());
        } else if (sendContext.httpRegion.metaData.disabled) {
          testRun.skipped(testItem);
        } else {
          testRun.failed(
            testItem,
            testResults
              ? testResults.map(obj => new vscode.TestMessage(obj.message))
              : new vscode.TestMessage('no response received'),
            testRunContext?.duration?.()
          );
        }
        return TestResult.PASSED;
      } catch (err) {
        testRun.errored(
          testItem,
          new vscode.TestMessage(httpyac.utils.isError(err) ? err.message : `${err}`),
          testRunContext?.duration?.()
        );
        return TestResult.ERROR;
      }
    } else {
      testRun.skipped(testItem);
    }
    return TestResult.SKIPPED;
  }

  private async getSendContext(
    testRunContext: TestRunContext
  ): Promise<httpyac.HttpFileSendContext | httpyac.HttpRegionSendContext | undefined> {
    const { testItem, token } = testRunContext;
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
        isCanceled: () => token.isCancellationRequested,
        register: (event: () => void) => {
          const dispose = token.onCancellationRequested(event);
          return () => dispose.dispose();
        },
      };
      if (testRunContext.isRoot) {
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

  private async loadAllHttpFilesInWorkspace(): Promise<Array<vscode.Uri>> {
    const uris: Array<vscode.Uri> = [];
    for (const fileType of allHttpDocumentSelector) {
      if (fileType.pattern) {
        for (const file of await this.findNonIgnoredFiles(fileType.pattern)) {
          uris.push(file);
        }
      }
    }
    return uris;
  }

  private async findNonIgnoredFiles(pattern: vscode.GlobPattern) {
    const exclude = [
      ...Object.keys((await vscode.workspace.getConfiguration('search', null).get('exclude')) || {}),
      ...Object.keys((await vscode.workspace.getConfiguration('files', null).get('exclude')) || {}),
    ].join(',');

    return await vscode.workspace.findFiles(pattern, `{${exclude}}`);
  }
}
