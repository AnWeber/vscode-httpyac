import { workspace, window, languages, Uri, FileType } from 'vscode';
import { FileEnconding, PathLike, io } from 'httpyac';


export function initFileProvider(): void {
  io.fileProvider.isAbsolute = async (fileName: PathLike) => {
    const uri = toUri(fileName);
    return uri && await io.fileProvider.exists(uri);
  };
  io.fileProvider.dirname = (fileName: string) => {
    const uri = toUri(fileName);
    if (uri) {
      if (uri.scheme === 'untitled') {
        const editor = window.visibleTextEditors.find(obj => languages.match({ language: 'http', scheme: 'file' }, obj.document));
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
        const stats = (await workspace.fs.stat(uri));
        return !!stats;
      }
      return false;
    } catch (err) {
      return false;
    }
  };
  io.fileProvider.readFile = async (fileName: PathLike, encoding: FileEnconding): Promise<string> => {
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
    }
    throw new Error('No valid uri');
  };

  io.fileProvider.readdir = async (dirname: PathLike): Promise<string[]> => {
    const uri = toUri(dirname);
    if (uri) {
      const filestats = await workspace.fs.stat(uri);
      if (filestats.type === FileType.Directory) {
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
    if (uri) {
      return uri.fsPath;
    }
    throw new Error('No valid uri');
  };
}

interface VirtualDocument{
  uri: Uri,
  fileUri: Uri;
  toString(): string;
}

export function toUri(pathLike: PathLike): Uri | false {
  if (typeof pathLike === 'string') {
    return Uri.file(pathLike);
  }
  if (pathLike instanceof Uri) {
    return pathLike;
  }
  if (isVirtualDocument(pathLike)) {
    return pathLike.fileUri || pathLike.uri;
  }
  return false;
}

function isVirtualDocument(pathLike: PathLike): pathLike is VirtualDocument {
  const virtualDocument = pathLike as VirtualDocument;
  return !!virtualDocument.uri;
}
