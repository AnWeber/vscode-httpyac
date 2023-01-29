import { FileEncoding, PathLike, io } from 'httpyac';
import { workspace, window, languages, Uri, FileType } from 'vscode';
import { EOL } from 'os';
import { isAbsolute } from 'path';

export function initFileProvider(): void {
  io.fileProvider.EOL = EOL;
  io.fileProvider.isAbsolute = async (path: PathLike) => {
    if (typeof path === 'string') {
      return isAbsolute(path);
    }
    const uri = toUri(path);
    return !!uri && (await io.fileProvider.exists(uri));
  };
  io.fileProvider.dirname = (path: string) => {
    const uri = toUri(path);
    if (uri) {
      try {
        if (uri.scheme === 'untitled') {
          const editor = window.visibleTextEditors.find(obj =>
            languages.match({ language: 'http', scheme: 'file' }, obj.document)
          );
          if (editor) {
            return io.fileProvider.joinPath(editor.document.uri, '..');
          }
          if (workspace.workspaceFolders && workspace.workspaceFolders?.length > 0) {
            return workspace.workspaceFolders[0].uri;
          }
          return undefined;
        }
      } catch (err) {
        io.log.error(`Error dirname ${io.fileProvider.toString(path)}`);
        throw err;
      }
      return io.fileProvider.joinPath(uri, '..');
    }
    throw new Error(`No valid uri: ${path}`);
  };
  io.fileProvider.hasExtension = (fileName: PathLike, ...extensions: Array<string>) => {
    const uri = toUri(fileName);
    if (uri) {
      if (extensions.some(ext => uri.toString().endsWith(ext))) {
        return true;
      }
      if (extensions.indexOf('markdown') >= 0) {
        return isUriLanguageId(uri, 'markdown');
      }
      if (extensions.indexOf('asciidoc') >= 0) {
        return isUriLanguageId(uri, 'asciidoc');
      }
    }
    return false;
  };

  io.fileProvider.joinPath = (path: PathLike, joinPath: string): PathLike => {
    try {
      const uri = toUri(path);
      if (uri) {
        return Uri.joinPath(uri, joinPath);
      }
    } catch (err) {
      io.log.error(`Error joinPath ${io.fileProvider.toString(path)}`);
      throw err;
    }
    io.log.error(`joinPath failed for ${path}`, path);
    throw new Error(`No valid uri: ${path}`);
  };

  io.fileProvider.exists = async (path: PathLike): Promise<boolean> => {
    try {
      const uri = toUri(path);
      if (uri) {
        const stats = await workspace.fs.stat(uri);
        return !!stats;
      }
      return false;
    } catch (err) {
      return false;
    }
  };
  io.fileProvider.readFile = async (fileName: PathLike, encoding: FileEncoding): Promise<string> => {
    const uri = toUri(fileName);
    if (uri) {
      try {
        const file = await workspace.fs.readFile(uri);
        return Buffer.from(file).toString(encoding);
      } catch (err) {
        io.log.error(`Error readFile ${io.fileProvider.toString(fileName)}`);
        throw err;
      }
    }
    io.log.error(`readFile failed for ${fileName}`, fileName);
    throw new Error(`No valid uri: ${fileName}`);
  };
  io.fileProvider.readBuffer = async (fileName: PathLike) => {
    const uri = toUri(fileName);
    if (uri) {
      try {
        const file = await workspace.fs.readFile(uri);
        return Buffer.from(file);
      } catch (err) {
        io.log.error(`Error readBuffer ${io.fileProvider.toString(fileName)}`);
        throw err;
      }
    }
    io.log.error(`readBuffer failed for ${fileName}`, fileName);
    throw new Error(`No valid uri: ${fileName}`);
  };
  io.fileProvider.writeBuffer = async (fileName: PathLike, buffer: Buffer) => {
    const uri = toUri(fileName);
    if (uri) {
      try {
        await workspace.fs.writeFile(uri, buffer);
      } catch (err) {
        io.log.error(`Error writeBuffer ${io.fileProvider.toString(fileName)}`);
        throw err;
      }
    } else {
      io.log.error(`writeBuffer failed for ${fileName}`, fileName);
      throw new Error(`No valid uri: ${fileName}`);
    }
  };

  io.fileProvider.readdir = async (dirname: PathLike): Promise<string[]> => {
    const uri = toUri(dirname);
    if (uri) {
      try {
        const fileStat = await workspace.fs.stat(uri);
        if (fileStat.type === FileType.Directory) {
          const result = await workspace.fs.readDirectory(uri);
          return result.map(([file]) => file);
        }
        io.log.trace(`${uri.toString()} is no directory`);
        return [];
      } catch (err) {
        io.log.error(`Error readDir ${io.fileProvider.toString(dirname)}`);
        throw err;
      }
    }
    io.log.error(`readdir failed for ${dirname}`, dirname);
    throw new Error(`No valid uri: ${dirname}`);
  };

  io.fileProvider.fsPath = (path: PathLike) => {
    const uri = toUri(path);
    try {
      return uri?.fsPath;
    } catch (err) {
      io.log.debug(err);
    }
    return undefined;
  };
}

export function toUri(pathLike: PathLike): Uri | undefined {
  let result: Uri | undefined;
  if (typeof pathLike === 'string') {
    result = Uri.file(pathLike);
  } else if (pathLike instanceof Uri) {
    result = pathLike;
    if (result && result.scheme === 'vscode-notebook-cell') {
      result = Uri.file(result.fsPath);
    }
  }
  if (result && !workspace.isTrusted) {
    if (!workspace.getWorkspaceFolder(result)) {
      const message = `Not Trusted Workspace cannot access uri outside of workspace.`;
      io.userInteractionProvider.showWarnMessage?.(message);
      io.log.warn(message);
      result = undefined;
    }
  }
  if (!result) {
    io.log.error(`toUri failed for ${pathLike}`, pathLike);
  }
  return result;
}

function isUriLanguageId(uri: Uri, languageId: string) {
  const editor = window.visibleTextEditors.find(obj => obj.document?.uri === uri);
  if (editor && editor.document.languageId === languageId) {
    return true;
  }
  return false;
}
