import { HttpyacHooksApi, io } from 'httpyac';
import { bailOnFailedTestInterceptor } from './bailOnFailedTestInterceptor';
import * as vscode from 'vscode';

export function registerVscodePlugins(api: HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(bailOnFailedTestInterceptor);
  io.javascriptProvider.require.vscode = vscode;
}
