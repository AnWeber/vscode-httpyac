
import * as vscode from 'vscode'
import { DocumentStore } from '../documentStore';

import * as fs   from 'fs';
import * as path from 'path';

// thanks to https://github.com/abierbaum/vscode-file-peek

export class HttpDefinitionProvider implements vscode.DefinitionProvider {

  protected fileSearchExtensions: string[] = ['json'];

  constructor(readonly documentStore: DocumentStore){
    
  }

  provideDefinition(document: vscode.TextDocument, 
                    position: vscode.Position, 
                    token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    let working_dir = path.dirname(document.fileName);
    let word        = document.getText(document.getWordRangeAtPosition(position));
    let line        = document.lineAt(position);

    //console.log('====== peek-file definition lookup ===========');
    console.log('word: ' + word);
    console.log('line: ' + line.text);

    // We are looking for strings with filenames
    // - simple hack for now we look for the string with our current word in it on our line
    //   and where our cursor position is inside the string
    let re_str = `^<@?\\w*\\s+(.*?${word}.*?)\\s*$`
    let match = line.text.match(re_str);

    this.log_debug('re_str: ', re_str);
    this.log_debug("   Match: ", match);

    if (match){
      let potential_fname = match[1] || match[2];
      let match_index:number  = match.index || 0;
      let match_start:number = match_index;
      let match_end:number = match_index + potential_fname.length;

      // Verify the match string is at same location as cursor
      if((position.character >= match_start) &&
          (position.character <= match_end))
      {
          let full_path   = path.resolve(working_dir, potential_fname);
          this.log_debug(" Match: ", match);
          this.log_debug(" Fname: ", potential_fname);
          this.log_debug("  Full: ", full_path);

          // Find all potential paths to check and return the first one found
          let potential_fnames = this.getPotentialPaths(full_path);
          this.log_debug(" potential fnames: ", potential_fnames);

          let found_fname = potential_fnames.find((fname_full) => {
            this.log_debug(" checking: ", fname_full);
            return fs.existsSync(fname_full);
          });
          if (found_fname != null) {
            this.log_debug('found: ', found_fname);
            return new vscode.Location(vscode.Uri.file(found_fname), new vscode.Position(0, 1));
          }
      }
    }

    return null;
  }

  private log_debug(message:string, obj:any):void{
    console.log(message, obj);
  }

  getPotentialPaths(lookupPath: string): string[] {
    let potential_paths: string[] = [lookupPath];

    // Add on list where we just add the file extension directly
    this.fileSearchExtensions.forEach((extStr) => {
       potential_paths.push(lookupPath + extStr);
    });

    // if we have an extension, then try replacing it.
    let parsed_path = path.parse(lookupPath);
    if (parsed_path.ext !== "") {
       this.fileSearchExtensions.forEach((extStr) => {
          const new_path = path.format({
             base: parsed_path.name + extStr,
             dir: parsed_path.dir,
             ext: extStr,
             name: parsed_path.name,
             root: parsed_path.root
          });
          potential_paths.push(new_path);
       });
    }

    return potential_paths;
 }


}