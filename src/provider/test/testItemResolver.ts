import { DisposeProvider } from '../../utils';
import * as vscode from 'vscode';
import { DocumentStore } from '../../documentStore';
import * as httpyac from 'httpyac';
import { basename } from 'path';
import { getConfigSetting } from '../../config';
import { toUri } from '../../io';
import { TestTagResolver } from './testTagResolver';
import { TestItemKind, isFolderTestItem, parseTestItemId } from './testItemKind';

export class TestItemResolver extends DisposeProvider {
  private items: Array<vscode.TestItem> = [];
  private testTagResolver = new TestTagResolver();
  constructor(
    private readonly testController: vscode.TestController,
    private readonly documentStore: DocumentStore
  ) {
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
      vscode.workspace.onDidChangeTextDocument(async editor => {
        await this.onDidChangeUri(editor.document.uri);
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
      const testItem = this.createFileTestItem(document.uri);
      const httpFile = await this.documentStore.getHttpFile(document);
      if (httpFile) {
        this.createHttpFileTestItem(httpFile, testItem);
      }
    }
  }

  private initFilesystemWatcher() {
    const testItemExtensions = this.getTestItemExtensions();

    const fsWatcher = vscode.workspace.createFileSystemWatcher(`**/*.{${testItemExtensions.join(',')}}`);
    fsWatcher.onDidCreate(async uri => {
      if (this.isFlattendedTestHiearchy()) {
        await this.refreshTestItems();
      } else {
        const testItem = this.createFileTestItem(uri);
        const httpFile = await this.documentStore.getWithUri(uri);
        this.createHttpFileTestItem(httpFile, testItem);
      }
    });
    fsWatcher.onDidChange(async uri => {
      await this.onDidChangeUri(uri);
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

  private async onDidChangeUri(uri: vscode.Uri) {
    const testItem = this.findFileTestItem(uri);
    if (testItem) {
      const testItem = this.createFileTestItem(uri);
      const httpFile = await this.documentStore.getWithUri(uri);
      this.createHttpFileTestItem(httpFile, testItem);
    }
  }

  private hasTestItemExtension(documentOrUri: vscode.TextDocument | vscode.Uri) {
    let uri: vscode.Uri;
    if (!(documentOrUri instanceof vscode.Uri)) {
      uri = documentOrUri.uri;
    } else {
      uri = documentOrUri;
    }
    const filename = uri?.toString();
    return this.getTestItemExtensions().some(ext => filename.endsWith(`.${ext}`));
  }

  private getTestItemExtensions() {
    const config = getConfigSetting();
    return config.testItemExtensions || ['http', 'rest'];
  }

  public async refreshTestItems() {
    await this.resolveTestItems();
  }

  public async resolveTestItems(testItem?: vscode.TestItem | undefined) {
    try {
      if (testItem) {
        await this.resolveTestItemChildren(testItem);
      } else {
        const files = await vscode.workspace.findFiles(`**/*.{${this.getTestItemExtensions().join(',')}}`, undefined);
        this.testController.items.replace([]);
        this.items.length = 0;

        const promises = [];
        for (const uri of files) {
          const testItem = this.createFileTestItem(uri);

          if (testItem.children.size === 0) {
            promises.push(this.loadTagsForHttpFile(testItem));
          }
        }
        this.checkForFlattendFileSystem();
        await Promise.all(promises);
      }
    } catch (err) {
      httpyac.io.log.error(err);
      if (testItem) {
        testItem.error = httpyac.utils.toString(err);
      }
    }
  }

  public async loadTagsForHttpFile(testItem: vscode.TestItem) {
    if (testItem.uri) {
      const text = await httpyac.io.fileProvider.readFile(testItem.uri, 'utf-8');
      if (text.includes('@tag')) {
        const httpFile = await this.documentStore.getOrCreate(testItem.uri, () => Promise.resolve(text), 0);
        if (httpFile) {
          this.createHttpFileTestItem(httpFile, testItem);
        }
      }
    }
  }

  public async resolveTestItemChildren(testItem: vscode.TestItem) {
    const item = parseTestItemId(testItem.id);
    if (item.kind === TestItemKind.file && testItem.children.size === 0) {
      const itemUri = testItem.uri;
      if (itemUri) {
        const httpFile = await this.documentStore.getWithUri(itemUri);
        this.createHttpFileTestItem(httpFile, testItem);
      }
    }
    return this.getChildren(testItem);
  }

  private createFileTestItem(file: vscode.Uri): vscode.TestItem {
    const workspaceRoot = vscode.workspace.getWorkspaceFolder(file) || { name: 'httpyac Tests', uri: file };
    const workspaceTestItem = this.createTestItem(
      TestItemKind.workspace,
      `${workspaceRoot.name} (httpYac)`,
      workspaceRoot.uri
    );
    this.testController.items.add(workspaceTestItem);
    const testItem = this.createTestItem(TestItemKind.file, basename(file.toString(true)), file);
    testItem.canResolveChildren = true;
    const parent = this.getParentTestItem(file, workspaceTestItem);
    parent.children.add(testItem);

    const httpFile = this.documentStore.get(file);
    if (httpFile) {
      this.createHttpFileTestItem(httpFile, testItem);
    }

    return testItem;
  }

  private getFoldersUntilRoot(current: vscode.Uri, rootUri: vscode.Uri | undefined): Array<vscode.Uri> {
    const next = vscode.Uri.joinPath(current, '..');
    if (!httpyac.utils.equalsPath(next, rootUri) && !httpyac.utils.equalsPath(next, current)) {
      return [...this.getFoldersUntilRoot(next, rootUri), next];
    }

    return [];
  }
  private getParentTestItem(entry: vscode.Uri, workspaceTestItem: vscode.TestItem) {
    const folders = this.getFoldersUntilRoot(entry, workspaceTestItem.uri);
    if (folders.length === 0) {
      return workspaceTestItem;
    }
    if (getConfigSetting().testHiearchy === 'flat') {
      const folderUri = folders[folders.length - 1];
      if (folderUri) {
        const folderTestItem = this.createTestItem(
          TestItemKind.folder,
          folders.map(folderUri => basename(folderUri.path)).join('/'),
          folderUri
        );
        workspaceTestItem.children.add(folderTestItem);
        return folderTestItem;
      }
    } else {
      let parentFolder: vscode.TestItem = workspaceTestItem;
      for (const folderUri of folders) {
        const folderTestItem = this.createTestItem(TestItemKind.folder, basename(folderUri.path), folderUri);
        parentFolder.children.add(folderTestItem);
        parentFolder = folderTestItem;
      }
      return parentFolder;
    }
    return workspaceTestItem;
  }

  private checkForFlattendFileSystem() {
    if (this.isFlattendedTestHiearchy()) {
      const folderTestItems = this.items.filter(item => isFolderTestItem(item));
      for (const folder of folderTestItems) {
        if (folder.children.size === 1 && folder.parent) {
          const parent = folder.parent;
          folder.children.forEach(child => {
            child.label = `${folder.label}/${child.label}`;
            parent.children.add(child);
          });
          parent.children.delete(folder.id);
        }
      }
    }
  }

  private isFlattendedTestHiearchy() {
    return getConfigSetting().testHiearchy === 'flattened';
  }

  private createHttpFileTestItem(httpFile: httpyac.HttpFile, parent: vscode.TestItem) {
    const fileUri = toUri(httpFile.fileName);
    if (fileUri) {
      const items: Array<vscode.TestItem> = [];
      for (const httpRegion of httpFile.httpRegions) {
        if (!httpRegion.isGlobal()) {
          const testItem = this.createTestItem(TestItemKind.httpRegion, httpRegion.symbol.name, fileUri, httpRegion.id);
          const requestLine =
            httpRegion.symbol.children?.find(obj => obj.kind === httpyac.HttpSymbolKind.requestLine)?.startLine ||
            httpRegion.symbol.startLine;
          testItem.range = new vscode.Range(
            new vscode.Position(requestLine, 0),
            new vscode.Position(httpRegion.symbol.endLine, httpRegion.symbol.endOffset)
          );
          if (typeof httpRegion.metaData?.tag === 'string') {
            testItem.tags = httpRegion.metaData.tag
              ?.split(',')
              .map(t => this.testTagResolver.getOrCreateTestTag(t.trim()));
          }
          items.push(testItem);
        }
      }
      parent.children.replace(items);
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

  private findFileTestItem(uri: vscode.Uri) {
    return this.items.find(obj => obj.canResolveChildren && httpyac.utils.equalsPath(obj.uri, uri));
  }

  private createTestItem(kind: TestItemKind, label: string, uri: vscode.Uri, idPart?: string) {
    const id = this.createId(kind, uri, idPart);
    let item = this.items.find(obj => obj.id === id);

    if (item && !httpyac.utils.equalsPath(item?.uri, uri)) {
      httpyac.io.log.error(`item ${id} already exists with other url`);
      httpyac.io.log.error(`${uri} <> ${item.uri}`);
    }
    if (!item) {
      item = this.testController.createTestItem(id, label, uri);
      this.items.push(item);
    }
    item.label = label;
    return item;
  }

  private createId(kind: TestItemKind, uri: vscode.Uri, idPart?: string) {
    const safeUri = httpyac.utils.replaceInvalidChars(uri?.toString());
    if (idPart) {
      return `${kind}|${safeUri}|${idPart}`;
    }
    return `${kind}|${safeUri}`;
  }

  private getChildren(testItem: vscode.TestItem): Array<vscode.TestItem> {
    const children: Array<vscode.TestItem> = [];
    testItem.children.forEach(child => children.push(child));
    return children;
  }
}
