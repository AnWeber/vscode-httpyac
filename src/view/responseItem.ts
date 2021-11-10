import { ResponseItem as IResponseItem } from '../extensionApi';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';
import { extension } from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import { getConfigSetting } from '../config';

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
    this.id = uuidv4();
    this.name = this.getName(response, httpRegion);
    this.line = httpRegion?.symbol?.startLine;
    this.created = new Date();

    this.openWith = getOpenWith(response, httpRegion);
    this.extension = getExtension(response, httpRegion);
    this.metaData = httpRegion?.metaData || {};
    this.testResults = httpRegion?.testResults;
    this.response = response;
    this.isCachedResponse = false;
  }


  private getName(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) {
    if (httpRegion) {
      return httpRegion.symbol.name;
    }
    if (response.request) {
      return `${response.request?.method} ${response.request?.url}`;
    }
    return `${response.protocol} ${response.statusCode}`;
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
  if (httpyac.utils.isMimeTypePdf(response.contentType)
    && vscode.extensions.getExtension('tomoki1207.pdf')) {
    return 'pdf.preview';
  }
  return undefined;
}

function getExtension(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion): string {
  const extensionRecognitions: Array<ExtensionRecognition> = [
    getExtensionByMetaData,
  ];

  const config = getConfigSetting();
  if (config.responseViewExtensionRecognition === 'mimetype') {
    extensionRecognitions.push(getExtensionByMimeTypes, getExtensionByUrl);
  } else {
    extensionRecognitions.push(getExtensionByUrl, getExtensionByMimeTypes);
  }
  extensionRecognitions.push(getExtensionByRegexMimetype);

  for (const extensionRecognition of extensionRecognitions) {
    const result = extensionRecognition(response, httpRegion);
    if (result) {
      return result;
    }
  }
  return 'json';
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
      return url.slice(dotIndex + 1);
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


function getExtensionByRegexMimetype(response: httpyac.HttpResponse) : string {
  if (response?.contentType) {
    const contentType = response?.contentType;
    if (httpyac.utils.isMimeTypeJSON(contentType)) {
      return 'json';
    }
    if (httpyac.utils.isMimeTypeJavascript(contentType)) {
      return 'js';
    }
    if (httpyac.utils.isMimeTypeXml(contentType)) {
      return 'html';
    }
    if (httpyac.utils.isMimeTypeHtml(contentType)) {
      return 'xml';
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
  }
  return 'txt';
}
