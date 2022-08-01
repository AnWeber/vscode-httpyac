import { DisposeProvider } from '../../utils';
import * as vscode from 'vscode';
import { DocumentStore } from '../../documentStore';
import * as httpyac from 'httpyac';
import { basename } from 'path';
import { allHttpDocumentSelector } from '../../config';

enum TestItemKind {
  httpRegion = 'httpRegion',
  file = 'file',
  folder = 'folder',
  workspace = 'workspace',
}

export class TestItemResolver extends DisposeProvider {
  private items: Array<vscode.TestItem> = [];
  constructor(private readonly testController: vscode.TestController, private readonly documentStore: DocumentStore) {
    super();
  }

  public async resolveTestItems(testItem: vscode.TestItem | undefined) {
    try {
      if (testItem) {
        await this.resolveTestItemChildren(testItem);
      } else {
        for (const file of await this.loadAllHttpFilesInWorkspace()) {
          this.createFileTestItem(file);
        }
      }
    } catch (err) {
      httpyac.io.log.error(err);
      if (testItem) {
        testItem.error = httpyac.utils.toString(err);
      }
    }
  }

  public async resolveTestItemChildren(testItem: vscode.TestItem) {
    const item = this.parseId(testItem.id);
    if (item.kind === TestItemKind.file && testItem.children.size === 0) {
      const itemUri = testItem.uri;
      if (itemUri) {
        const httpFile = await this.documentStore.getOrCreate(
          itemUri,
          () => httpyac.io.fileProvider.readFile(itemUri, 'utf-8'),
          0
        );
        this.createHttpFileTestItem(httpFile, testItem);
      }
    }
  }

  private createFileTestItem(file: vscode.Uri) {
    const parent = this.getParentTestItem(file);
    const testItem = this.createTestItem(TestItemKind.file, basename(file.toString()), file);
    parent.children.add(testItem);
  }

  private getParentTestItem(file: vscode.Uri) {
    const workspaceRoot = vscode.workspace.getWorkspaceFolder(file) || { name: 'httpyac Tests', uri: file };
    const workspaceTestItem = this.createTestItem(
      TestItemKind.workspace,
      `${workspaceRoot.name} (http)`,
      workspaceRoot.uri
    );
    this.testController.items.add(workspaceTestItem);

    const folder = vscode.Uri.joinPath(file, '..').toString().replace(workspaceRoot.uri.toString(), '');
    if (folder) {
      const folderTestItem = this.createTestItem(TestItemKind.folder, folder);
      workspaceTestItem.children.add(folderTestItem);
      return folderTestItem;
    }
    return workspaceTestItem;
  }

  private createHttpFileTestItem(file: httpyac.HttpFile, parent: vscode.TestItem) {
    const fileUri = parent.uri;
    if (fileUri) {
      file.httpRegions.forEach(httpRegion => {
        if (!httpyac.utils.isGlobalHttpRegion(httpRegion)) {
          const testItem = this.createTestItem(TestItemKind.httpRegion, httpRegion.symbol.name, fileUri);
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

  public async resolveTestItemsForRequest(request: vscode.TestRunRequest) {
    let testItems: Array<vscode.TestItem> = [];
    if (request.include) {
      testItems.push(...request.include);
    } else {
      this.testController.items.forEach(testItem => testItems.push(testItem));
    }
    if (request.exclude) {
      testItems = testItems.filter(testItem => !request.exclude?.includes(testItem));
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

  private createTestItem(kind: TestItemKind, label: string, uri?: vscode.Uri) {
    const id = `${kind}|${uri ? uri.toString() : label}`;
    let item = this.items.find(obj => obj.id === id);
    if (!item) {
      item = this.testController.createTestItem(id, label, uri);
      item.canResolveChildren = kind !== TestItemKind.httpRegion;
      this.items.push(item);
    }
    return item;
  }

  private parseId(id: string) {
    const [kindString, identifier] = id.split('|');
    return {
      kind: this.toKind(kindString),
      identifier,
    };
  }

  private toKind(kind: string) {
    if (kind === 'httpRegion') {
      return TestItemKind.httpRegion;
    }
    if (kind === 'file') {
      return TestItemKind.file;
    }
    if (kind === 'folder') {
      return TestItemKind.folder;
    }
    return TestItemKind.workspace;
  }
}
