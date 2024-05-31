import { TestItem } from 'vscode';

export enum TestItemKind {
  httpRegion = 'httpRegion',
  file = 'file',
  folder = 'folder',
  workspace = 'workspace',
}

export function isHttpRegionTestItem(testItem: TestItem): boolean {
  return testItem.id.startsWith(`${TestItemKind.httpRegion}|`);
}

export function isHttpFileItem(testItem: TestItem): boolean {
  return testItem.id.startsWith(`${TestItemKind.file}|`);
}

export function isFolderTestItem(testItem: TestItem): boolean {
  return testItem.id.startsWith(`${TestItemKind.folder}|`);
}

export function parseTestItemId(id: string) {
  const [kindString, identifier] = id.split('|');
  return {
    kind: toKind(kindString),
    identifier,
  };
}

function toKind(kind: string) {
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
