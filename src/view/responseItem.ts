import { getConfigSetting } from '../config';
import { ResponseItem as IResponseItem } from '../extensionApi';
import * as httpyac from 'httpyac';
import { extension } from 'mime-types';
import { v4 as uuid } from 'uuid';
import * as vscode from 'vscode';

export class ResponseItem implements IResponseItem {
  readonly id: string;
  readonly created: Date;
  readonly name: string;
  readonly line?: number;
  readonly openWith?: string;
  readonly extension: string;
  readonly testResults?: Array<httpyac.TestResult>;
  readonly metaData: Record<string, unknown>;
  readonly response: httpyac.HttpResponse;

  documentUri?: vscode.Uri;
  responseUri?: vscode.Uri;
  isCachedResponse: boolean;
  loadResponseBody?: () => Promise<void>;

  constructor(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) {
    this.id = uuid();
    this.name = getName(response, httpRegion);
    this.line = httpRegion?.symbol?.startLine;
    this.created = new Date();

    this.openWith = getOpenWith(response, httpRegion);
    this.extension = getExtension(response, httpRegion);
    this.metaData = httpRegion?.metaData || {};
    this.testResults = httpRegion?.testResults;
    this.response = response;
    this.isCachedResponse = false;
  }

  public async removeDocument(): Promise<void> {
    if (this.documentUri) {
      try {
        await vscode.workspace.fs.delete(this.documentUri);
      } catch (err) {
        httpyac.io.log.error(err);
      } finally {
        delete this.documentUri;
      }
    }
  }
}

function getOpenWith(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion): string | undefined {
  if (httpRegion?.metaData?.openWith) {
    return httpRegion.metaData.openWith;
  }
  if (httpyac.utils.isMimeTypeImage(response.contentType)) {
    return 'imagePreview.previewEditor';
  }
  if (httpyac.utils.isMimeTypePdf(response.contentType) && vscode.extensions.getExtension('tomoki1207.pdf')) {
    return 'pdf.preview';
  }
  return undefined;
}

type GetNameAction = (response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) => string | undefined;

function getName(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion): string {
  const config = getConfigSetting();

  const getMetaDataName: GetNameAction = (_response, httpRegion) => httpRegion?.metaData?.name;
  const getResponseName: GetNameAction = response => response.name;

  let nameGetters: Array<GetNameAction>;
  if (config.responseViewPreferredFilename === 'metaData') {
    nameGetters = [getMetaDataName, getResponseName];
  } else {
    nameGetters = [getResponseName, getMetaDataName];
  }

  for (const getName of nameGetters) {
    const result = getName(response, httpRegion);
    if (result) {
      return result;
    }
  }
  return `${response.protocol} ${response.statusCode}`;
}

function getExtension(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion): string {
  const extensionRecognitions: Array<ExtensionRecognition> = [getExtensionByMetaData];

  const config = getConfigSetting();
  if (config.responseViewExtensionRecognition === 'mimetype') {
    extensionRecognitions.push(getExtensionByMimeTypes, getExtensionByUrl, getExtensionByRegexMimetype);
  } else if (config.responseViewExtensionRecognition === 'regex') {
    extensionRecognitions.push(getExtensionByRegexMimetype, getExtensionByUrl, getExtensionByMimeTypes);
  } else {
    extensionRecognitions.push(getExtensionByUrl, getExtensionByMimeTypes, getExtensionByRegexMimetype);
  }

  for (const extensionRecognition of extensionRecognitions) {
    const result = extensionRecognition(response, httpRegion);
    if (result) {
      return result;
    }
  }
  return 'txt';
}

type ExtensionRecognition = (response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) => string | false;

function getExtensionByMetaData(_response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) {
  if (httpRegion?.metaData?.extension) {
    return httpRegion.metaData.extension;
  }
  return false;
}

function getExtensionByUrl(_response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) {
  if (httpRegion?.request?.url) {
    const indexQuery = httpRegion.request.url.indexOf('?');
    let url = httpRegion.request.url;
    if (indexQuery >= 0) {
      url = url.slice(0, indexQuery);
    }
    const dotIndex = url.lastIndexOf('.');
    if (dotIndex > 0 && [4, 5].indexOf(url.length - dotIndex) >= 0) {
      const extension = url.slice(dotIndex + 1);
      if (extension.indexOf('}}') < 0) {
        return extension;
      }
    }
  }
  return false;
}

function getExtensionByMimeTypes(response: httpyac.HttpResponse) {
  if (response?.contentType?.contentType) {
    return extension(response?.contentType?.contentType);
  }
  return false;
}

function getExtensionByRegexMimetype(response: httpyac.HttpResponse): string | false {
  if (response?.contentType) {
    const contentType = response?.contentType;
    if (httpyac.utils.isMimeTypeJSON(contentType)) {
      return 'json';
    }
    if (httpyac.utils.isMimeTypeJavascript(contentType)) {
      return 'js';
    }
    if (httpyac.utils.isMimeTypeXml(contentType)) {
      return 'xml';
    }
    if (httpyac.utils.isMimeTypeHtml(contentType)) {
      return 'html';
    }
    if (httpyac.utils.isMimeTypeCSS(contentType)) {
      return 'css';
    }
    if (httpyac.utils.isMimeTypeMarkdown(contentType)) {
      return 'md';
    }
    if (httpyac.utils.isMimeTypePdf(contentType)) {
      return 'pdf';
    }
    if (contentType?.mimeType === 'text/plain') {
      return 'txt';
    }
  }
  return false;
}
