import { HttpRegion, HttpResponse, utils } from 'httpyac';
import { commands, extensions, Uri } from 'vscode';
import { getExtension, writeTempFileName } from './responseHandlerUtils';


export async function openWithResponseHandler(response: HttpResponse, httpRegion?: HttpRegion): Promise<boolean> {
  const openWith = getOpenWith(response, httpRegion);
  if (response?.rawBody && openWith) {
    const fileName = await writeTempFileName(response.rawBody, utils.getDisplayName(httpRegion, 'response'), getExtension(response, httpRegion));
    if (fileName) {
      await commands.executeCommand('vscode.openWith', Uri.file(fileName), openWith);
      return true;
    }
  }
  return false;
}

function getOpenWith(response: HttpResponse, httpRegion?: HttpRegion): string | undefined {

  if (httpRegion?.metaData?.openWith) {
    return httpRegion.metaData.openWith;
  }
  if (utils.isMimeTypeImage(response.contentType)) {
    return 'imagePreview.previewEditor';
  }
  if (utils.isMimeTypePdf(response.contentType)
    && extensions.getExtension('tomoki1207.pdf')) {
    return 'pdf.preview';
  }
  return undefined;
}
