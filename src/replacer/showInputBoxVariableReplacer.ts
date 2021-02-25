
import { ProcessorContext } from 'httpyac';
import * as vscode from 'vscode';

const lastValue: Record<string, string> = {};

export async function showInputBoxVariableReplacer(text: string, type: string, context: ProcessorContext) {

  const variableRegex = /\{{2}(.+?)\}{2}/g;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, variable] = match;

    const matchInput = /^\$input\s*(?<placeholder>[^\$]*)(\$value:\s*(?<value>.*))?\s*$/.exec(variable);
    if (matchInput?.groups?.placeholder) {

      const placeholder = matchInput.groups.placeholder;
      const replacement = await vscode.window.showInputBox({
        placeHolder: placeholder,
        value: lastValue[placeholder] || matchInput.groups.value,
        prompt: placeholder
      });
      if (replacement) {
        lastValue[placeholder] = replacement;
        result = result.replace(searchValue, `${replacement}`);
      } else if(context.cancelVariableReplacer) {
        context.cancelVariableReplacer();
      }
    }


  }
  return result;
}