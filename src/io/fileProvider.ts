import { FileEncoding, PathLike, io } from 'httpyac';
import { workspace, window, languages, Uri, FileType } from 'vscode';
import { EOL } from 'os';

export function initFileProvider(): void {
  io.fileProvider.EOL = EOL;
  io.fileProvider.isAbsolute = async (fileName: PathLike) => {
    const uri = toUri(fileName);
    return uri && (await io.fileProvider.exists(uri));
  };
  io.fileProvider.dirname = (fileName: string) => {
    const uri = toUri(fileName);
    if (uri) {
      if (uri.scheme === 'untitled') {
        const editor = window.visibleTextEditors.find(obj =>
          languages.match({ language: 'http', scheme: 'file' }, obj.document)
        );
        if (editor) {
          return Uri.joinPath(editor.document.uri, '..');
        }
        if (workspace.workspaceFolders && workspace.workspaceFolders?.length > 0) {
          return workspace.workspaceFolders[0].uri;
        }
        return undefined;
      }
      return Uri.joinPath(uri, '..');
    }
    throw new Error('No valid uri');
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

  io.fileProvider.joinPath = (fileName: PathLike, path: string): PathLike => {
    const uri = toUri(fileName);
    if (uri) {
      return Uri.joinPath(uri, path);
    }
    throw new Error('No valid uri');
  };

  io.fileProvider.exists = async (fileName: PathLike): Promise<boolean> => {
    try {
      const uri = toUri(fileName);
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
      const file = await workspace.fs.readFile(uri);
      return Buffer.from(file).toString(encoding);
    }
    throw new Error('No valid uri');
  };
  io.fileProvider.readBuffer = async (fileName: PathLike) => {
    const uri = toUri(fileName);
    if (uri) {
      const file = await workspace.fs.readFile(uri);
      return Buffer.from(file);
    }
    throw new Error('No valid uri');
  };
  io.fileProvider.writeBuffer = async (fileName: PathLike, buffer: Buffer) => {
    const uri = toUri(fileName);
    if (uri) {
      await workspace.fs.writeFile(uri, buffer);
    } else {
      throw new Error('No valid uri');
    }
  };

  io.fileProvider.readdir = async (dirname: PathLike): Promise<string[]> => {
    const uri = toUri(dirname);
    if (uri) {
      const fileStat = await workspace.fs.stat(uri);
      if (fileStat.type === FileType.Directory) {
        const result = await workspace.fs.readDirectory(uri);
        return result.map(([file]) => file);
      }
      io.log.trace(`${uri.toString()} is no directory`);
      return [];
    }
    throw new Error('No valid uri');
  };

  io.fileProvider.fsPath = (fileName: PathLike) => {
    const uri = toUri(fileName);
    if (uri && uri.scheme === 'file') {
      try {
        return uri.fsPath;
      } catch (err) {
        io.log.debug(err);
      }
    }
    return undefined;
  };
}

interface VirtualDocument {
  uri: Uri;
  fileUri: Uri;
  toString(): string;
}

export function toUri(pathLike: PathLike): Uri | false {
  let result: Uri | false = false;
  if (typeof pathLike === 'string') {
    result = Uri.file(pathLike);
  } else if (pathLike instanceof Uri) {
    result = pathLike;
  } else if (isVirtualDocument(pathLike)) {
    result = pathLike.fileUri || pathLike.uri;
  }
  if (result && !workspace.isTrusted) {
    if (!workspace.getWorkspaceFolder(result)) {
      const message = `Not Trusted Workspace cannot access uri outside of workspace.`;
      io.userInteractionProvider.showWarnMessage?.(message);
      io.log.warn(message);
      result = false;
    }
  }
  return result;
}

function isVirtualDocument(pathLike: PathLike): pathLike is VirtualDocument {
  const virtualDocument = pathLike as VirtualDocument;
  return !!virtualDocument.uri;
}

function isUriLanguageId(uri: Uri, languageId: string) {
  const editor = window.visibleTextEditors.find(obj => obj.document?.uri === uri);
  if (editor && editor.document.languageId === languageId) {
    return true;
  }
  return false;
}
