import * as vscode from 'vscode';
import { allHttpDocumentSelector } from '../config';
import * as httpyac from 'httpyac';
import { toUri } from '../io';
import { DocumentStore } from '../documentStore';
import * as utils from '../utils';

export class TestController extends utils.DisposeProvider {
  private testController = vscode.tests.createTestController('httpYacTests', 'httpYac Tests');
  private testData = new WeakMap<vscode.TestItem, httpyac.HttpRegionSendContext>();

  constructor(private readonly documentStore: DocumentStore) {
    super();

    this.subscriptions = [
      vscode.workspace.onDidChangeTextDocument(async event => {
        if (event.contentChanges.length > 0) {
          if (vscode.languages.match(allHttpDocumentSelector, event.document)) {
            const changedHttpFile = await documentStore.getHttpFile(event.document);
            if (changedHttpFile) {
              this.addHttpFileToTestExplorer(changedHttpFile);
            }
          }
        }
      }),
      vscode.workspace.onDidCreateFiles(async event => {
        event.files.forEach(async filePath => {
          const file = await vscode.workspace.openTextDocument(filePath);
          if (vscode.languages.match(allHttpDocumentSelector, file)) {
            const createdHttpFile = await documentStore.getHttpFile(file);
            if (createdHttpFile) {
              this.addHttpFileToTestExplorer(createdHttpFile);
            }
          }
        });
      }),
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
            this.addHttpFileToTestExplorer(renamedHttpFile);
          }
        });
      }),
    ];

    // when opening the test explorer read all the file that apply to allHttpDocumentSelector in the workspace.
    // Then add them to the test explorer window.
    this.testController.resolveHandler = async () => {
      await documentStore
        .loadAllHttpFilesInWorkspace()
        .then(() => documentStore.getAll().forEach(val => this.addHttpFileToTestExplorer(val)));
    };
  }

  private addHttpFileToTestExplorer(file: httpyac.HttpFile) {
    if (vscode.workspace.workspaceFolders) {
      for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        // Check if file belongs to current workspace, to use the relative path as root display label
        if (file.fileName.toString().includes(workspaceFolder.uri.toString())) {
          const relativePath = file.fileName.toString().replace(workspaceFolder.uri.toString(), '');

          // Add the root of the test.
          // In this case it's the file itself.
          const root = this.testController.createTestItem(file.fileName.toString(), relativePath, toUri(file.fileName));

          // Add all the regions in the file.
          file.httpRegions.forEach(child => {
            const region = this.testController.createTestItem(
              child.symbol.name,
              child.symbol.name,
              toUri(file.fileName)
            );

            // If you open the file from the test explorer, this range will determin where to be in the file.
            region.range = new vscode.Range(
              new vscode.Position(child.symbol.startLine, 0),
              new vscode.Position(child.symbol.endLine, 0)
            );

            this.testData.set(region, { httpFile: file, httpRegion: child });

            root.children.add(region);
          });
          this.testController.items.add(root);
        }
      }
    }
  }

  // Creates a run profile, this allows you to run the tests from the explorer.
  runProfile = this.testController.createRunProfile('Run', vscode.TestRunProfileKind.Run, (request, token) => {
    this.runHandler(request, token);
  });

  private async runHandler(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
    const run = this.testController.createTestRun(request);
    const queue: vscode.TestItem[] = [];

    // Run specific a test or all know test by the contoller
    if (request.include) {
      request.include.forEach(test => queue.push(test));
    } else {
      this.testController.items.forEach(test => queue.push(test));
    }

    while (queue.length > 0 && !token.isCancellationRequested) {
      const test = queue.pop();
      if (test) {
        // Skip tests the user asked to exclude
        if (request.exclude?.includes(test)) {
          continue;
        }

        const testStartTime = Date.now();
        const httpRegionSendContext = this.testData.get(test);
        if (httpRegionSendContext !== undefined) {
          // Send the request, and wait for the result.
          await this.documentStore.send(httpRegionSendContext);
          const httpregionResult = httpRegionSendContext.httpRegion;
          if (httpregionResult !== undefined) {
            const testResults = httpregionResult.testResults;
            // If there where no testResults than the request did not have any tests.
            if (testResults !== undefined) {
              if (testResults.every(x => x.result === true)) {
                run.passed(test, Date.now() - testStartTime);
              } else {
                run.failed(
                  test,
                  new vscode.TestMessage(this.failedTestOutput(testResults)),
                  Date.now() - testStartTime
                );
              }
            } else {
              run.skipped(test);
            }
          }
        }

        test.children.forEach(test => queue.push(test));
      }
    }

    run.end();
  }

  private failedTestOutput(testResults: httpyac.TestResult[]): string {
    let outputString = 'Test Failed on:';
    testResults.forEach(x => {
      if (x.error) {
        outputString = outputString.concat('\n\t', x.error.error.message);
      }
    });
    return outputString;
  }
}
