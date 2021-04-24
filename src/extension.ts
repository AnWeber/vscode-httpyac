
import * as vscode from 'vscode';
import * as provider from './provider';
import { httpYacApi, httpFileStore, actions, HttpFile, popupService, log, parser, variables } from 'httpyac';
import { responseHandlers, ResponseOutputProcessor } from './view/responseOutputProcessor';
import { watchConfigSettings, httpDocumentSelector, getConfigSetting } from './config';
import { initVscodeLogger } from './logger';
import { promises as fs } from 'fs';
import { isAbsolute, join } from 'path';
import { HttpFileStoreController } from './provider';


export interface HttpYacExtensionApi{
	httpYacApi: typeof httpYacApi,
	httpFileStoreController: HttpFileStoreController,
	responseHandlers: typeof responseHandlers,
}


export function activate(context: vscode.ExtensionContext) : HttpYacExtensionApi {
	httpYacApi.additionalRequire.vscode = vscode;
	httpYacApi.httpRegionParsers.push(new parser.NoteMetaHttpRegionParser(async (note: string) => {
		const buttonTitle = 'Execute';
		const result = await vscode.window.showWarningMessage(note, { modal: true}, buttonTitle);
		return result === buttonTitle;
	}));

	httpYacApi.variableReplacers.splice(0, 0, new variables.replacer.ShowInputBoxVariableReplacer(async (message: string, defaultValue: string) => await vscode.window.showInputBox({
		placeHolder: message,
		value: defaultValue,
		prompt: message
	})));
	httpYacApi.variableReplacers.splice(0,0, new variables.replacer.ShowQuickpickVariableReplacer(async (message: string, values: string[]) => await vscode.window.showQuickPick(values,{
		placeHolder: message
	})));

	const responseOutputProcessor = new ResponseOutputProcessor();
	const httpFileEmitter = new vscode.EventEmitter<{ httpFile: HttpFile, document: vscode.TextDocument }>();
	const refreshCodeLens = new vscode.EventEmitter<void>();

	const httpFileStoreController = new provider.HttpFileStoreController(httpFileEmitter, refreshCodeLens);
	context.subscriptions.push(...[
		refreshCodeLens,
		httpFileStoreController,
		new provider.HarCommandsController(),
		new provider.RequestCommandsController(refreshCodeLens, responseOutputProcessor),
		new provider.EnvironmentController(refreshCodeLens),
		new provider.DecorationProvider(context, httpFileEmitter),
		new provider.HttpCompletionItemProvider(),
		responseOutputProcessor,
		vscode.languages.registerDocumentSymbolProvider(httpDocumentSelector, new provider.HttpDocumentSymbolProvider(httpFileStoreController)),
		watchConfigSettings((config) => {
			httpFileStore.clear();
			const index = httpYacApi.httpRegionParsers.findIndex(obj => obj instanceof parser.SettingsScriptHttpRegionParser);
			if (index >= 0) {
				httpYacApi.httpRegionParsers.splice(index, 1);
			}
			if (config.httpRegionScript) {
				httpYacApi.httpRegionParsers.push(new parser.SettingsScriptHttpRegionParser(async () => {
					const fileName = getConfigSetting().httpRegionScript;
					if (fileName) {
						if (isAbsolute(fileName)) {
							try {
								const script = await fs.readFile(fileName, 'utf-8');
								return { script, lineOffset: 0 };
							} catch (err) {
								log.trace(`file not found: ${fileName}`);
							}
						} else if (vscode.workspace.workspaceFolders) {
							for (const workspaceFolder of vscode.workspace.workspaceFolders) {
								const file = join(workspaceFolder.uri.fsPath, fileName);
								try {
									const script = await fs.readFile(file, 'utf-8');
									return {
										script,
										lineOffset: 0
									};
								} catch (err) {
									log.trace(`file not found: ${file}`);
								}
							}
						}
					}
						return undefined;
				}));
			}
		}),
		initExtensionScript(),
		initVscodeLogger(),
	]);

	return {
		httpYacApi,
		httpFileStoreController,
		responseHandlers
	};
}


function initExtensionScript() {
	const disposable = watchConfigSettings(async (config) => {
		try {
			const extensionScript = config.extensionScript;
			if (extensionScript) {
				if (isAbsolute(extensionScript) && await fs.stat(extensionScript)) {
					const script = await fs.readFile(extensionScript, { encoding: 'utf-8' });
					await actions.executeScript({
						script,
						fileName: extensionScript,
						variables: {},
						lineOffset: 0
					});
					log.info('extenionscript executed. dispose config watcher');
					if (disposable) {
						disposable.dispose();
					}
				} else {
					popupService.error('extenionscript not found');
					log.error('extenionscript not found');
				}
			}
		} catch (err) {
			log.error(err);
		}
	});
	return disposable;
}

// this method is called when your extension is deactivated
export function deactivate() : void {
	httpFileStore.clear();
}