
import { HttpRegionParserResult,  HttpRegionParser, ParserContext, utils } from 'httpyac';
import { window } from 'vscode';


export class NoteMetaHttpRegionParser implements HttpRegionParser{


  async parse(lineReader: unknown, context: ParserContext): Promise<HttpRegionParserResult>{
    return false;
  }

  close({httpRegion}: ParserContext): void {
    if (httpRegion.metaData.note) {
      const note = httpRegion.metaData.note || `Are you sure you want to send the request ${utils.getName(httpRegion)}?`;
      httpRegion.actions.splice(0, 0, {
        type: 'note',
        processor: async () => {
          const buttonTitle = 'Execute';
          const result = await window.showWarningMessage(note, { modal: true}, buttonTitle);
          return result === buttonTitle;
        }
      });
    }
  }
}



