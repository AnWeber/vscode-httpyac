import { store, io, HttpFile, EnvironmentConfig } from 'httpyac';
import { TextDocument } from 'vscode';
import { getConfigSetting, getEnvironmentConfig } from './config';


export class DocumentStore {
  activeEnvironment: Array<string> | undefined;

  environmentConfig: EnvironmentConfig |undefined;

  public getDocumentPathLike: (document: TextDocument) => io.PathLike;

  constructor(readonly httpFileStore: store.HttpFileStore) {
    this.getDocumentPathLike = document => document.uri;

    this.activeEnvironment = getConfigSetting().environmentSelectedOnStart;
  }

  async getHttpFile(document: TextDocument): Promise<HttpFile> {
    const path = this.getDocumentPathLike(document);
    const config = await getEnvironmentConfig(path);

    return await this.httpFileStore.getOrCreate(
      path,
      () => Promise.resolve(document.getText()),
      document.version, {
        config,
        activeEnvironment: this.activeEnvironment,
      }
    );
  }

  getAll(): Array<HttpFile> {
    return this.httpFileStore.getAll();
  }

  remove(document: TextDocument) : void {
    const path = this.getDocumentPathLike(document);
    this.httpFileStore.remove(path);
  }
}
