import * as vscode from 'vscode';

export interface ObjectItem {
  key: string;
  value: unknown;
}
export class ObjectTreeItem extends vscode.TreeItem {
  constructor(element: ObjectItem) {
    super(element.key);
    this.tooltip = JSON.stringify(element.value, null, 2);
    const type = typeof element.value;
    this.description = type;

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
        if (Array.isArray(element.value)) {
          this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          this.description = 'array';
          this.iconPath = new vscode.ThemeIcon('symbol-array');
        } else if (element.value instanceof Date) {
          this.iconPath = new vscode.ThemeIcon('calendar');
          this.tooltip = this.description = element.value.toISOString();
        } else {
          this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
          this.iconPath = new vscode.ThemeIcon('symbol-object');
        }
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('symbol-field');
        break;
    }
  }
}
