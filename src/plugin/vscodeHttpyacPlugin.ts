import { HttpyacHooksApi, io } from 'httpyac';
import { bailOnFailedTestInterceptor } from './bailOnFailedTestInterceptor';
import { provideOutputChannelLogger } from './outputChannelProvider';
import * as vscode from 'vscode';
import { errorNotificationHandler } from './errorNotificationHandler';

export function registerVscodePlugins(api: HttpyacHooksApi) {
  api.hooks.execute.addInterceptor(errorNotificationHandler);
  api.hooks.execute.addInterceptor(bailOnFailedTestInterceptor);
  api.hooks.provideVariables.addHook('provideOutputChannelLogger', provideOutputChannelLogger);
  io.javascriptProvider.require.vscode = vscode;
}
