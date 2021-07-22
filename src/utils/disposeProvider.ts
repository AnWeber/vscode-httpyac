import { Disposable } from 'vscode';

export abstract class DisposeProvider {
  subscriptions: Array<Disposable>;
  constructor() {
    this.subscriptions = [];
  }
  dispose(): void {
    if (this.subscriptions) {
      this.subscriptions.forEach(obj => obj.dispose());
      this.subscriptions = [];
    }
  }
}
