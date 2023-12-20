import { ResponseHandler, ResponseItem } from '../extensionApi';
import { commands } from 'vscode';

export function openWithResponseHandlerFactory(): ResponseHandler {
  return async function openWithResponseHandler(responseItem: ResponseItem): Promise<boolean> {
    if (responseItem.openWith) {
      await responseItem.loadResponseBody?.();
      if (responseItem.responseUri) {
        await commands.executeCommand('vscode.openWith', responseItem.responseUri, responseItem.openWith);
        return true;
      }
    }
    return false;
  };
}
