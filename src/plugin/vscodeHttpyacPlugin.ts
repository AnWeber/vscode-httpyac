import { HttpFile, HttpRegion, HttpyacHooksApi, io, ProcessorContext } from 'httpyac';
import { bailOnFailedTestInterceptor } from './bailOnFailedTestInterceptor';
import { provideOutputChannelLogger } from './outputChannelProvider';
import * as vscode from 'vscode';
import { errorNotificationHandler } from './errorNotificationHandler';

export function registerVscodePluginsFactory(httpRegionExecutedEmitter: vscode.EventEmitter<HttpRegionExecutedEvent>) {
  return (api: HttpyacHooksApi) => {
    api.hooks.execute.addInterceptor(errorNotificationHandler);
    api.hooks.execute.addInterceptor(bailOnFailedTestInterceptor);
    api.hooks.execute.addInterceptor({
      id: 'httpRegionExecuted',
      afterTrigger: async function bail(hookContext: { args: [ProcessorContext] }) {
        const context = hookContext.args[0];
        httpRegionExecutedEmitter.fire(context);
        return true;
      },
    });
    api.hooks.provideVariables.addHook('provideOutputChannelLogger', provideOutputChannelLogger);
    io.javascriptProvider.require.vscode = vscode;
  };
}

export type HttpRegionExecutedEvent = {
  httpRegion: HttpRegion;
  httpFile: HttpFile;
};
