import { workspace, Uri } from 'vscode';
import { fileProvider, FileEnconding, WatchDispose, PathLike } from 'httpyac';

export function initVscodeFileProvider(): void {


  fileProvider.dirname = (fileName: string) => {
    const uri = toUri(fileName);
    if (uri) {
      return Uri.joinPath(uri, '..');
    }
    throw new Error('No valid uri');
  };

  fileProvider.joinPath = (fileName: PathLike, path: string): PathLike => {
    const uri = toUri(fileName);
    if (uri) {
      return Uri.joinPath(uri, path);
    }
    throw new Error('No valid uri');
  };
  fileProvider.toString = (fileName: PathLike): string => {
    const uri = toUri(fileName);
    if (uri) {
      return uri.toString();
    }
    throw new Error('No valid uri');
  };

  fileProvider.exists = async (fileName: PathLike): Promise<boolean> => {
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
  fileProvider.readFile = async (fileName: PathLike, encoding: FileEnconding): Promise<string> => {
    const uri = toUri(fileName);
    if (uri) {
      const file = await workspace.fs.readFile(uri);
      return Buffer.from(file).toString(encoding);
    }
    throw new Error('No valid uri');
  };
  fileProvider.readBuffer = async (fileName: PathLike) => {
    const uri = toUri(fileName);
    if (uri) {
      const file = await workspace.fs.readFile(uri);
      return Buffer.from(file);
    }
    throw new Error('No valid uri');
  };

  fileProvider.readdir = async (dirname: PathLike): Promise<string[]> => {
    const uri = toUri(dirname);
    if (uri) {
      const result = await workspace.fs.readDirectory(uri);
      return result.map(([file]) => file);
    }
    throw new Error('No valid uri');
  };
  fileProvider.watchFile = (fileName: PathLike, listener: () => void): WatchDispose => {
    const uri = toUri(fileName);
    if (uri) {
      const result = workspace.createFileSystemWatcher(uri.fsPath);
      result.onDidChange(listener);
      return () => result.dispose();
    }
    throw new Error('No valid uri');
  };


}


function toUri(fileName: PathLike): Uri | false {
  if (typeof fileName === 'string') {
    return Uri.file(fileName);
  }
  if (fileName instanceof Uri) {
    return fileName;
  }
  return false;
}
