import * as vscode from 'vscode';
import { allHttpDocumentSelector } from '../../config';
import * as httpyac from 'httpyac';
import { DocumentStore } from '../../documentStore';
import * as utils from '../../utils';
import { basename } from 'path';
import { ResponseStore } from '../../responseStore';
import { TestRunner } from './testRunner';

export class TestController extends utils.DisposeProvider {
  private testController: vscode.TestController;
  private items: Array<vscode.TestItem> = [];

  constructor(private readonly documentStore: DocumentStore, private readonly responseStore: ResponseStore) {
    super();

    this.testController = vscode.tests.createTestController('httpYacTests', 'httpYac Tests');
    this.testController.resolveHandler = this.resolveHandler.bind(this);

    const testRunner = new TestRunner(this.documentStore, this.responseStore);
    this.testController.createRunProfile('Run', vscode.TestRunProfileKind.Run, (request: vscode.TestRunRequest, token: vscode.CancellationToken) {
    const testItems: Array<vscode.TestItem> = await this.getRequestedTestItems(request);
    const testRun = this.testController.createTestRun(request);
    await testRunner.run(testRun, testItems, token);
    testRun.end();
  });

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

  private async resolveTestItemsDeep(testItem: vscode.TestItem) {
    if (testItem.canResolveChildren) {
      if (testItem.children.size === 0) {
        await this.resolveHandler(testItem);
      }
      const children: Array<vscode.TestItem> = [];
      testItem.children.forEach(obj => children.push(obj));
      for (const child of children) {
        await this.resolveTestItemsDeep(child);
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

  private async getRequestedTestItems(request: vscode.TestRunRequest) {
    let testItems: Array<vscode.TestItem> = [];
    if (request.include) {
      testItems.push(...request.include);
    } else {
      this.testController.items.forEach(testItem => testItems.push(testItem));
    }
    if (request.exclude) {
      testItems = testItems.filter(testItem => !request.exclude?.includes(testItem));
    }
    for (const testItem of testItems) {
      await this.resolveTestItemsDeep(testItem);
    }
    return testItems;
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
