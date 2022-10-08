import * as vscode from 'vscode';
import { utils } from 'httpyac';
import { filesize } from 'filesize';

export interface ObjectItem {
  key: string;
  value: unknown;
}
export function isObjectItem(obj: unknown): obj is ObjectItem {
  const val = obj as ObjectItem;
  return !!val?.key;
}

export function toObjectItems(val: unknown): Array<ObjectItem> | undefined {
  let result: Array<ObjectItem> | undefined;
  if (val) {
    if (typeof val === 'object') {
      result = Object.entries(val).map(([key, value]) => ({ key, value }));
    }
    if (Array.isArray(val)) {
      result = val.map((value, index) => ({
        key: `${index}`,
        value,
      }));
    }
  }
  return result?.filter(obj => ['function', 'undefined'].indexOf(typeof obj.value) < 0);
}

export class ObjectTreeItem extends vscode.TreeItem {
  constructor(element: ObjectItem) {
    super(element.key);
    this.tooltip = utils.stringifySafe(element.value, 2);
    const type = typeof element.value;
    this.description = type;
    this.command = {
      command: 'httpyac.copyToClipboard',
      arguments: [element.value],
      title: 'copy',
    };

    switch (type) {
      case 'string':
        this.iconPath = new vscode.ThemeIcon('symbol-text');
        this.tooltip = this.description = `${element.value}`;
        break;
      case 'number':
        this.iconPath = new vscode.ThemeIcon('symbol-number');
        this.tooltip = this.description = `${element.value}`;
        break;
      case 'boolean':
        this.iconPath = new vscode.ThemeIcon('symbol-boolean');
        this.tooltip = this.description = element.value ? 'true' : 'false';
        break;
      case 'function':
        this.iconPath = new vscode.ThemeIcon('symbol-function');
        break;
      case 'object':
        if (Buffer.isBuffer(element.value)) {
          this.iconPath = new vscode.ThemeIcon('file-binary');
          this.tooltip = this.description = filesize(element.value.length);
          this.collapsibleState = vscode.TreeItemCollapsibleState.None;
        } else if (Array.isArray(element.value)) {
          if (element.value.length > 0) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          }
          this.description = 'array';
          this.iconPath = new vscode.ThemeIcon('symbol-array');
        } else if (element.value instanceof Date) {
          this.iconPath = new vscode.ThemeIcon('calendar');
          this.tooltip = this.description = element.value.toISOString();
        } else if (element.value instanceof vscode.Uri) {
          this.iconPath = new vscode.ThemeIcon('file');
          this.tooltip = this.description = element.value.toString();
        } else {
          if (element.value && typeof element.value === 'object' && Object.keys(element.value).length > 0) {
            this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          }
          this.iconPath = new vscode.ThemeIcon('symbol-object');
        }
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('symbol-field');
        break;
    }
  }
}
