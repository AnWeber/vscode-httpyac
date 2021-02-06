
import * as vscode from 'vscode';

export async function showQuickpickVariableReplacer(text: string) {

  const variableRegex = /\{{2}(.+?)\}{2}/g;
  let match: RegExpExecArray | null;
  let result = text;
  while ((match = variableRegex.exec(text)) !== null) {
    const [searchValue, variable] = match;

    const matchInput = /^\$pick\s*(?<placeholder>[^\$]*)(\$value:\s*(?<value>.*))\s*$/.exec(variable);
    if (matchInput?.groups?.placeholder && matchInput?.groups?.value) {

      const placeHolder = matchInput.groups.placeholder;
      const value = matchInput.groups.value;
      const replacement = await vscode.window.showQuickPick(value.split(','),{
          placeHolder
      });
      if (replacement) {
        result = result.replace(searchValue, `${replacement}`);
      }
    }


  }
  return result;
}