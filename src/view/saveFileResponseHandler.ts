import { HttpRegion } from 'httpyac';
import { window, workspace } from 'vscode';
import { getExtension } from './responseHandlerUtils';


export async function saveFileResponseHandler(httpRegion: HttpRegion): Promise<boolean> {
  if (httpRegion?.response?.rawBody && httpRegion.metaData.save) {
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
    if (uri && httpRegion.response.rawBody) {
      await workspace.fs.writeFile(uri, httpRegion.response.rawBody);
      return true;
    }
  }
  return false;
}
