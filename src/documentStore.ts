import {
  getConfigSetting,
  getEnvironmentConfig,
  allHttpDocumentSelector,
  outputDocumentSelector,
  watchConfigSettings,
} from './config';
import { DocumentStore as IDocumentStore } from './extensionApi';
import { logToOutputChannelFactory } from './io';
import * as utils from './utils';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';
import { registerVscodePlugins } from './plugin';

export enum HttpFileChangedEventType {
  CHANGED,
  DELETED,
  RENAMED,
}

export type HttpFileChangedEvent =
  | {
      type: HttpFileChangedEventType.CHANGED;
      uri: vscode.Uri;
      httpFile: httpyac.HttpFile;
    }
  | {
      type: HttpFileChangedEventType.DELETED;
      oldUri: vscode.Uri;
    }
  | {
      type: HttpFileChangedEventType.RENAMED;
      oldUri: vscode.Uri;
      uri: vscode.Uri;
    };

export class DocumentStore extends utils.DisposeProvider implements IDocumentStore {
  activeEnvironment: Array<string> | undefined;

  public getDocumentPathLike: (document: vscode.TextDocument) => httpyac.PathLike;

  public readonly httpFileStore: httpyac.store.HttpFileStore;

  variables: httpyac.Variables | undefined;

  documentStoreChangedEmitter: vscode.EventEmitter<void>;
  private httpFileChangedEmitter: vscode.EventEmitter<HttpFileChangedEvent>;

  constructor() {
    super();
    this.documentStoreChangedEmitter = new vscode.EventEmitter<void>();
    this.httpFileChangedEmitter = new vscode.EventEmitter<HttpFileChangedEvent>();
    this.httpFileStore = new httpyac.store.HttpFileStore({ vscode: registerVscodePlugins });
    this.getDocumentPathLike = document => document.uri;
    this.activeEnvironment = getConfigSetting().environmentSelectedOnStart;

    this.subscriptions = [
      {
        dispose: httpyac.store.userSessionStore.onSessionChanged(() => {
          vscode.commands.executeCommand(
            'setContext',
            'httpyac.sessionEnabled',
            httpyac.store.userSessionStore.userSessions.length > 0
          );
          this.documentStoreChangedEmitter.fire();
        }),
      },
      watchConfigSettings(() => {
        this.httpFileStore.clear();
      }),
      vscode.workspace.onDidCloseTextDocument(document => {
        if (vscode.languages.match(allHttpDocumentSelector, document)) {
          this.remove(document);
        }
      }),
      vscode.workspace.onDidGrantWorkspaceTrust(() => {
        this.httpFileStore.clear();
      }),
      vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
        if (vscode.languages.match(allHttpDocumentSelector, document)) {
          const httpFile = await this.getHttpFile(document);
          this.documentStoreChangedEmitter.fire();
          if (httpFile) {
            this.httpFileChangedEmitter.fire({ type: HttpFileChangedEventType.CHANGED, httpFile, uri: document.uri });
          }
        }
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        if (event.contentChanges.length > 0) {
          if (vscode.languages.match(allHttpDocumentSelector, event.document)) {
            const httpFile = await this.getHttpFile(event.document);
            delete this.variables;
            this.documentStoreChangedEmitter.fire();
            if (httpFile) {
              this.httpFileChangedEmitter.fire({
                type: HttpFileChangedEventType.CHANGED,
                httpFile,
                uri: event.document.uri,
              });
            }
          } else if (
            vscode.languages.match(
              [
                {
                  language: 'dotenv',
                  scheme: 'file',
                },
              ],
              event.document
            )
          ) {
            this.clear();
          } else if (
            vscode.languages.match(
              [
                {
                  language: 'javascript',
                  scheme: 'file',
                  pattern: '**/*httpyac*',
                },
                {
                  language: 'json',
                  scheme: 'file',
                  pattern: '**/*httpyac*',
                },
                {
                  language: 'json',
                  scheme: 'file',
                  pattern: '**/http-client*',
                },
              ],
              event.document
            )
          ) {
            this.clear();
          }
        }
      }),
      vscode.workspace.onDidRenameFiles(fileRenameEvent => {
        fileRenameEvent.files.forEach(file => {
          this.httpFileStore.rename(file.oldUri, file.newUri);

          this.httpFileChangedEmitter.fire({
            type: HttpFileChangedEventType.RENAMED,
            oldUri: file.oldUri,
            uri: file.newUri,
          });
        });
      }),

      vscode.workspace.onDidDeleteFiles(async event => {
        event.files.forEach(async uri => {
          if (this.httpFileStore.remove(uri)) {
            this.httpFileChangedEmitter.fire({
              type: HttpFileChangedEventType.DELETED,
              oldUri: uri,
            });
          }
        });
      }),
    ];
  }

  get documentStoreChanged(): vscode.Event<void> {
    return this.documentStoreChangedEmitter.event;
  }

  get httpFileChanged(): vscode.Event<HttpFileChangedEvent> {
    return this.httpFileChangedEmitter.event;
  }

  async getHttpFile(document: vscode.TextDocument): Promise<httpyac.HttpFile | undefined> {
    if (!vscode.languages.match(outputDocumentSelector, document)) {
      const path = this.getDocumentPathLike(document);

      const httpFile = this.getOrCreate(path, () => Promise.resolve(document.getText()), document.version);
      return httpFile;
    }
    return undefined;
  }

  async getOrCreate(
    path: httpyac.PathLike,
    getText: () => Promise<string>,
    version: number
  ): Promise<httpyac.HttpFile> {
    const config = await getEnvironmentConfig(path);
    return await this.httpFileStore.getOrCreate(path, getText, version, {
      config,
    });
  }

  async parse(uri: vscode.Uri | undefined, text: string): Promise<httpyac.HttpFile> {
    let config: httpyac.EnvironmentConfig = {};
    const path: httpyac.PathLike = uri || 'unknown';
    if (uri) {
      config = await getEnvironmentConfig(uri);
    }
    return await this.httpFileStore.parse(path, text, {
      config,
    });
  }

  getAll(): Array<httpyac.HttpFile> {
    return this.httpFileStore.getAll();
  }

  get(fileName: httpyac.PathLike): httpyac.HttpFile | undefined {
    return this.httpFileStore.get(fileName);
  }

  remove(document: vscode.TextDocument): void {
    const path = this.getDocumentPathLike(document);
    this.httpFileStore.remove(path);
  }

  async send(context: httpyac.HttpRegionSendContext | httpyac.HttpFileSendContext | undefined): Promise<boolean> {
    try {
      if (context) {
        const config = await getEnvironmentConfig(context.httpFile.fileName);
        if (!context.scriptConsole) {
          context.scriptConsole = new httpyac.io.Logger({
            level: config.log?.level,
            logMethod: logToOutputChannelFactory('Console'),
          });
        }
        if (!context.config) {
          context.config = config;
        }
        context.activeEnvironment =
          context.activeEnvironment || context.httpFile.activeEnvironment || this.activeEnvironment;
        const result = await httpyac.send(context);
        this.variables = context.variables;
        return result;
      }
      return false;
    } finally {
      this.documentStoreChangedEmitter.fire();
    }
  }

  clear() {
    this.httpFileStore.clear();
    delete this.variables;
    this.documentStoreChangedEmitter.fire();
  }

  async getCurrentHttpFile(
    editor: vscode.TextEditor | undefined = vscode.window.activeTextEditor,
    documentSelector: vscode.DocumentSelector = allHttpDocumentSelector
  ): Promise<httpyac.HttpFile | undefined> {
    if (editor?.document && vscode.languages.match(documentSelector, editor.document)) {
      return await this.getHttpFile(editor.document);
    }
    return undefined;
  }
}
