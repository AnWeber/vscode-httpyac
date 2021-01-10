
import * as vscode from 'vscode';
import { RequestCommandsController } from './provider/requestCommandsController';
import { httpYacApi, httpFileStore, gotHttpClientFactory } from 'httpyac';
import { ResponseOutputProcessor } from './view/responseOutputProcessor';
import { EnvironmentController } from './provider/enviromentController';
import { HttpFileStoreController } from './provider/httpFileStoreController';
import { watchConfigSettings } from './config';
import { initVscodeLogger } from './logger';
import {HttpProxyAgent} from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

initVscodeLogger();

export function activate(context: vscode.ExtensionContext) {
	httpYacApi.additionalRequire.vscode = vscode;

	const httpDocumentSelector = [
		{ language: 'http', scheme: '*' }
	];

	const refreshCodeLens = new vscode.EventEmitter<void>();
	context.subscriptions.push(...[
		refreshCodeLens,
		new HttpFileStoreController(refreshCodeLens),
		new RequestCommandsController(refreshCodeLens, httpDocumentSelector),
		new EnvironmentController(refreshCodeLens, httpDocumentSelector),
		new ResponseOutputProcessor(),
		watchConfigSettings((config, httpConfig) => {
			const options: Record<string, any> = {
				timeout: config.requestTimeout > 0 ? config.requestTimeout : undefined,
				headers: config.requestDefaultHeaders,
				rejectUnauthorized: !!config.requestSslCertficateValidation,
				followRedirect: !!config.followRedirect,
			};
			if (httpConfig.proxy) {
				options.agent = {
					http: new HttpProxyAgent(httpConfig.proxy),
					https: new HttpsProxyAgent(httpConfig.proxy)
				};
			}
			httpYacApi.httpClient = gotHttpClientFactory(options);
		}, 'http')
	]);

	return {
		httpYacApi
	};
}

// this method is called when your extension is deactivated
export function deactivate() {
	httpFileStore.clear();
}