import { DisposeProvider } from '../../utils';
import * as vscode from 'vscode';
import { DocumentStore } from '../../documentStore';
import * as httpyac from 'httpyac';
import { basename } from 'path';
import { getConfigSetting } from '../../config';
import { toUri } from '../../io';

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

    this.subscriptions = [
      vscode.workspace.onDidChangeTextDocument(async evt => {
        if (evt.contentChanges.length > 0) {
          const testItemExtensions = this.getTestItemExtensions();
          const uri = toUri(evt.document.uri);
          if (uri && testItemExtensions.some(ext => uri.path.endsWith(`.${ext}`))) {
            const testItem = this.findFileTestItem(evt.document.uri);
            if (testItem) {
              const httpFile = await this.documentStore.getHttpFile(evt.document);
              testItem.children.replace([]);
              this.createFileTestItem(uri, httpFile);
            }
          }
        }
      }),
      vscode.workspace.onDidCreateFiles(async evt => {
        for (const file of evt.files) {
          const testItemExtensions = this.getTestItemExtensions();
          if (testItemExtensions.some(ext => file.path.endsWith(`.${ext}`))) {
            await this.refreshTestItems();
            break;
          }
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        await this.refreshTestItems();
      }),
      vscode.workspace.onDidDeleteFiles(async evt => {
        for (const file of evt.files) {
          const deletedFile = file.toString();
          const testItems = this.items.filter(
            obj => obj.canResolveChildren && obj.uri?.toString().startsWith(deletedFile)
          );
          if (testItems.length > 0) {
            await this.refreshTestItems();
            break;
          }
        }
      }),
      vscode.workspace.onDidRenameFiles(async evt => {
        for (const fileMove of evt.files) {
          const oldUriString = fileMove.oldUri.toString();
          const testItems = this.items.filter(
            obj => obj.canResolveChildren && obj.uri?.toString().startsWith(oldUriString)
          );
          if (testItems.length > 0) {
            await this.refreshTestItems();
            break;
          }
        }
      }),
    ];
  }

  private getTestItemExtensions() {
    const config = getConfigSetting();
    return config.testItemExtensions || ['http', 'rest'];
  }

  public async refreshTestItems() {
    this.testController.items.replace([]);
    this.items.length = 0;
    await this.resolveTestItems();
  }

  public async resolveTestItems(testItem?: vscode.TestItem | undefined) {
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
    return this.getChildren(testItem);
  }

  private createFileTestItem(file: vscode.Uri, httpFile?: httpyac.HttpFile) {
    const parent = this.getParentTestItem(file);
    const testItem = this.createTestItem(TestItemKind.file, basename(file.toString()), file);
    testItem.canResolveChildren = true;
    parent.children.add(testItem);

    const httpFileParsed = httpFile || this.documentStore.get(file);
    if (httpFileParsed) {
      this.createHttpFileTestItem(httpFileParsed, testItem);
    }
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

  private createHttpFileTestItem(httpFile: httpyac.HttpFile, parent: vscode.TestItem) {
    const fileUri = toUri(httpFile.fileName);
    if (fileUri) {
      for (const httpRegion of httpFile.httpRegions) {
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
      }
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
    const testItemExtensions = this.getTestItemExtensions();
    for (const file of await this.findNonIgnoredFiles(`**/*.{${testItemExtensions.join(',')}}`)) {
      httpyac.io.log.info(file.scheme);
      uris.push(file);
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

  private findFileTestItem(uri: vscode.Uri) {
    return this.items.find(obj => obj.canResolveChildren && obj.uri?.toString() === uri.toString());
  }

  private createTestItem(kind: TestItemKind, label: string, uri?: vscode.Uri) {
    const id = this.createId(kind, label, uri);
    let item = this.items.find(obj => obj.id === id);
    if (!item) {
      item = this.testController.createTestItem(id, label, uri);
      this.items.push(item);
    }
    return item;
  }

  private createId(kind: TestItemKind, label: string, uri?: vscode.Uri) {
    if (kind === TestItemKind.httpRegion) {
      return `${kind}|${label}`;
    }
    return `${kind}|${uri ? uri.toString() : label}`;
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

  public isHttpRegionTestItem(testItem: vscode.TestItem): boolean {
    return testItem.id.startsWith(`${TestItemKind.httpRegion}|`);
  }

  public isFileTestItem(testItem: vscode.TestItem): boolean {
    return testItem.id.startsWith(`${TestItemKind.file}|`);
  }

  private getChildren(testItem: vscode.TestItem): Array<vscode.TestItem> {
    const children: Array<vscode.TestItem> = [];
    testItem.children.forEach(child => children.push(child));
    return children;
  }
}
