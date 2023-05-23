import { getConfigSetting, ResponseViewContent } from '../config';
import { ResponseItem, ResponseHandler } from '../extensionApi';
import { StorageProvider } from '../io';
import { showTextEditor } from '../utils/textEditorUtils';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

export function previewResponseHandlerFactory(storageProvider: StorageProvider): ResponseHandler {
  return async function previewResponseHandler(responseItem: ResponseItem): Promise<boolean> {
    const config = getConfigSetting();

    if (config.responseViewMode !== 'none') {
      await responseItem.loadResponseBody?.();
      const response = responseItem.response;
      if (!response) {
        return false;
      }
      const responseViewContent = getResponseViewContext(config.responseViewContent, !!response?.body);

      let content: string | Buffer | undefined = response.rawBody;
      let extension = responseItem.extension;
      if (httpyac.utils.isString(response.body)) {
        if (config.responseViewContent && config.responseViewContent !== 'body') {
          content = getContent(response, config.responseViewContent);
          extension = 'http';
        } else if (response.prettyPrintBody && config.responseViewPrettyPrint) {
          content = response.prettyPrintBody;
        }
      }
      if (!content || content.length === 0) {
        content = getContent(response, responseViewContent);
        extension = 'http';
      }
      const fileName = config.responseViewMode === 'reuse' ? 'response' : `${responseItem.name}.${extension}`;
      const uri = await storageProvider.writeFile(content, fileName);
      let document: vscode.TextDocument;
      if (uri) {
        responseItem.documentUri = uri;
        document = await vscode.workspace.openTextDocument(uri);
        const languageMap = getConfigSetting().responseViewLanguageMap;
        if (languageMap && response?.contentType && languageMap[response.contentType.mimeType]) {
          const languageId = languageMap[response.contentType.mimeType];
          if (document.languageId !== languageId) {
            vscode.languages.setTextDocumentLanguage(document, languageId);
          }
        }
      } else {
        content = httpyac.utils.isString(content) ? content : getContent(response, responseViewContent);
        const language = getLanguageId(response.contentType, responseViewContent);
        document = await vscode.workspace.openTextDocument({
          language,
          content,
        });
      }
      if (config.responseViewMode === 'reuse') {
        const language = getLanguageId(response.contentType, responseViewContent);
        vscode.languages.setTextDocumentLanguage(document, language);
      }
      await showTextEditor(document, config.responseViewMode === 'preview');
      return true;
    }
    return false;
  };
}

export function getContent(response: httpyac.HttpResponse, viewContent?: ResponseViewContent | undefined): string {
  const result = [];

  if (viewContent === 'exchange' && response.request) {
    result.push(`${response.request.method} ${response.request.url}`);
    if (response.request.headers) {
      result.push(
        ...Object.entries(response.request.headers)
          .filter(([key]) => !key.startsWith(':'))
          .map(([key, value]) => `${key}: ${value}`)
          .sort()
      );
    }
    if (response.request.body) {
      result.push('');
      if (httpyac.utils.isString(response.request.body)) {
        result.push(response.request.body);
      } else if (Buffer.isBuffer(response.request.body)) {
        result.push(`buffer<${response.request.body.byteLength}>`);
      }
    }
    result.push('');
  }

  if (viewContent && ['headers', 'full', 'exchange'].indexOf(viewContent) >= 0) {
    result.push(`${response.protocol} ${response.statusCode} ${response.statusMessage}`);
    if (response.headers) {
      result.push(
        ...Object.entries(response.headers)
          .filter(([key]) => !key.startsWith(':'))
          .map(([key, value]) => `${key}: ${value}`)
          .sort()
      );
    }
    result.push('');
  }

  if (!viewContent || viewContent !== 'headers') {
    if (response?.body) {
      if (httpyac.utils.isString(response.body)) {
        if (response.prettyPrintBody && getConfigSetting().responseViewPrettyPrint) {
          result.push(response.prettyPrintBody);
        } else {
          result.push(response.body);
        }
      } else {
        result.push(httpyac.utils.stringifySafe(response.body, 2));
      }
    }
  }
  return httpyac.utils.toMultiLineString(result);
}

export function getResponseViewContext(
  viewContent: ResponseViewContent | undefined,
  hasBody: boolean
): ResponseViewContent | undefined {
  if (!hasBody && viewContent === 'body') {
    return 'exchange';
  }
  return viewContent;
}

export function getLanguageId(
  contentType: httpyac.ContentType | undefined,
  viewContent?: ResponseViewContent | undefined
): string {
  if (viewContent && viewContent !== 'body') {
    return 'http';
  }
  if (contentType) {
    const languageMap = getConfigSetting().responseViewLanguageMap;
    if (languageMap && languageMap[contentType.mimeType]) {
      return languageMap[contentType.mimeType];
    }
    if (httpyac.utils.isMimeTypeJSON(contentType)) {
      return 'json';
    }
    if (httpyac.utils.isMimeTypeJavascript(contentType)) {
      return 'javascript';
    }
    if (httpyac.utils.isMimeTypeXml(contentType)) {
      return 'html';
    }
    if (httpyac.utils.isMimeTypeHtml(contentType)) {
      return 'html';
    }
    if (httpyac.utils.isMimeTypeCSS(contentType)) {
      return 'css';
    }
    if (httpyac.utils.isMimeTypeMarkdown(contentType)) {
      return 'markdown';
    }
  }
  return 'plaintext';
}
