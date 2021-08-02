import { store, io, HttpFile, EnvironmentConfig } from 'httpyac';
import { TextDocument, Uri } from 'vscode';
import { getConfigSetting, getEnvironmentConfig } from './config';


export class DocumentStore {
  activeEnvironment: Array<string> | undefined;

  public getDocumentPathLike: (document: TextDocument) => io.PathLike;

  constructor(readonly httpFileStore: store.HttpFileStore) {
    this.getDocumentPathLike = document => document.uri;

    this.activeEnvironment = getConfigSetting().environmentSelectedOnStart;
  }

  async getHttpFile(document: TextDocument): Promise<HttpFile> {
    const path = this.getDocumentPathLike(document);

    return this.getOrCreate(path, () => Promise.resolve(document.getText()), document.version);
  }

  async getOrCreate(path: io.PathLike, getText: () => Promise<string>, version: number) : Promise<HttpFile> {
    const config = await getEnvironmentConfig(path);
    return await this.httpFileStore.getOrCreate(
      path,
      getText,
      version, {
        config,
        activeEnvironment: this.activeEnvironment,
      }
    );
  }

  async parse(uri: Uri | undefined, text: string) : Promise<HttpFile> {
    let config: EnvironmentConfig = {};
    const path: io.PathLike = uri || 'unknown';
    if (uri) {
      config = await getEnvironmentConfig(uri);
    }
    return await this.httpFileStore.parse(
      path,
      text,
      {
        config,
        activeEnvironment: this.activeEnvironment
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
