import { HttpRegion } from 'httpyac';
import { extension } from 'mime-types';
import { window } from 'vscode';
import { promises as fs } from 'fs';
import {getExtension} from './responseHandlerUtils';



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
    if (uri) {
      await fs.writeFile(uri?.fsPath, new Uint8Array(httpRegion.response.rawBody));
      return true;
    }
  }
  return false;
};