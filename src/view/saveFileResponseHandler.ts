import * as vscode from 'vscode';
import { ResponseItem } from '../extensionApi';


export async function saveFileResponseHandler(responseItem: ResponseItem): Promise<boolean> {
  if (responseItem.metaData.save) {
    await responseItem.loadResponseBody?.();
    if (!responseItem.response?.rawBody) {
      return false;
    }
    const filters: Record<string, Array<string>> = {
      'All Files': ['*']
    };
    if (responseItem.extension) {
      filters[responseItem.extension] = [responseItem.extension];
    }
    const uri = await vscode.window.showSaveDialog({
      filters
    });
    if (uri && responseItem.response.rawBody) {
      await vscode.workspace.fs.writeFile(uri, responseItem.response.rawBody);
      return true;
    }
  }
  return false;
}
