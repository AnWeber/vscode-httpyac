import { ContentType, HttpRegion, HttpResponse, utils } from 'httpyac';
import { extension } from 'mime-types';
import { dir } from 'tmp-promise';
import { join, extname } from 'path';
import { promises as fs } from 'fs';
import * as vscode from 'vscode';
import { getConfigSetting, ResponseViewContent } from '../config';

export const TempPathFolder = 'httpyac_tmp';

export function getExtension(httpRegion: HttpRegion) : string {
  if (httpRegion.metaData.extension) {
    return httpRegion.metaData.extension;
  }
  if (httpRegion.request?.url) {
    const indexQuery = httpRegion.request.url.indexOf('?');
    let url = httpRegion.request.url;
    if (indexQuery >= 0) {
      url = url.slice(0, indexQuery);
    }
    const ext = extname(url);
    if (ext && [4, 5].indexOf(ext.length) >= 0) {
      return ext.slice(1);
    }
  }
  return extension(httpRegion?.response?.contentType?.contentType || 'application/octet-stream') || 'json';
}


export async function writeTempFileName(content: Buffer, httpRegion: HttpRegion, extension?: string | undefined) : Promise<string> {
  const ext = extension || getExtension(httpRegion);
  const { path } = await dir();
  const name = utils.shortenFileName(utils.replaceInvalidChars(utils.getRegionName(httpRegion, 'response')));
  await fs.mkdir(join(path, TempPathFolder));
  const fileName = join(path, TempPathFolder, `${name}.${ext}`);
  await fs.writeFile(fileName, content);
  return fileName;
}

export function getContent(response: HttpResponse, viewContent?: ResponseViewContent | undefined) : string {
  const result = [];

  if (viewContent === 'exchange' && response.request) {
    result.push(`${response.request.method} ${response.request.url}`);
    result.push(...Object.entries(response.request.headers)
      .filter(([key]) => !key.startsWith(':'))
      .map(([key, value]) => `${key}: ${value}`)
      .sort());
    if (response.request.body) {
      result.push('');
      if (utils.isString(response.request.body)) {
        result.push(response.request.body);
      } else if (Buffer.isBuffer(response.request.body)) {
        result.push(`buffer<${response.request.body.byteLength}>`);
      }
    }
    result.push('');
  }

  if (viewContent && ['headers', 'full', 'exchange'].indexOf(viewContent) >= 0) {
    result.push(`HTTP/${response.httpVersion || ''} ${response.statusCode} ${response.statusMessage}`);
    result.push(...Object.entries(response.headers)
      .filter(([key]) => !key.startsWith(':'))
      .map(([key, value]) => `${key}: ${value}`)
      .sort());
    result.push('');
  }

  if (!viewContent || viewContent !== 'headers') {
    if (response?.body) {
      if (utils.isString(response.body)) {
        if (response.parsedBody
          && getConfigSetting().responseViewPrettyPrint
          && getConfigSetting().responseViewPreserveFocus) {
          result.push(JSON.stringify(response.parsedBody, null, 2));
        } else {
          result.push(response.body);
        }
      } else {
        result.push(JSON.stringify(response.body, null, 2));
      }
    }
  }
  return utils.toMultiLineString(result);
}


export function getLanguageId(contentType: ContentType | undefined, viewContent?: ResponseViewContent | undefined) : string {
  if (viewContent && viewContent !== 'body') {
    return 'http';
  }
  if (contentType) {
    const languageMap = getConfigSetting().responseViewLanguageMap;
    if (languageMap && languageMap[contentType.mimeType]) {
      return languageMap[contentType.mimeType];
    }
    if (utils.isMimeTypeJSON(contentType)) {
      return 'json';
    }
    if (utils.isMimeTypeJavascript(contentType)) {
      return 'javascript';
    }
    if (utils.isMimeTypeXml(contentType)) {
      return 'html';
    }
    if (utils.isMimeTypeHtml(contentType)) {
      return 'html';
    }
    if (utils.isMimeTypeCSS(contentType)) {
      return 'css';
    }
    if (utils.isMimeTypeMarkdown(contentType)) {
      return 'markdown';
    }
  }
  return 'plaintext';
}

export async function showTextEditor(document: vscode.TextDocument, preview: boolean) : Promise<vscode.TextEditor> {
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
