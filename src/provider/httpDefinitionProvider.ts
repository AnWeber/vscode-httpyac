import * as vscode from 'vscode';
import { DocumentStore } from '../documentStore';

import * as fs from 'fs';
import * as path from 'path';

// thanks to https://github.com/abierbaum/vscode-file-peek

export class HttpDefinitionProvider implements vscode.DefinitionProvider {
  private isDebug: boolean;
  protected fileSearchExtensions: string[] = ['json'];

  constructor(readonly documentStore: DocumentStore) {
    this.isDebug = false;
  }

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const working_dir = path.dirname(document.fileName);
    const word = document.getText(document.getWordRangeAtPosition(position));
    const line = document.lineAt(position);

    this.log_debug('====== peek-file definition lookup ===========', '');
    this.log_debug('word: ', word);
    this.log_debug('line: ', line.text);

    // We are looking for strings with filenames
    // - simple hack for now we look for the string with our current word in it on our line
    //   and where our cursor position is inside the string
    const re_str = `^<@?\\w*\\s+(.*?${word}.*?)\\s*$`;
    const match = line.text.match(re_str);

    this.log_debug('re_str: ', re_str);
    this.log_debug('   Match: ', match);

    if (match) {
      const potential_fname = match[1] || match[2];
      const match_index: number = match.index || 0;
      const match_start: number = match_index;
      const match_end: number = match_index + potential_fname.length;

      // Verify the match string is at same location as cursor
      if (position.character >= match_start && position.character <= match_end) {
        const full_path = path.resolve(working_dir, potential_fname);
        this.log_debug(' Match: ', match);
        this.log_debug(' Fname: ', potential_fname);
        this.log_debug('  Full: ', full_path);

        // Find all potential paths to check and return the first one found
        const potential_fnames: string[] = this.getPotentialPaths(full_path);
        this.log_debug(' potential fnames: ', potential_fnames);

        const found_fname = potential_fnames.find(fname_full => {
          this.log_debug(' checking: ', fname_full);
          return fs.existsSync(fname_full);
        });
        if (found_fname !== null) {
          const exact_found_fname: string = found_fname || '';
          this.log_debug('found: ', exact_found_fname);
          return new vscode.Location(vscode.Uri.file(exact_found_fname), new vscode.Position(0, 1));
        }
      }
    }

    return null;
  }

  private log_debug(message: string, obj: string[] | string | number | RegExpExecArray | null): void {
    if (this.isDebug) {
      console.debug(message, obj);
    }
  }

  getPotentialPaths(lookupPath: string): string[] {
    const potential_paths: string[] = [lookupPath];

    // Add on list where we just add the file extension directly
    this.fileSearchExtensions.forEach(extStr => {
      potential_paths.push(lookupPath + extStr);
    });

    // if we have an extension, then try replacing it.
    const parsed_path = path.parse(lookupPath);
    if (parsed_path.ext !== '') {
      this.fileSearchExtensions.forEach(extStr => {
        const new_path = path.format({
          base: parsed_path.name + extStr,
          dir: parsed_path.dir,
          ext: extStr,
          name: parsed_path.name,
          root: parsed_path.root,
        });
        potential_paths.push(new_path);
      });
    }

    return potential_paths;
  }
}
