import * as vscode from 'vscode';
import * as httpyac from 'httpyac';
import { DisposeProvider } from '../utils';
import { commands } from '../config';

export class StorageProvider extends DisposeProvider {
  private storageUri: vscode.Uri;
  private storageEnabled: boolean;
  private cachedUris: Array<vscode.Uri> = [];
  private init = false;

  constructor(storageUri: vscode.Uri) {
    super();
    this.subscriptions = [
      vscode.commands.registerCommand(commands.pruneStorage, this.clear, this),
      vscode.workspace.onDidCloseTextDocument(async document => {
        await this.deleteFile(document.uri);
      }),
      {
        dispose: async () => {
          await this.clear();
        }
      }
    ];
    this.storageUri = storageUri;
    this.storageEnabled = vscode.workspace.fs.isWritableFileSystem(this.storageUri.scheme) !== false;
  }

  private async initialize() : Promise<boolean> {
    if (!this.init && this.storageEnabled) {
      try {
        const storage = vscode.Uri.joinPath(this.storageUri, '_httpyac_');
        await vscode.workspace.fs.createDirectory(storage);

        this.storageUri = storage;
        this.init = true;
      } catch (err) {
        httpyac.io.log.error('write of store failed', err);
      }
    }
    return this.init;
  }

  async writeFile(content: string | Buffer, fileName: string): Promise<vscode.Uri | undefined> {
    if (this.storageUri && await this.initialize()) {
      try {
        const file = httpyac.utils.shortenFileName(httpyac.utils.replaceInvalidChars(fileName));
        const documentUri = vscode.Uri.joinPath(this.storageUri, file);
        if (this.cachedUris.every(obj => obj.toString() !== documentUri.toString())) {
          this.cachedUris.push(documentUri);
        }
        await vscode.workspace.fs.writeFile(documentUri, httpyac.utils.isString(content) ? Buffer.from(content) : content);
        return documentUri;
      } catch (err) {
        httpyac.io.log.error(`write of ${fileName} failed`, err);
      }
    }
    return undefined;
  }

  async deleteFile(uri: vscode.Uri): Promise<boolean> {
    const index = this.cachedUris.indexOf(uri);
    if (index >= 0) {
      this.cachedUris.splice(index, 1);
      try {
        await vscode.workspace.fs.delete(uri, { useTrash: false });
      } catch (err) {
        httpyac.io.log.error(`delete of uri ${uri} failed`, err);
      }
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    for (const uri of this.cachedUris) {
      try {
        await vscode.workspace.fs.delete(uri, { useTrash: false });
      } catch (err) {
        httpyac.io.log.error(`delete of uri ${uri} failed`, err);
      }
    }
    this.cachedUris = [];
  }
}
