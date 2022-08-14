export interface Request {
  /** Request method (`GET`, `POST`, ...). */
  method: string;

  /** Absolute URL of the request (fragments are not included). */
  url: string;

  /** Request HTTP Version. */
  httpVersion?: string;

  /** List of cookie objects. */
  cookies?: Cookie[];

  /** List of header objects. */
  headers: Header[];

  /** List of query parameter objects. */
  queryString?: QueryString[];

  /** Posted data info. */
  postData?: PostData;

  /**
   * Total number of bytes from the start of the HTTP request message until
   * (and including) the double CRLF before the body.
   *
   * Set to `-1` if the info is not available.
   */
  headersSize?: number;

  /**
   * Size of the request body (POST data payload) in bytes.
   *
   * Set to `-1` if the info is not available.
   */
  bodySize?: number;

  /**  A comment provided by the user or the application */
  comment?: string;
}

export interface QueryString {
  name: string;
  value: string;

  /**  A comment provided by the user or the application */
  comment?: string;
}
export interface Header {
  name: string;
  value: string;

  /**  A comment provided by the user or the application */
  comment?: string;
}
export interface Cookie {
  /** The name of the cookie. */
  name: string;

  /** The cookie value. */
  value: string;

  /** The path pertaining to the cookie. */
  path?: string;

  /** The host of the cookie. */
  domain?: string;

  /**
   * Cookie expiration time.
   * (ISO 8601 - `YYYY-MM-DDThh:mm:ss.sTZD`,
   * e.g. `2009-07-24T19:20:30.123+02:00`).
   */
  expires?: string;

  /** Set to true if the cookie is HTTP only, false otherwise. */
  httpOnly?: boolean;

  /** True if the cookie was transmitted over ssl, false otherwise. */
  secure?: boolean;

  /**  A comment provided by the user or the application */
  comment?: string;
}

export type PostData = PostDataCommon & (PostDataParams | PostDataText);

export interface PostDataCommon {
  /** Mime type of posted data. */
  mimeType: string;

  /**  A comment provided by the user or the application */
  comment?: string;
}

export interface PostDataParams {
  /**
   * List of posted parameters (in case of URL encoded parameters).
   */
  params: Param[];

  /**
   * _`params` and `text` fields are mutually exclusive._
   */
  text?: never;
}

export interface PostDataText {
  /**
   * Plain text posted data
   */
  text: string;

  /**
   * _`params` and `text` fields are mutually exclusive._
   */
  params?: never;
}

export interface Param {
  /** name of a posted parameter. */
  name: string;

  /** value of a posted parameter or content of a posted file */
  value?: string;

  /** name of a posted file. */
  fileName?: string;

  /** content type of a posted file. */
  contentType?: string;

  /**  A comment provided by the user or the application */
  comment?: string;
}
