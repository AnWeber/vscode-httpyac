import * as httpyac from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting, getEnvironmentConfig, getResourceConfig, httpDocumentSelector, watchConfigSettings } from './config';
import { getOutputChannel, logToOuputChannelFactory, logStream } from './io';
import { DocumentStore as IDocumentStore } from './extensionApi';
import { DisposeProvider } from './utils';


export class DocumentStore extends DisposeProvider implements IDocumentStore {
  activeEnvironment: Array<string> | undefined;

  public getDocumentPathLike: (document: vscode.TextDocument) => httpyac.PathLike;

  public readonly httpFileStore: httpyac.store.HttpFileStore;

  documentStoreChangedEmitter: vscode.EventEmitter<void>;

  constructor() {
    super();
    this.documentStoreChangedEmitter = new vscode.EventEmitter<void>();
    this.httpFileStore = new httpyac.store.HttpFileStore();
    this.getDocumentPathLike = document => document.uri;
    this.activeEnvironment = getConfigSetting().environmentSelectedOnStart;

    this.subscriptions = [
      {
        dispose: httpyac.store.userSessionStore.onSessionChanged(() => this.documentStoreChangedEmitter.fire())
      },
      watchConfigSettings(() => {
        this.httpFileStore.clear();
      }),
      vscode.workspace.onDidCloseTextDocument(document => {
        if (vscode.languages.match(httpDocumentSelector, document)) {
          this.remove(document);
        }
      }),
      vscode.workspace.onDidOpenTextDocument(async (document: vscode.TextDocument) => {
        if (vscode.languages.match(httpDocumentSelector, document)) {
          await this.getHttpFile(document);
        }
      }),
      vscode.workspace.onDidChangeTextDocument(async event => {
        if (event.contentChanges.length > 0) {
          if (vscode.languages.match(httpDocumentSelector, event.document)) {
            await this.getHttpFile(event.document);
          } else if (vscode.languages.match([{
            language: 'dotenv', scheme: 'file',
          }], event.document)) {
            this.httpFileStore.clear();
          } else if (vscode.languages.match([
            {
              language: 'javascript', scheme: 'file', pattern: '**/*httpyac*'
            }, {
              language: 'json', scheme: 'file', pattern: '**/*httpyac*'
            }, {
              language: 'json', scheme: 'file', pattern: '**/http-client*'
            }
          ], event.document)) {
            this.httpFileStore.clear();
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

  get documentStoreChanged() : vscode.Event<void> {
    return this.documentStoreChangedEmitter.event;
  }

  async getHttpFile(document: vscode.TextDocument): Promise<httpyac.HttpFile> {
    const path = this.getDocumentPathLike(document);

    const httpFile = this.getOrCreate(path, () => Promise.resolve(document.getText()), document.version);
    return httpFile;
  }

  async getOrCreate(path: httpyac.PathLike, getText: () => Promise<string>, version: number) : Promise<httpyac.HttpFile> {
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

  async parse(uri: vscode.Uri | undefined, text: string) : Promise<httpyac.HttpFile> {
    let config: httpyac.EnvironmentConfig = {};
    const path: httpyac.PathLike = uri || 'unknown';
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

  getAll(): Array<httpyac.HttpFile> {
    return this.httpFileStore.getAll();
  }

  remove(document: vscode.TextDocument) : void {
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
            logMethod: logToOuputChannelFactory('Console'),
          });
        }
        const resourceConfig = getResourceConfig(context.httpFile);
        if (resourceConfig.logRequest) {
          const outputChannelLogResponse = httpyac.utils.requestLoggerFactory((arg: string) => {
            const requestChannel = getOutputChannel('Request');
            requestChannel.appendLine(arg);
          }, resourceConfig.logOutputChannelOptions || {
            requestOutput: true,
            requestHeaders: true,
            requestBodyLength: 1024,
            responseHeaders: true,
            responseBodyLength: 1024,
          });
          const logStreamCache = context.logStream;
          context.logStream = async (channel, type, message) => {
            await logStream(channel, type, message);
            logStreamCache?.(channel, type, message);
          };
          const logResponse = context.logResponse;
          context.logResponse = async (response, httpRegion) => {
            outputChannelLogResponse(response, httpRegion);
            await logResponse?.(response, httpRegion);
          };
        }

        if (!context.config) {
          context.config = config;
        }
        context.require = {
          vscode,
        };
        return await httpyac.send(context);
      }
      return false;
    } finally {
      this.documentStoreChangedEmitter.fire();
    }
  }
}
