import { AppConfig, commands, getConfigSetting } from '../config';
import { DisposeProvider } from '../utils';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export class StorageProvider extends DisposeProvider {
  private cachedUris: Array<vscode.Uri> = [];

  constructor(private readonly storageUri: vscode.Uri) {
    super();
    this.subscriptions = [vscode.commands.registerCommand(commands.pruneStorage, this.clear, this)];
  }

  private isStorageEnabled(config: AppConfig) {
    if (config.responseStorage === 'none') {
      return false;
    }
    if (config.responseStorage === 'global') {
      return vscode.workspace.fs.isWritableFileSystem(this.storageUri.scheme) !== false;
    }
    return true;
  }

  private baseStoragePath(config: AppConfig) {
    if (config.responseStorage === 'global') {
      if (config.responseStorageLocation) {
        return vscode.Uri.joinPath(this.storageUri, config.responseStorageLocation);
      }
      return this.storageUri;
    }
    const currentUri = vscode.window.activeTextEditor?.document.uri;
    if (currentUri) {
      if (config.responseStorage === 'file') {
        return vscode.Uri.joinPath(currentUri, '..');
      }
      if (config.responseStorage === 'workspace') {
        const baseUri = vscode.workspace.getWorkspaceFolder(currentUri)?.uri;
        if (baseUri && config.responseStorageLocation) {
          return vscode.Uri.joinPath(baseUri, config.responseStorageLocation);
        }
        return baseUri;
      }
    }
    return undefined;
  }

  private async getFolderUri(): Promise<vscode.Uri | undefined> {
    const config = getConfigSetting();
    if (this.isStorageEnabled(config)) {
      const baseUri = this.baseStoragePath(config);
      if (baseUri) {
        try {
          await vscode.workspace.fs.createDirectory(baseUri);
          return baseUri;
        } catch (err) {
          if (err instanceof vscode.FileSystemError.FileExists) {
            return baseUri;
          }
          httpyac.io.log.error('write of store failed', err);
        }
      }
    }
    return undefined;
  }

  async writeFile(content: string | Buffer, fileName: string): Promise<vscode.Uri | undefined> {
    const folderUri = await this.getFolderUri();
    if (folderUri) {
      try {
        const file = httpyac.utils.shortenFileName(httpyac.utils.replaceInvalidChars(fileName));
        const documentUri = vscode.Uri.joinPath(folderUri, file);
        this.cachedUris.push(documentUri);
        await vscode.workspace.fs.writeFile(
          documentUri,
          httpyac.utils.isString(content) ? Buffer.from(content) : content
        );
        return documentUri;
      } catch (err) {
        httpyac.io.log.error(`write of ${fileName} failed`, err);
      }
    }
    return undefined;
  }

  async clear(): Promise<void> {
    const config = getConfigSetting();

    if (config.responseStorage !== 'none') {
      const baseUri = this.baseStoragePath(config);
      try {
        if (baseUri) {
          await vscode.workspace.fs.delete(baseUri, { useTrash: false, recursive: true });
        }
      } catch (err) {
        httpyac.io.log.error(`delete of uri ${baseUri} failed`, err);
      }
    }
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
