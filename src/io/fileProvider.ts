import { workspace, Uri, FileType } from 'vscode';
import { io } from 'httpyac';


export function initFileProvider(): void {
  io.fileProvider.isAbsolute = (fileName: io.PathLike) => {
    const uri = toUri(fileName);
    return !!uri;
  };
  io.fileProvider.dirname = (fileName: string) => {
    const uri = toUri(fileName);
    if (uri) {
      return Uri.joinPath(uri, '..');
    }
    throw new Error('No valid uri');
  };

  io.fileProvider.joinPath = (fileName: io.PathLike, path: string): io.PathLike => {
    const uri = toUri(fileName);
    if (uri) {
      return Uri.joinPath(uri, path);
    }
    throw new Error('No valid uri');
  };

  io.fileProvider.exists = async (fileName: io.PathLike): Promise<boolean> => {
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
  io.fileProvider.readFile = async (fileName: io.PathLike, encoding: io.FileEnconding): Promise<string> => {
    const uri = toUri(fileName);
    if (uri) {
      const file = await workspace.fs.readFile(uri);
      return Buffer.from(file).toString(encoding);
    }
    throw new Error('No valid uri');
  };
  io.fileProvider.readBuffer = async (fileName: io.PathLike) => {
    const uri = toUri(fileName);
    if (uri) {
      const file = await workspace.fs.readFile(uri);
      return Buffer.from(file);
    }
    throw new Error('No valid uri');
  };

  io.fileProvider.readdir = async (dirname: io.PathLike): Promise<string[]> => {
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

  io.fileProvider.fsPath = (fileName: io.PathLike) => {
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

export function toUri(pathLike: io.PathLike): Uri | false {
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

function isVirtualDocument(pathLike: io.PathLike): pathLike is VirtualDocument {
  const virtualDocument = pathLike as VirtualDocument;
  return !!virtualDocument.uri;
}
