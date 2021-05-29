import { HttpFileStore, HttpFile, PathLike } from 'httpyac';
import { TextDocument } from 'vscode';


export class DocumentStore {

  public getDocumentPathLike: (document: TextDocument) => PathLike;

  constructor(readonly httpFileStore: HttpFileStore) {
    this.getDocumentPathLike = document => document.uri;
  }

  getHttpFile(document: TextDocument): Promise<HttpFile> {
    return this.httpFileStore.getOrCreate(this.getDocumentPathLike(document), () => Promise.resolve(document.getText()), document.version);
  }

  getAll(): Array<HttpFile> {
    return this.httpFileStore.getAll();
  }
}
