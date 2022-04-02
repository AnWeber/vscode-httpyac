import {
  getConfigSetting,
  getEnvironmentConfig,
  getResourceConfig,
  allHttpDocumentSelector,
  watchConfigSettings,
} from './config';
import { DocumentStore as IDocumentStore } from './extensionApi';
import { getOutputChannel, logToOutputChannelFactory, logStream } from './io';
import * as utils from './utils';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export class DocumentStore extends utils.DisposeProvider implements IDocumentStore {
  activeEnvironment: Array<string> | undefined;

  public getDocumentPathLike: (document: vscode.TextDocument) => httpyac.PathLike;

  public readonly httpFileStore: httpyac.store.HttpFileStore;

  variables: httpyac.Variables | undefined;

  documentStoreChangedEmitter: vscode.EventEmitter<void>;

  constructor() {
    super();
    this.documentStoreChangedEmitter = new vscode.EventEmitter<void>();
    this.httpFileStore = new httpyac.store.HttpFileStore();
    this.getDocumentPathLike = document => {
      if (utils.isNotebook(document)) {
        return {
          uri: document.uri,
          fileUri: document.notebook.uri,
          toString: () => document.uri.toString(),
        };
      }
      return document.uri;
    };
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
          await this.getHttpFile(document);
          this.documentStoreChangedEmitter.fire();
        }
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        if (event.contentChanges.length > 0) {
          if (vscode.languages.match(allHttpDocumentSelector, event.document)) {
            await this.getHttpFile(event.document);
            delete this.variables;
            this.documentStoreChangedEmitter.fire();
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
        });
      }),
    ];
  }

  get documentStoreChanged(): vscode.Event<void> {
    return this.documentStoreChangedEmitter.event;
  }

  async getHttpFile(document: vscode.TextDocument): Promise<httpyac.HttpFile> {
    const path = this.getDocumentPathLike(document);

    const httpFile = this.getOrCreate(path, () => Promise.resolve(document.getText()), document.version);
    return httpFile;
  }

  async getOrCreate(
    path: httpyac.PathLike,
    getText: () => Promise<string>,
    version: number
  ): Promise<httpyac.HttpFile> {
    const config = await getEnvironmentConfig(path);
    return await this.httpFileStore.getOrCreate(path, getText, version, {
      config,
      activeEnvironment: this.activeEnvironment,
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
      activeEnvironment: this.activeEnvironment,
    });
  }

  getAll(): Array<httpyac.HttpFile> {
    return this.httpFileStore.getAll();
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
        const resourceConfig = getResourceConfig(context.httpFile);
        if (resourceConfig.logRequest) {
          const outputChannelLogResponse = httpyac.utils.requestLoggerFactory(
            (arg: string) => {
              const requestChannel = getOutputChannel('Request');
              requestChannel.appendLine(arg);
            },
            resourceConfig.logOutputChannelOptions || {
              requestOutput: true,
              requestHeaders: true,
              requestBodyLength: 1024,
              responseHeaders: true,
              responseBodyLength: 1024,
            }
          );
          const logContextStream = context.logStream;
          context.logStream = async (type, message) => {
            await logStream(type, message);
            if (logContextStream) {
              await logContextStream?.(type, message);
            }
          };
          const logResponse = context.logResponse;
          context.logResponse = async (response, httpRegion) => {
            await outputChannelLogResponse(response, httpRegion);
            await logResponse?.(response, httpRegion);
          };
        }

        if (!context.config) {
          context.config = config;
        }
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
