import { HttpRegion, utils } from 'httpyac';
import { commands, extensions, Uri } from 'vscode';
import {writeTempFileName} from './responseHandlerUtils';



export async function openWithResponseHandler(httpRegion: HttpRegion): Promise<boolean> {
  const openWith = getOpenWith(httpRegion);
  if (httpRegion?.response?.rawBody && openWith) {
    const fileName = await writeTempFileName(httpRegion.response.rawBody, httpRegion);
    if (fileName) {
      await commands.executeCommand('vscode.openWith', Uri.file(fileName), openWith);
      return true;
    }
  }
  return false;
}

function getOpenWith(httpRegion: HttpRegion): string | undefined{
  if (httpRegion.response) {
    if (httpRegion.metaData.openWith) {
      return httpRegion.metaData.openWith;
    } else if(utils.isMimeTypeImage(httpRegion.response.contentType)) {
      return 'imagePreview.previewEditor';
    } else if (utils.isMimeTypePdf(httpRegion.response.contentType)
      && extensions.getExtension('tomoki1207.pdf')) {
      return 'pdf.preview';
    }
  }
  return undefined;
}