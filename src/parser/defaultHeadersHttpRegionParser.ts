
import { HttpRegionParserResult,  HttpRegionParser, ParserContext, utils, ProcessorContext } from 'httpyac';
import {getConfigSetting} from '../config';

export class DefaultHeadersHttpRegionParser implements HttpRegionParser{


  async parse(lineReader: unknown, context: ParserContext): Promise<HttpRegionParserResult>{
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.request) {
      httpRegion.actions.splice(utils.actionProcessorIndexAfterRequest(httpRegion), 0,
        {
          type: 'settings_default_headers',
          processor: defaultHeadersActionProcessor,
        });
    }
  }
}

async function defaultHeadersActionProcessor (data: unknown, context: ProcessorContext) {
  const defaultHeaders = getConfigSetting<Record<string, string>>('requestDefaultHeaders');
  if (context.request && defaultHeaders) {
    for (const [key, value] of Object.entries(defaultHeaders)) {
      if (!context.request.headers[key]) {
        context.request.headers[key] = value;
      }
    }
  }
  return true;
}
