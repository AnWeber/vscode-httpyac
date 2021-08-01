import * as vscode from 'vscode';
import { types } from 'mime-types';
import { HttpFile, HttpRegion, HttpSymbolKind } from 'httpyac';
import { httpDocumentSelector } from '../config';
import { DocumentStore } from '../documentStore';
import { DisposeProvider } from '../utils';
interface HttpCompletionItem {
  name: string;
  description: string;
  text?: string | vscode.SnippetString;
  kind: vscode.CompletionItemKind;
}

export class HttpCompletionItemProvider extends DisposeProvider implements vscode.CompletionItemProvider {


  constructor(private readonly documentStore: DocumentStore) {
    super();
    this.subscriptions = [
      vscode.languages.registerCompletionItemProvider(httpDocumentSelector, this),
    ];
  }

  public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | undefined> {

    const textLine = document.getText(new vscode.Range(position.line, 0, position.line, position.character)).trim();
    const httpFile = await this.documentStore.getHttpFile(document);

    const isInRequestLine = !!(httpFile && httpFile.httpRegions.some(httpRegion => this.isInRequestLine(httpRegion, position.line)));

    const result: Array<HttpCompletionItem> = [];

    result.push(...this.getRequstMethodCompletionItems(textLine, isInRequestLine));
    result.push(...this.getRequestHeaders(textLine, isInRequestLine));
    result.push(...this.getMimetypes(textLine, isInRequestLine));
    result.push(...this.getMetaData(textLine, isInRequestLine));
    result.push(...(await this.getRefName(textLine, httpFile)));

    return result.map(obj => {
      const item = new vscode.CompletionItem(obj.name, obj.kind);
      item.detail = obj.description;
      item.documentation = obj.description;
      item.insertText = obj.text || obj.name;
      return item;
    });
  }

  private getRequstMethodCompletionItems(textLine: string, isInRequestLine: boolean): Array<HttpCompletionItem> {
    if (!isInRequestLine) {
      const result = [
        {
          name: 'GET',
          description: 'The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'HEAD',
          description: 'The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'POST',
          description: 'The POST method is used to submit an entity to the specified resource, often causing a change in state or side effects on the server.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'PUT',
          description: 'The PUT method replaces all current representations of the target resource with the request payload.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'DELETE',
          description: 'The DELETE method deletes the specified resource.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'CONNECT',
          description: 'The CONNECT method establishes a tunnel to the server identified by the target resource.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'OPTIONS',
          description: 'The OPTIONS method is used to describe the communication options for the target resource.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'TRACE',
          description: 'The TRACE method performs a message loop-back test along the path to the target resource.',
          kind: vscode.CompletionItemKind.Keyword,
        },
        {
          name: 'PATCH',
          description: 'The PATCH method is used to apply partial modifications to a resource.',
          kind: vscode.CompletionItemKind.Keyword,
        }
      ];

      return result.filter(obj => textLine.length === 0 || obj.name.indexOf(textLine) >= 0);
    }
    return [];
  }

  private getRequestHeaders(textLine: string, isInRequestLine: boolean): Array<HttpCompletionItem> {
    if (isInRequestLine) {
      const result: Array<HttpCompletionItem> = [
        { name: 'A-IM', description: 'Acceptable instance-manipulations for the request.', kind: vscode.CompletionItemKind.Field },
        { name: 'Accept', description: 'Media type(s) that is/are acceptable for the response. See Content negotiation.', kind: vscode.CompletionItemKind.Field },
        { name: 'Accept-Charset', description: 'Character sets that are acceptable.', kind: vscode.CompletionItemKind.Field },
        { name: 'Accept-Datetime', description: 'Acceptable version in time.', kind: vscode.CompletionItemKind.Field },
        { name: 'Accept-Encoding', description: 'List of acceptable encodings. See HTTP compression.', kind: vscode.CompletionItemKind.Field },
        { name: 'Accept-Language', description: 'List of acceptable human languages for response. See Content negotiation.', kind: vscode.CompletionItemKind.Field },
        { name: 'Access-Control-Request-Method', description: 'Initiates a request for cross-origin resource sharing with Origin (below).', kind: vscode.CompletionItemKind.Field },
        { name: 'Access-Control-Request-Headers', description: 'Initiates a request for cross-origin resource sharing with Origin (below).', kind: vscode.CompletionItemKind.Field },
        { name: 'Authorization', description: 'Authentication credentials for HTTP authentication.', kind: vscode.CompletionItemKind.Field },
        { name: 'Cache-Control', description: 'Used to specify directives that must be obeyed by all caching mechanisms along the request-response chain.', kind: vscode.CompletionItemKind.Field },
        { name: 'Connection', description: 'Control options for the current connection and list of hop-by-hop request fields. Must not be used with HTTP/2.', kind: vscode.CompletionItemKind.Field },
        { name: 'Content-Encoding', description: 'The type of encoding used on the data. See HTTP compression.', kind: vscode.CompletionItemKind.Field },
        { name: 'Content-Length', description: 'The length of the request body in octets (8-bit bytes).', kind: vscode.CompletionItemKind.Field },
        { name: 'Content-MD5', description: 'A Base64-encoded binary MD5 sum of the content of the request body.', kind: vscode.CompletionItemKind.Field },
        { name: 'Content-Type', description: 'The Media type of the body of the request (used with POST and PUT requests).', kind: vscode.CompletionItemKind.Field },
        { name: 'Cookie', description: 'An HTTP cookie previously sent by the server with Set-Cookie (below).', kind: vscode.CompletionItemKind.Field },
        { name: 'Date', description: 'The date and time at which the message was originated (in "HTTP-date" format as defined by RFC 7231 Date/Time Formats).', kind: vscode.CompletionItemKind.Field },
        { name: 'Expect', description: 'Indicates that particular server behaviors are required by the client.', kind: vscode.CompletionItemKind.Field },
        { name: 'Forwarded', description: 'Disclose original information of a client connecting to a web server through an HTTP proxy.', kind: vscode.CompletionItemKind.Field },
        { name: 'From', description: 'The email address of the user making the request.', kind: vscode.CompletionItemKind.Field },
        { name: 'Host', description: 'The domain name of the server (for virtual hosting), and the TCP port number on which the server is listening. The port number may be omitted if the port is the standard port for the service requested. Mandatory since HTTP/1.1. If the request is generated directly in HTTP/2, it should not be used.', kind: vscode.CompletionItemKind.Field },
        { name: 'HTTP2-Settings', description: 'A request that upgrades from HTTP/1.1 to HTTP/2 MUST include exactly one HTTP2-Setting header field. The HTTP2-Settings header field is a connection-specific header field that includes parameters that govern the HTTP/2 connection, provided in anticipation of the server accepting the request to upgrade.', kind: vscode.CompletionItemKind.Field },
        { name: 'If-Match', description: 'Only perform the action if the client supplied entity matches the same entity on the server. This is mainly for methods like PUT to only update a resource if it has not been modified since the user last updated it.', kind: vscode.CompletionItemKind.Field },
        { name: 'If-Modified-Since', description: 'Allows a 304 Not Modified to be returned if content is unchanged.', kind: vscode.CompletionItemKind.Field },
        { name: 'If-None-Match', description: 'Allows a 304 Not Modified to be returned if content is unchanged, see HTTP ETag.', kind: vscode.CompletionItemKind.Field },
        { name: 'If-Range', description: 'If the entity is unchanged, send me the part(s) that I am missing; otherwise, send me the entire new entity.', kind: vscode.CompletionItemKind.Field },
        { name: 'If-Unmodified-Since', description: 'Only send the response if the entity has not been modified since a specific time.', kind: vscode.CompletionItemKind.Field },
        { name: 'Max-Forwards', description: 'Limit the number of times the message can be forwarded through proxies or gateways.', kind: vscode.CompletionItemKind.Field },
        { name: 'Origin', description: 'Initiates a request for cross-origin resource sharing (asks server for Access-Control-* response fields).', kind: vscode.CompletionItemKind.Field },
        { name: 'Pragma', description: 'Implementation-specific fields that may have various effects anywhere along the request-response chain.', kind: vscode.CompletionItemKind.Field },
        { name: 'Proxy-Authorization', description: 'Authorization credentials for connecting to a proxy.', kind: vscode.CompletionItemKind.Field },
        { name: 'Range', description: 'Request only part of an entity. Bytes are numbered from 0. See Byte serving.', kind: vscode.CompletionItemKind.Field },
        { name: 'Referer', description: 'This is the address of the previous web page from which a link to the currently requested page was followed. (The word "referrer" has been misspelled in the RFC as well as in most implementations to the point that it has become standard usage and is considered correct terminology)', kind: vscode.CompletionItemKind.Field },
        { name: 'TE', description: 'The transfer encodings the user agent is willing to accept: the same values as for the response header field Transfer-Encoding can be used, plus the "trailers" value (related to the "chunked" transfer method) to notify the server it expects to receive additional fields in the trailer after the last, zero-sized, chunk. Only trailers is supported in HTTP/2.', kind: vscode.CompletionItemKind.Field },
        { name: 'Trailer', description: 'The Trailer general field value indicates that the given set of header fields is present in the trailer of a message encoded with chunked transfer coding.', kind: vscode.CompletionItemKind.Field },
        { name: 'Transfer-Encoding', description: 'The form of encoding used to safely transfer the entity to the user. Currently defined methods are: chunked, compress, deflate, gzip, identity. Must not be used with HTTP/2', kind: vscode.CompletionItemKind.Field },
        { name: 'User-Agent', description: 'The user agent string of the user agent.', kind: vscode.CompletionItemKind.Field },
        { name: 'Upgrade', description: 'Ask the server to upgrade to another protocol. Must not be used in HTTP/2.', kind: vscode.CompletionItemKind.Field },
        { name: 'Via', description: 'Informs the server of proxies through which the request was sent.', kind: vscode.CompletionItemKind.Field },
        { name: 'Warning', description: 'A general warning about possible problems with the entity body.', kind: vscode.CompletionItemKind.Field },
        { name: 'Upgrade-Insecure-Requests', description: 'Tells a server which (presumably in the middle of a HTTP -> HTTPS migration) hosts mixed content that the client would prefer redirection to HTTPS and can handle Content-Security-Policy: upgrade-insecure-requests Must not be used with HTTP/2', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Requested-With', description: 'Mainly used to identify Ajax requests (most JavaScript frameworks send this field with value of XMLHttpRequest); also identifies Android apps using WebView', kind: vscode.CompletionItemKind.Field },
        { name: 'DNT', description: 'Requests a web application to disable their tracking of a user. This is Mozilla`s version of the X-Do-Not-Track header field (since Firefox 4.0 Beta 11). Safari and IE9 also have support for this field. On March 7, 2011, a draft proposal was submitted to IETF. The W3C Tracking Protection Working Group is producing a specification.', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Forwarded-For', description: 'A de facto standard for identifying the originating IP address of a client connecting to a web server through an HTTP proxy or load balancer. Superseded by Forwarded header.', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Forwarded-Host', description: 'A de facto standard for identifying the original host requested by the client in the Host HTTP request header, since the host name and/or port of the reverse proxy (load balancer) may differ from the origin server handling the request. Superseded by Forwarded header.', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Forwarded-Proto', description: 'A de facto standard for identifying the originating protocol of an HTTP request, since a reverse proxy (or a load balancer) may communicate with a web server using HTTP even if the request to the reverse proxy is HTTPS. An alternative form of the header (X-ProxyUser-Ip) is used by Google clients talking to Google servers. Superseded by Forwarded header.', kind: vscode.CompletionItemKind.Field },
        { name: 'Front-End-Https', description: 'Non-standard header field used by Microsoft applications and load-balancers', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Http-Method-Override', description: 'Requests a web application to override the method specified in the request (typically POST) with the method given in the header field (typically PUT or DELETE). This can be used when a user agent or firewall prevents PUT or DELETE methods from being sent directly (note that this is either a bug in the software component, which ought to be fixed, or an intentional configuration, in which case bypassing it may be the wrong thing to do).', kind: vscode.CompletionItemKind.Field },
        { name: 'X-ATT-DeviceId', description: 'Allows easier parsing of the MakeModel/Firmware that is usually found in the User-Agent String of AT&T Devices', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Wap-Profile', description: 'Links to an XML file on the Internet with a full description and details about the device currently connecting. In the example to the right is an XML file for an AT&T Samsung Galaxy S2.', kind: vscode.CompletionItemKind.Field },
        { name: 'Proxy-Connection', description: 'Implemented as a misunderstanding of the HTTP specifications. Common because of mistakes in implementations of early HTTP versions. Has exactly the same functionality as standard Connection field. Must not be used with HTTP/2.', kind: vscode.CompletionItemKind.Field },
        { name: 'X-UIDH', description: 'Server-side deep packet insertion of a unique ID identifying customers of Verizon Wireless; also known as "perma-cookie" or "supercookie"', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Csrf-Token', description: 'Used to prevent cross-site request forgery. Alternative header names are: X-CSRFToken and X-XSRF-TOKEN', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Request-ID', description: 'Correlates HTTP requests between a client and server.', kind: vscode.CompletionItemKind.Field },
        { name: 'X-Correlation-ID', description: 'Correlates HTTP requests between a client and server.', kind: vscode.CompletionItemKind.Field },
        { name: 'Save-Data', description: 'The Save-Data client hint request header available in Chrome, Opera, and Yandex browsers lets developers deliver lighter, faster applications to users who opt-in to data saving mode in their browser.', kind: vscode.CompletionItemKind.Field },
      ];

      return result
        .filter(obj => textLine.length === 0 || obj.name.toLowerCase().indexOf(textLine.toLowerCase()) >= 0);
    }
    return [];
  }

  private isInRequestLine(httpRegion: HttpRegion, line: number) {
    if (httpRegion.symbol.startLine <= line && line <= httpRegion.symbol.endLine && httpRegion.symbol.children) {
      const preLine = httpRegion.symbol.children.find(obj => obj.startLine === line - 1);
      if (preLine && (preLine.kind === HttpSymbolKind.requestLine || preLine.kind === HttpSymbolKind.requestHeader)) {
        return true;
      }
    }
    return false;
  }

  private getMimetypes(line: string, isInRequestLine: boolean): Array<HttpCompletionItem> {
    if (isInRequestLine && line.toLowerCase().indexOf('content-type') >= 0) {
      const result = Object.entries(types).map(([key, value]) => ({
        name: value,
        description: key,
        kind: vscode.CompletionItemKind.Value,
      }));
      result.push({
        name: 'application/x-www-form-urlencoded',
        description: 'application/x-www-form-urlencoded',
        kind: vscode.CompletionItemKind.Value,
      });
      return result;
    }
    return [];
  }

  private getMetaData(textLine: string, isInRequestLine: boolean): Array<HttpCompletionItem> {
    if (textLine.startsWith('#') && !isInRequestLine) {
      const result = [
        {
          name: '@name',
          description: 'responses of a requests with a name are automatically added as variables and can be reused by other requests',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@name ${name}')
        }, {
          name: '@ref',
          description: 'When the request is called, it is ensured that the referenced request is called beforehand',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@ref ${name}')
        }, {
          name: '@forceRef',
          description: 'When the request is called, it is ensured that the referenced request is always called beforehand',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@forceRef ${name}')
        }, {
          name: '@disabled',
          description: 'requests can be disabled',
          kind: vscode.CompletionItemKind.Property,
          text: '@disabled ${file}'
        }, {
          name: '@language',
          description: 'language id of the response view',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@language ${name}')
        }, {
          name: '@note',
          description: 'shows a confirmation dialog before sending request',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@note ${message}')
        }, {
          name: '@save',
          description: 'If specified, the response will not be displayed but saved directly.',
          kind: vscode.CompletionItemKind.Property,
          text: ' @save ${name}',
        }, {
          name: '@openWith',
          description: 'viewType of custom editor to preview files',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@openWith ${name}')
        }, {
          name: '@extension',
          description: 'extension of file for save or openWith.',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@extension ${extension}')
        }, {
          name: '@noLog',
          description: 'prevent logging of request data in output console',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@noLog')
        }, {
          name: '@noCookieJar',
          description: 'cookieJar support is disabled for this request',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@noCookieJar')
        }, {
          name: '@noClientCert',
          description: 'SSL client certificate is not send for this request',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@noClientCert')
        }, {
          name: '@noRejectUnauthorized',
          description: 'all invalid SSL certificates will be ignored and no error will be thrown.',
          kind: vscode.CompletionItemKind.Property,
          text: new vscode.SnippetString('@noRejectUnauthorized')
        }
      ];

      return result
        .filter(obj => obj.name.toLowerCase().indexOf(textLine.replace(/#/u, '').trim()) >= 0).map(obj => {
          if (textLine.endsWith('@')) {
            if (obj.text && typeof obj.text !== 'string') {
              obj.text = new vscode.SnippetString(obj.text.value.slice(1));
            } else {
              obj.text = obj.name.slice(1);
            }
          }
          return obj;
        });
    }
    return [];
  }

  private async getRefName(line: string, httpFile: HttpFile | undefined): Promise<Array<HttpCompletionItem>> {
    if (httpFile && line.startsWith('#') && line.toLowerCase().indexOf('ref') >= 0) {
      const result: Array<HttpCompletionItem> = [];

      const toHttpCompletionItem = (httpRegion: HttpRegion) => ({
        name: httpRegion.metaData.name || '',
        description: 'httpRegion name',
        kind: vscode.CompletionItemKind.Reference
      });

      result.push(...httpFile.httpRegions.filter(obj => !!obj.metaData.name).map(toHttpCompletionItem));
      return result;
    }
    return [];
  }
}
