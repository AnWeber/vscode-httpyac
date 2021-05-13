import { HttpFileStore, HttpFile } from 'httpyac';
import { TextDocument } from 'vscode';


export class DocumentStore {

  constructor(readonly httpFileStore: HttpFileStore) { }

  getHttpFile(document: TextDocument): Promise<HttpFile> {
    return this.httpFileStore.getOrCreate(document.uri, () => Promise.resolve(document.getText()), document.version);
  }

  getAll(): Array<HttpFile> {
    return this.httpFileStore.getAll();
  }
}
