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

    this.initOpenEditors();

    this.subscriptions = [
      this.initFilesystemWatcher(),
      vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
        await this.createDocumentTestItem(document);
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        await this.refreshTestItems();
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

  private async initOpenEditors() {
    for (const editor of vscode.window.visibleTextEditors) {
      this.createDocumentTestItem(editor.document);
    }
  }
  private async createDocumentTestItem(document: vscode.TextDocument) {
    if (this.hasTestItemExtension(document)) {
      const httpFile = await this.documentStore.getHttpFile(document);
      this.createFileTestItem(document.uri, httpFile);
    }
  }

  private initFilesystemWatcher() {
    const testItemExtensions = this.getTestItemExtensions();

    const fsWatcher = vscode.workspace.createFileSystemWatcher(`**/*.{${testItemExtensions.join(',')}}`);
    fsWatcher.onDidCreate(async uri => {
      const httpFile = await this.documentStore.getOrCreate(
        uri,
        async () => await httpyac.io.fileProvider.readFile(uri, 'utf-8'),
        0
      );
      this.createFileTestItem(uri, httpFile);
    });
    fsWatcher.onDidChange(async uri => {
      const testItem = this.findFileTestItem(uri);
      if (testItem) {
        testItem.children.replace([]);
        const httpFile = await this.documentStore.getOrCreate(
          uri,
          async () => await httpyac.io.fileProvider.readFile(uri, 'utf-8'),
          0
        );
        this.createFileTestItem(uri, httpFile);
      }
    });
    fsWatcher.onDidDelete(async uri => {
      const testItems = this.items.filter(
        obj => obj.canResolveChildren && obj.uri?.toString().startsWith(uri.toString())
      );
      if (testItems.length > 0) {
        await this.refreshTestItems();
      }
    });
    return fsWatcher;
  }

  private hasTestItemExtension(documentOrUri: vscode.TextDocument | vscode.Uri) {
    let uri: vscode.Uri;
    if (!(documentOrUri instanceof vscode.Uri)) {
      uri = documentOrUri.uri;
    } else {
      uri = documentOrUri;
    }
    return this.getTestItemExtensions().some(ext => uri?.toString().endsWith(`.${ext}`));
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
    const parent =
      getConfigSetting().testNestedHiearchy === true
        ? this.getParentTestItemRecursively(file)
        : this.getParentTestItem(file);
    const testItem = this.createTestItem(TestItemKind.file, basename(file.toString(true)), file);
    testItem.canResolveChildren = true;
    parent.children.add(testItem);

    const httpFileParsed = httpFile || this.documentStore.get(file);
    if (httpFileParsed) {
      this.createHttpFileTestItem(httpFileParsed, testItem);
    }
  }
  private getParentTestItemRecursively(entry: vscode.Uri) {
    const folder = vscode.Uri.joinPath(entry, '..');

    if (folder.path === '/' || folder.path === vscode.workspace.getWorkspaceFolder(folder)?.uri.path) {
      const workspaceRoot = vscode.workspace.getWorkspaceFolder(folder) || { name: 'httpyac Tests', uri: folder };
      const workspaceTestItem = this.createTestItem(
        TestItemKind.workspace,
        `${workspaceRoot.name} (httpYac)`,
        workspaceRoot.uri
      );
      this.testController.items.add(workspaceTestItem);
      return workspaceTestItem;
    }

    const parent = this.getParentTestItemRecursively(folder);
    const label = folder.path.slice(folder.path.lastIndexOf('/') + 1);
    const testItem = this.createTestItem(TestItemKind.folder, label, folder);
    parent.children.add(testItem);
    return testItem;
  }

  private getParentTestItem(file: vscode.Uri) {
    const workspaceRoot = vscode.workspace.getWorkspaceFolder(file) || { name: 'httpyac Tests', uri: file };
    const workspaceTestItem = this.createTestItem(
      TestItemKind.workspace,
      `${workspaceRoot.name} (httpYac)`,
      workspaceRoot.uri
    );
    this.testController.items.add(workspaceTestItem);

    const folderUri = vscode.Uri.joinPath(file, '..');
    const folder = folderUri.toString(true).replace(workspaceRoot.uri.toString(true), '');
    if (folder) {
      const folderTestItem = this.createTestItem(TestItemKind.folder, folder, folderUri);
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
    return this.items.find(obj => obj.canResolveChildren && httpyac.utils.equalsPath(obj.uri, uri));
  }

  private createTestItem(kind: TestItemKind, label: string, uri: vscode.Uri) {
    const id = this.createId(kind, label, uri);
    let item = this.items.find(obj => obj.id === id);

    if (item && !httpyac.utils.equalsPath(item?.uri, uri)) {
      httpyac.io.log.error(`item ${id} already exists with other url`);
      httpyac.io.log.error(`${uri} <> ${item.uri}`);
    }
    if (!item) {
      item = this.testController.createTestItem(id, label, uri);
      this.items.push(item);
    }
    return item;
  }

  private createId(kind: TestItemKind, label: string, uri: vscode.Uri) {
    const safeUri = httpyac.utils.replaceInvalidChars(uri?.toString());
    if (kind === TestItemKind.httpRegion) {
      return `${kind}|${safeUri}|${httpyac.utils.replaceInvalidChars(label)}`;
    }
    return `${kind}|${safeUri}`;
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
