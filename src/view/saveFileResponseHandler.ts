import { HttpRegion, HttpResponse } from 'httpyac';
import { window, workspace } from 'vscode';
import { getExtension } from './responseHandlerUtils';


export async function saveFileResponseHandler(response: HttpResponse, httpRegion?: HttpRegion): Promise<boolean> {
  if (response?.rawBody && httpRegion?.metaData?.save) {
    const filters: Record<string, Array<string>> = {
      'All Files': ['*']
    };
    const ext = getExtension(httpRegion);
    if (ext) {
      filters[ext] = [ext];
    }
    const uri = await window.showSaveDialog({
      filters
    });
    if (uri && response.rawBody) {
      await workspace.fs.writeFile(uri, response.rawBody);
      return true;
    }
  }
  return false;
}
