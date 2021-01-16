 const {httpYacApi} = require('httpYac');
  const vscode = require('vscode');
  httpYacApi.httpRegionParsers.splice(2, 0, {
    parse: (lineReader,...args) => {
      const next = lineReader.next();
      if(next.value.textLine.startsWith('//')){
        vscode.window.showInformationMessage(next.value.textLine.substring(1));
        return {
          endLine: next.value.line,
          symbols: []
        };
      }
      return false;
    }
  });