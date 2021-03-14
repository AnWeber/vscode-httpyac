import { ContentType, HttpRegion, utils } from 'httpyac';
import { extension } from 'mime-types';
import { dir } from 'tmp-promise';
import { join, extname } from 'path';
import { promises as fs } from 'fs';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';

export const TempPathFolder = 'httpyac_tmp';

export function getExtension(httpRegion: HttpRegion) {
  if (httpRegion.metaData.extension) {
    return httpRegion.metaData.extension;
  } else if (httpRegion.request?.url) {
    const indexQuery = httpRegion.request.url.indexOf('?');
    let url = httpRegion.request.url;
    if (indexQuery >= 0) {
      url = url.substring(0, indexQuery);
    }
    const ext = extname(url);
    if (ext && [4,5].indexOf(ext.length) >= 0) {
      return ext.substring(1);
    }
  }
  return extension(httpRegion?.response?.contentType?.contentType || 'application/octet-stream') || 'json';
}


export async function writeTempFileName(content: Buffer, httpRegion: HttpRegion) {
  const ext = getExtension(httpRegion);
  const { path } = await dir();
  const name = utils.shortenFileName(utils.replaceInvalidChars(utils.getName(httpRegion, 'response')));
  await fs.mkdir(join(path, TempPathFolder));
  const fileName = join(path, TempPathFolder, `${name}.${ext}`);
  await fs.writeFile(fileName, content || content);
  return fileName;
}

export function getContent(httpRegion: HttpRegion) {
  let content: string = '';
  if (httpRegion.response?.body) {
    if (utils.isString(httpRegion.response.body)) {
      content = httpRegion.response.body;
      if (utils.isMimeTypeJSON(httpRegion.response.contentType)
        && getConfigSetting().responseViewPrettyPrint
        && getConfigSetting().responseViewPreserveFocus) {
        content = JSON.stringify(JSON.parse(content), null, 2);
      }
    } else {
      content = JSON.stringify(httpRegion.response.body, null, 2);
    }
  }
  return content;
}


export function getLanguageId(contentType: ContentType | undefined) {
  if (contentType) {
    const languageMap = getConfigSetting().responseViewLanguageMap;
    if (languageMap && languageMap[contentType.mimeType]) {
      return languageMap[contentType.mimeType];
    }
    if (utils.isMimeTypeJSON(contentType)) {
      return 'json';
    } else if (utils.isMimeTypeJavascript(contentType)) {
      return 'javascript';
    } else if (utils.isMimeTypeXml(contentType)) {
      return 'html';
    } else if (utils.isMimeTypeHtml(contentType)) {
      return 'html';
    } else if (utils.isMimeTypeCSS(contentType)) {
      return 'css';
    } else if (utils.isMimeTypeMarkdown(contentType)) {
      return 'markdown';
    }
  }
  return 'plaintext';
}

export async function showTextEditor(document: vscode.TextDocument, preview: boolean) {
  const config = getConfigSetting();
  let viewColumn = vscode.ViewColumn.Beside;
  if (config.responseViewColumn === 'current') {
    viewColumn = vscode.ViewColumn.Active;
  }
  return await vscode.window.showTextDocument(document, {
    viewColumn,
    preserveFocus: config.responseViewPreserveFocus,
    preview,
  });
}