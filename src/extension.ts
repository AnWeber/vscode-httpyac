
import * as vscode from 'vscode';
import * as provider from './provider';
import { httpYacApi, httpFileStore, gotHttpClientFactory, actionProcessor, utils, HttpFile } from 'httpyac';
import { ResponseOutputProcessor } from './view/responseOutputProcessor';
import { watchConfigSettings, getConfigSetting } from './config';
import { initVscodeLogger } from './logger';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { promises as fs} from 'fs';

initVscodeLogger();

export async function activate(context: vscode.ExtensionContext) {
	httpYacApi.additionalRequire.vscode = vscode;

	const httpDocumentSelector = [
		{ language: 'http', scheme: '*' }
	];

	const httpFileEmitter = new vscode.EventEmitter<{ httpFile: HttpFile, document: vscode.TextDocument }>();
	const refreshCodeLens = new vscode.EventEmitter<void>();

const httpFileStoreController = new provider.HttpFileStoreController(httpFileEmitter, refreshCodeLens);
	context.subscriptions.push(...[
		refreshCodeLens,
		httpFileStoreController,
		new provider.RequestCommandsController(refreshCodeLens, httpDocumentSelector),
		new provider.EnvironmentController(refreshCodeLens, httpDocumentSelector),
		new provider.DecorationProvider(context, httpFileEmitter),
		new ResponseOutputProcessor(),
		vscode.languages.registerDocumentSymbolProvider(httpDocumentSelector, new provider.HttpDocumentSymbolProvider(httpFileStoreController)),
		watchConfigSettings((config, httpConfig) => {
			const options: Record<string, any> = {
				timeout: config.requestTimeout > 0 ? config.requestTimeout : undefined,
				headers: config.requestDefaultHeaders,
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
	]);

	await initExtensionScript();

	return {
		httpYacApi
	};
}

async function initExtensionScript() {
	try {
		const extensionScript = getConfigSetting<string>('extensionScript');
		if (extensionScript && vscode.workspace.workspaceFolders) {
			let scriptPath: string | undefined;
			for (const workspace of vscode.workspace.workspaceFolders) {
				const path = await utils.toAbsoluteFilename(extensionScript, workspace.uri.fsPath, true);
				if (path) {
					scriptPath = path;
					break;
				}
			}
			if (scriptPath) {
				const script = await fs.readFile(scriptPath, { encoding: 'utf-8' });
				await actionProcessor.executeScript(script, scriptPath, {}, 0);
			}
		}
	} catch (err) {
		console.error(err);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
	httpFileStore.clear();
}