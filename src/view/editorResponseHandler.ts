import { getConfigSetting, ResponseViewContent } from '../config';
import { ResponseItem, ResponseHandler } from '../extensionApi';
import { StorageProvider } from '../io';
import { showTextEditor } from '../utils/textEditorUtils';
import * as httpyac from 'httpyac';
import * as vscode from 'vscode';

let prevDocument: WeakRef<vscode.TextDocument> | undefined;

type DocumentContent = {
  uri?: vscode.Uri;
  content?: string | Buffer;
  responseViewContent?: ResponseViewContent;
};

export function previewResponseHandlerFactory(storageProvider: StorageProvider): ResponseHandler {
  return async function previewResponseHandler(responseItem: ResponseItem): Promise<boolean> {
    const config = getConfigSetting();

    if (config.responseViewMode !== 'none') {
      await responseItem.loadResponseBody?.();
      if (!responseItem.response) {
        return false;
      }

      const documentContent = await getResponseContentUri(responseItem, storageProvider);
      responseItem.documentUri = documentContent.uri;
      await openTextEditor(documentContent, responseItem.response);
      return true;
    }
    return false;
  };
}

async function openTextEditor(documentContent: DocumentContent, response: httpyac.HttpResponse) {
  const config = getConfigSetting();
  let document: vscode.TextDocument | undefined;
  const language = getLanguageId(response.contentType, documentContent.responseViewContent);
  if (documentContent.uri) {
    document = await vscode.workspace.openTextDocument(documentContent.uri);
  } else if (httpyac.utils.isString(documentContent.content)) {
    document = await vscode.workspace.openTextDocument({
      language,
      content: documentContent.content,
    });
  }
  if (document) {
    vscode.languages.setTextDocumentLanguage(document, language);

    await showTextEditor({
      uri: document,
      viewColumn: getPreviousDocumentEditorViewColumn(prevDocument?.deref()),
      preview: config.responseViewMode === 'preview',
    });

    prevDocument = new WeakRef(document);
  }
}

export async function getResponseContentUri(
  responseItem: ResponseItem,
  storageProvider: StorageProvider
): Promise<DocumentContent> {
  const config = getConfigSetting();
  const responseViewContent = getResponseViewContext(config.responseViewContent, responseItem);

  if (responseViewContent === 'body' && !config.responseViewPrettyPrint) {
    if (responseItem.responseUri || !responseItem.response.body) {
      return {
        uri: config.responseViewMode === 'reuse' ? undefined : responseItem.responseUri,
        content: httpyac.utils.isString(responseItem.response.body)
          ? responseItem.response.body
          : responseItem.response.rawBody,
        responseViewContent,
      };
    }
  }
  await responseItem.loadResponseBody?.();
  const content = getContent(responseItem.response, responseViewContent);

  const filename =
    config.responseViewMode === 'reuse'
      ? 'response'
      : `${responseItem.name}.${responseItem.id.slice(0, 8)}.${
          responseViewContent === 'body' ? responseItem.extension : 'http'
        }`;

  const uri = await storageProvider.writeFile(content, filename);
  return {
    uri,
    content,
    responseViewContent,
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
  responseItem: ResponseItem
): ResponseViewContent | undefined {
  const hasBody = !!responseItem.responseUri || !!responseItem.response?.body;
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

function getPreviousDocumentEditorViewColumn(document: vscode.TextDocument | undefined): vscode.ViewColumn | undefined {
  if (document) {
    const editor = vscode.window.visibleTextEditors.find(editor => editor.document === document);
    if (editor?.viewColumn) {
      return editor.viewColumn;
    }
  }
  return undefined;
}
