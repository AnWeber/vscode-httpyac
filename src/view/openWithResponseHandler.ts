import { ResponseHandler, ResponseItem } from '../extensionApi';
import { StorageProvider } from '../io';
import { commands } from 'vscode';

export function openWithResponseHandlerFactory(storageProvider: StorageProvider): ResponseHandler {
  return async function openWithResponseHandler(responseItem: ResponseItem): Promise<boolean> {
    if (responseItem.openWith) {
      await responseItem.loadResponseBody?.();
      if (responseItem.response?.rawBody) {
        const uri = await storageProvider.writeFile(
          responseItem.response.rawBody,
          `${responseItem.name}..${responseItem.id.slice(0, 8)}.${responseItem.extension}`
        );
        if (uri) {
          responseItem.documentUri = uri;
          await commands.executeCommand('vscode.openWith', uri, responseItem.openWith);
          return true;
        }
      }
    }
    return false;
  };
}
