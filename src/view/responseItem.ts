import { ResponseItem as IResponseItem } from '../extensionApi';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';
import { extension } from 'mime-types';
import { v4 as uuidv4 } from 'uuid';

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

function getExtension(response: httpyac.HttpResponse, httpRegion?: httpyac.HttpRegion) : string {
  if (httpRegion?.metaData?.extension) {
    return httpRegion.metaData.extension;
  }
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
  return extension(response?.contentType?.contentType || 'application/octet-stream') || 'json';
}
