import { ResponseItem } from '../extensionApi';

export async function noResponseViewResponseHandler(responseItem: ResponseItem): Promise<boolean> {
  if (responseItem.metaData.noResponseView) {
    return true;
  }
  return false;
}
