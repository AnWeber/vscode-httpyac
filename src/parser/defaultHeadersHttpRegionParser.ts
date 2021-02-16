
import { HttpRegionParserResult,  HttpRegionParser, ParserContext } from 'httpyac';
import {getConfigSetting} from '../config';

export class DefaultHeadersHttpRegionParser implements HttpRegionParser{


  async parse(lineReader: unknown, context: ParserContext): Promise<HttpRegionParserResult>{
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.request) {
      const defaultHeaders = getConfigSetting<Record<string, string>>('requestDefaultHeaders');
      if (defaultHeaders) {
        for (const [key, value] of Object.entries(defaultHeaders)) {
          if (!httpRegion.request.headers[key]) {
            httpRegion.request.headers[key] = value;
          }
        }
      }
    }
  }
}
