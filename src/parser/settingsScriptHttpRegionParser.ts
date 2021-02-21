
import { log, HttpRegionParserResult,  HttpRegionParser, ParserContext, ProcessorContext, actionProcessor } from 'httpyac';
import { getConfigSetting } from '../config';
import { isAbsolute, join } from 'path';
import { promises as fs } from 'fs';
import { workspace } from 'vscode';



export class SettingsScriptHttpRegionParser implements HttpRegionParser{


  async parse(lineReader: unknown, context: ParserContext): Promise<HttpRegionParserResult>{
    return false;
  }

  close({ httpRegion }: ParserContext): void {
    if (httpRegion.request) {
      httpRegion.actions.splice(0, 0, {
        type: 'settings_js',
        processor: this.executeSettingsScript,
      });
    }
  }

  async executeSettingsScript(data: unknown, context: ProcessorContext): Promise<boolean>{
    const fileName = getConfigSetting<string>('httpRegionScript');
    if (fileName) {
      const scriptData = await readScriptData(fileName);
      if (scriptData) {
        return await actionProcessor.jsActionProcessor(scriptData, context);
      }
    }
    return true;
  }
}

async function readScriptData(fileName: string): Promise<{script: string, lineOffset: number} |undefined> {
  if (isAbsolute(fileName)) {
    try {
      const script = await fs.readFile(fileName, 'utf-8');
      return { script, lineOffset: 0 };
    } catch (err) {
      log.trace(`file not found: ${fileName}`);
    }
  } else if (workspace.workspaceFolders) {
    for (const workspaceFolder of workspace.workspaceFolders) {
      const file = join(workspaceFolder.uri.fsPath, fileName);
      try {
        const script = await fs.readFile(file, 'utf-8');
        return {
          script,
          lineOffset: 0
        };
      } catch (err) {
        log.trace(`file not found: ${file}`);
      }
    }
  }
  return undefined;
}
