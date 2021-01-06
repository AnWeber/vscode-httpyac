
import * as vscode from 'vscode';
import { RequestCommandsController } from './provider/requestCommandsController';
import { httpYacApi, httpFileStore, gotHttpClientFactory } from 'httpyac';
import { ResponseOutputProcessor } from './view/responseOutputProcessor';
import { EnvironmentController } from './provider/enviromentController';
import { HttpFileStoreController } from './provider/httpFileStoreController';
import { watchConfigSettings } from './config';
import { initVscodeLogger } from './logger';

initVscodeLogger();

export function activate(context: vscode.ExtensionContext) {

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
		watchConfigSettings(config => {
			httpYacApi.httpClient = gotHttpClientFactory({
				timeout: config.requestTimeout > 0 ? config.requestTimeout : undefined,
				headers: config.requestDefaultHeaders,
				rejectUnauthorized: !!config.requestSslCertficateValidation,
				followRedirect: !!config.followRedirect,
			});
		}, 'requestDefaultHeaders', 'requestTimeout', 'requestSslCertficateValidation', 'requestFollowRedirect')
	]);

	return httpYacApi;
}

// this method is called when your extension is deactivated
export function deactivate() {
	httpFileStore.clear();
}