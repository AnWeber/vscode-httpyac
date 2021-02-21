
import * as vscode from 'vscode';
import * as provider from './provider';
import { httpYacApi, httpFileStore, gotHttpClientFactory, actionProcessor, HttpFile, LogLevel, log } from 'httpyac';
import { ResponseOutputProcessor } from './view/responseOutputProcessor';
import { watchConfigSettings, httpDocumentSelector } from './config';
import { initVscodeLogger } from './logger';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { promises as fs } from 'fs';
import { isAbsolute } from 'path';
import * as parser from './parser';
import { showInputBoxVariableReplacer } from './replacer/showInputBoxVariableReplacer';
import { showQuickpickVariableReplacer } from './replacer/showQuickpickVariableReplacer';

initVscodeLogger();



export async function activate(context: vscode.ExtensionContext) {
	httpYacApi.additionalRequire.vscode = vscode;
	httpYacApi.httpRegionParsers.push(new parser.DefaultHeadersHttpRegionParser());
	httpYacApi.httpRegionParsers.push(new parser.NoteMetaHttpRegionParser());



	httpYacApi.variableReplacers.splice(0,0,showInputBoxVariableReplacer);
	httpYacApi.variableReplacers.splice(0,0,showQuickpickVariableReplacer);



	const httpFileEmitter = new vscode.EventEmitter<{ httpFile: HttpFile, document: vscode.TextDocument }>();
	const refreshCodeLens = new vscode.EventEmitter<void>();

	const httpFileStoreController = new provider.HttpFileStoreController(httpFileEmitter, refreshCodeLens);
	context.subscriptions.push(...[
		refreshCodeLens,
		httpFileStoreController,
		new provider.RequestCommandsController(refreshCodeLens),
		new provider.EnvironmentController(refreshCodeLens),
		new provider.DecorationProvider(context, httpFileEmitter),
		new provider.HttpCompletionItemProvider(),
		new ResponseOutputProcessor(),
		vscode.languages.registerDocumentSymbolProvider(httpDocumentSelector, new provider.HttpDocumentSymbolProvider(httpFileStoreController)),
		watchConfigSettings((config, httpConfig) => {
			const options: Record<string, any> = {
				timeout: config.requestTimeout > 0 ? config.requestTimeout : undefined,
				https: {
					rejectUnauthorized: !!config.requestSslCertficateValidation
				},
				followRedirect: !!config.followRedirect,
			};
			if (httpConfig.proxy) {
				options.agent = {
					http: new HttpProxyAgent(httpConfig.proxy),
					https: new HttpsProxyAgent(httpConfig.proxy)
				};
			}
			httpYacApi.httpClient = gotHttpClientFactory(options);
		}, 'http'),
		watchConfigSettings((config) => {
			for (const level in LogLevel) {
				if (config.logLevel === LogLevel[level]) {
					log.level = +level;
				}
			}
		}),
		watchConfigSettings((config) => {
			httpFileStore.clear();
			const index = httpYacApi.httpRegionParsers.findIndex(obj => obj instanceof parser.SettingsScriptHttpRegionParser);
			if (index >= 0) {
				httpYacApi.httpRegionParsers.splice(index, 1);
			}
			if (config.httpRegionScript) {
				httpYacApi.httpRegionParsers.push(new parser.SettingsScriptHttpRegionParser());
			}
		}),
		initExtensionScript(),
	]);

	return {
		httpYacApi
	};
}


function initExtensionScript() {
	let disposable: vscode.Disposable;
	disposable = watchConfigSettings(async (config) => {
		try {
			const extensionScript = config.extensionScript;
			if (extensionScript) {
				if (isAbsolute(extensionScript) && await fs.stat(extensionScript)) {
					const script = await fs.readFile(extensionScript, { encoding: 'utf-8' });
					await actionProcessor.executeScript({
						script,
						fileName: extensionScript,
						variables: {},
						lineOffset: 0
					});
					log.info('extenionscript executed. dispose config watcher');
					if (disposable) {
						disposable.dispose();
					}
				}else{
					log.warn('extenionscript not found');
				}
			}
		} catch (err) {
			console.error(err);
		}
	});
	return disposable;
}

// this method is called when your extension is deactivated
export function deactivate() {
	httpFileStore.clear();
}