## 5.2.0 (2022-03-10)

#### Features

- add [RFC7636](https://datatracker.ietf.org/doc/html/rfc7636) OAuth2 Authorization Code Flow with PKCE support (AnWeber/httpyac#219)
- add [RFC8707](https://datatracker.ietf.org/doc/html/rfc8707) OAuth2 Resource Indicator support (AnWeber/httpyac#218)
- change `removeHistory` command to clear all Variables to (#108)

#### Fix

- `# @import` does not store file in httpFileStore, if it is not already loaded in the store (#110)
- fix issue in output redirection to absolute file paths (#109)

## 5.1.0 (2022-03-06)

#### Features

- add workspace trust support (#104)
- OAuth2 Authorization Code Flow and Password Flow supports public clients (AnWeber/httpyac#214)

#### Fixes

- Parsing Error of Markdown in Notebook Editor (#106)
- fixed parsing of meta data `# @jwt`
- fix order of variable replacer (AnWeber/httpyac#216)

## 5.0.4 (2022-02-28)

#### Fixes

- multiple import of the same file does not abort processing (AnWeber/httpyac##212)
- setClipboard on device_code OAuth2 flow does not throw exceptions (AnWeber/httpyac##211)

## 5.0.3 (2022-02-28)

#### Fixes

- OAuth2 does not use token exchange flow

## 5.0.2 (2022-02-28)

#### Fixes

- fix invalid protocol (AnWeber/httpyac#210)

## 5.0.1 (2022-02-28)

#### Fixes

- add mergeRawHttpHeaders to utils (AnWeber/httpyac#209)

## 5.0.0 (2022-02-27)

#### Breaking Changes

- Setting Got Options directly on the request will be removed in one of the next versions. Got checks in v12 whether only valid options are set. But since options and custom properties are mixed at the request object, such a separation would be difficult. Please change `request[...]` to `request.options[...]`.

#### Features

- added [RabbitMQ Support](http://localhost:8080/guide/request.html#amqp-rabbitmq)
- add OAuth2 Variable Prefix to Session to allow cache of different user login (AnWeber/httpyac#207)
- Stream Responses are added to history (disable with setting `addStreamingResponsesToHistory`)

#### Fixes

- transitive request references (`@import`) not being resolved (AnWeber/httpyac#205)
- import of modified variables works when using `@forceRef` (AnWeber/httpyac#205)

## 4.10.2 (2022-02-08)

#### Features

- add Asciidoc Injection
- add testFactory to utils (Anweber/httpyac#194)
- update to globby and clipboardy ESM Packages

#### Fix

- use device_code instead of code in OAuth2 Device Code Flow
- add more file extensions for Markdown Injection (#102)

## 4.10.1 (2022-01-30)

#### Fix

- add fallback, if fsPath results in undefined/ error (AnWeber/httpbook#43)
- Error parsing grpc URL starting with grpc fixed (mistaken for protocol)

## 4.10.0 (2022-01-27)

#### Features

- support TreeDataProvider for environments, variables and user session (Cookie, OAuth2 Token)
- better TreeDataProvider support for history (view response)
- use Host Header as Url Prefix (AnWeber/httpyac#189)
- add cookie to userSessionStore instead cookieStore
- `# @loop` allows actions before execution of the loop (e.g. ' # @ref ...`)
- use all dotenv files between httpfile directory and rootDir (AnWeber/httpyac#174)

#### Fix

- handle Windows directory separators in glob pattern (AnWeber/httpyac#175)

## 4.9.1 (2022-01-04)

#### Fix

- GRPC name resolution problem when the path was set (AnWeber/httpyac#158)
- FileProvider writeBuffer method fails in VS Code (#98)

## 4.9.0 (2021-12-29)

#### Features

- support http codeblocks in markdown files (AnWeber/httpyac#164)
- add raw headers to httpResponse (AnWeber/httpyac#165)
- add special env setting `request_rejectUnauthorized` to ignore SSL Verification (AnWeber/httpyac#159)
- add special env setting `request_proxy` to set proxy (AnWeber/httpyac#159)
- proxy support of `socks://` proxy (#91)

## 4.8.2 (2021-12-19)

#### Fix

- replace all whitespace in meta data name and use camelCase instead of underscore (AnWeber/httpyac#154)
- support nested `envDirName` (#93)
- allow hyphens in variable name (#95)
- fix syntax highlighting in Request Line after JSON Response

## 4.8.1 (2021-12-10)

#### Fix

- really read all `*.env.json` as Intellij Environment Files (#94)

## 4.8.0 (2021-12-09)

#### Feature

- `@import` supports variable substitution (AnWeber/httpyac#151)
- render objects as JSON while replacing variables (AnWeber/httpyac#146)
- add httpResponse as named variable with `${name}Response` (AnWeber/httpyac#152)

#### Fix

- read all `*.env.json` as Intellij Environment Files (#94)
- Intellij `client.global.set` really changes variables for this run (AnWeber/httpyac#150)

## 4.7.5 (2021-12-05)

#### Feature

- better syntax highlighting for meta data and headers

#### Fix

- oauth2 variables are expanded

## 4.7.4 (2021-11-30)

#### Feature

- add config setting for OAuth2 redirectUri (AnWeber/httpyac#118)
- add password variable replacer (AnWeber/httpyac#139)
- besides `$shared` there is now also the possibility to use `$default` in `config.environment`. These variables are only used if no environment is selected (AnWeber/httpyac#142)

#### Fix

- added two line endings instead of one in response body (httpyac/httpyac.github.io#13)
- add support for `.` in header name (AnWeber/httpyac#128)
- parsing error with `=` fixed cli command `--var`
- interpret all status codes <400 as valid OAuth2 return codes (AnWeber/httpyac#131)
- global hooks are now always used for all HttpRegions and also work correctly in httpbook (AnWeber/httpbook#39)
- fix highlighting for script with event name and name after meta data separator

## 4.7.3 (2021-11-23)

#### Fix

- remove special handling of Authorization Header on grpc Requests (AnWeber/httpyac#125)
- GraphQL queries withouth variables are executed (AnWeber/httpyac##124)

## 4.7.2 (2021-11-17)

#### Fix

- .env file in same folder not imported (AnWeber/httpyac#112)
- blank header is now supported (AnWeber/httpyac#107)
- using `# @no-log` breaks named variable (AnWeber/httpyac#106)
- fix error in VSCode Settings Configuration with setting `responseViewExtensionRecognition`

## 4.7.1 (2021-11-11)

#### Fix

- mimeType xml is saved as html (#87)

## 4.7.0 (2021-11-10)

#### Features

- add new event `@responseLogging` for scripts
- better extension recognition (#87)

#### Fix

- refreshTokenFlow does not require refreshExpiresIn
- envDirName is not overriden in cli command (AnWeber/httpyac#103)
- wrong request was executed, when written in first line of document (#85)

## 4.6.0 (2021-11-07)

#### Features

- added [OAuth 2.0 Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628) (AnWeber/httpyac#97)
- extend GRPC Not Found Service Error with avaiable services

#### Fix

- escape of `{{...}}` works again (AnWeber/httpyac#99)
- user cancelation stops execution hook (AnWeber/httpyac#98)

## 4.5.1 (2021-11-03)

#### Features

- config setting to use Region scoped variables (default: false)

## 4.5.0 (2021-10-31)

#### Features

- $randomInt Variable Substitution allows negative numbers (AnWeber/httpyac#93)
- text after region delimiter is used as title and name ([Intellij IDEA Compatibility](https://blog.jetbrains.com/idea/2021/10/intellij-idea-2021-3-eap-6-enhanced-http-client-kotlin-support-for-cdi-and-more/))
- support output redirection like [Intellij IDEA Compatibility](https://blog.jetbrains.com/idea/2021/10/intellij-idea-2021-3-eap-6-enhanced-http-client-kotlin-support-for-cdi-and-more/)
- add rate limiter support with meta option (AnWeber/httpyac#52)

## 4.4.1 (2021-10-25)

#### Fix

- Body for GraphQL requests was replaced only after request

## 4.4.0 (2021-10-24)

#### Features

- add [WebSocket](https://httpyac.github.io/guide/request.html#websocket) support
- add [MQTT](https://httpyac.github.io/guide/request.html#mqtt) support
- add [Server-Sent Events](https://httpyac.github.io/guide/request.html#server-sent-events-eventsource) support
- HTTP header array support added
- added oauthSession2 Variable to directly access OAuth2 Token
- add additional Meta Data
  - `@verbose` to increase log level to `trace`
  - `@debug` to increase log level to `debug`
  - `@keepStreaming` of MQTT, Server-Sent-Events or WebSocket until the session is ended manually
  - `@sleep` supports variables
  - documentation of meta data added to outline view
- better auto completion support
- added more snippets for MQTT, WebSocket and Server-Sent Events

#### Fix

- response body is logged to output channel

## 4.3.0 (2021-10-15)

#### Features

- support comments between request line and headers
- Setting to activate StatusBarItem for current environments (`httpyacenvironmentShowStatusBarItem`)
  - use setting `httpyac.environmentStatusBarItemDefaultBackground` to set default color
  - use setting `httpyac.environmentStatusBarItemWarningEnvs` and `httpyac.environmentStatusBarItemErrorEnvs` to set environment specific color
- progress location while sending can be changed to statusbar (setting `httpyac.progressDefaultLocation`)
- update to @grpc/js v1.4.1
- better auto completion for authorization header

#### Fix

- pretty print max size too low, 1kb instead fo 1Mb (AnWeber/httpyac#84)
- cookies are not cleared while editing in vscode (#77)
- responseViewMode `reuse` really reuses same document as previous request

## 4.2.0 (2021-10-10)

#### Features

- ViewMode `reuse` saves file to prevent unwanted Save Dialog
- accept output options for utils.toHttpString
- response in HttpRegion is deleted after run to optimize memory
- history saves response to file, to reduce memory

#### Fix

- variables with `2` got not replaced in Javascript Substitution
- infinte loop if `@ref` in `@import` disabled or not found

## 4.1.1 (2021-10-06)

#### Features

- codelens support for command `httpyac.showVariables`

#### Fix

- environments in .httpyac.js are not recognized (AnWeber/vscode-httpyac#71)
- js keyword as variable name not allowed (#76)

## 4.1.0 (2021-10-02)

#### Features

- Variable Substitution for file import (proto, gql, request body)
- env Variables in `process.env.HTTPYAC_ENV` are loaded
- plugin in location `process.env.HTTPYAC_PLUGIN` is loaded
- OAuth2 Variable Substitution uses sensible default (flow = client_credentials, prefix = oauth2)

#### Fix

- protoLoaderOptions conversion added (#75)

## 4.0.3 (2021-09-30)

#### Features

- new Setting `httpyac.generateCodeDefaultLanguage` to set default Language for Code Generation
- new Setting `httpyac.generateCodeTargetOutput` to specify Output Target of generated code (Clipboard or Window)
- new Command `httpyac.generateCodeSelectLanguage` to always select Language of Code Generation
- CodeLens support for `httpyac.generateCode` and `httpyac.generateCodeSelectLanguage`

#### Fix

- generateCode does not send request

## 4.0.2 (2021-09-24)

#### Fix

- use esbuild instead of webpack. Fixes require error in @grpc/proto-loader
- stack overflow with multiple use of the same ref statement

## 4.0.1 (2021-09-22)

#### Fix

- update to httpyac@4.0.3

## 4.0.0 (2021-09-22)

#### Features

- [gRPC Request support](https://httpyac.github.io/guide/request.html#grpc)
  - Unary RPC
  - Server Streaming
  - Client Streaming
  - Bi-Directional Streaming
- add history view to explorer activity bar (visible when history entries exists)
- add meta option sleep (wait x milliseconds before request)
- Basic Authentication with Whitespace in username or password (`Basic {{username}}:{{password}}`)
- register script task for event hooks (streaming, request, response, after)

#### Fix

- input and quickpick variable replacer fixed

## 3.2.0 (2021-09-12)

#### Fix

- markdown requests supports sending heading
- fix import of http files in global context
- fix `generate code` works again

## 3.1.0 (2021-08-10)

#### Features

- OAuth2 Variable Substitution can send client_id in body (config setting)
- change responseLogging to BailSeriesHook for simple use
- switch to exchange view if no response body is provided

## 3.0.0 (2021-08-09)

#### Breaking Changes

- removed extensionScript (use instead [hook api](https://httpyac.github.io/guide/hooks.html#project-local-hooks))
- removed dotenv and intellij configuration (use instead [envDirName](https://httpyac.github.io/config/#envdirname), if needed)

#### Features

- [httpyac plugin support](https://httpyac.github.io/plugins/#getting-started)
- [hook api support](https://httpyac.github.io/guide/hooks.html#project-local-hooks)
- [better documentation](https://httpyac.github.io/guide)
- [new location for examples](https://github.com/httpyac/httpyac.github.io/tree/main/examples)
- add requireUncached to script context to clear NodeJS Caching

#### Fix

- show commands only in http files

## 2.21.1 (2021-07-28)

#### Fix

- log trace can be selected (#57)
- requestGotOptions are used (#57)

## 2.21.0 (2021-07-22)

#### Features

- add pretty print for xml in exchange body (#56)

#### Fix

- missing blank line after file import in multipart/formdata (Anweber/httpyac#57)

## 2.20.0 (2021-07-18)

#### Features

- allow [loop](https://github.com/AnWeber/httpyac/blob/main/examples/metaData/loop.http) one requests multiple times with `for <var> of <iterable>`, `for <count>` or `while <condition>`

#### Fix

- error in dotenv import with `.env.{{system}}` notation (#51)
- use right default comment behavior in script blocks (#52)
- line break issue with comment in last line (Anweber/httpyac#56)
- do not open httpyac output log automatically (Anweber/httpbook#28)

## 2.19.0 (2021-07-09)

#### Features

- simple escaping of template strings in body with `\{\{...\}\}` (is replaced with `{{...}}`)
- add test result summary, if more requests are executed at the same time
- add timings, testResults, meta data to code lens in response Preview

## 2.18.1 (2021-07-06)

#### Features

- fix error with global variables (Anweber/vscode-httpyac#48)

## 2.18.0 (2021-06-30)

#### Features

- add new meta data @noRejectUnauthorized, to disable ssl verification
- add better json schema support in settings and file .httpyac.json
- improve error for SSL Validation error
- add completion for new meta data

## 2.17.0 (2021-06-28)

#### Fix

- fixed parser, if global variable is used in first line (Anweber/vscode-httpyac#45)
- http2 needs to explicitly activated (second attempt:-))
- multiple user-agent header removed

## 2.16.2 (2021-06-27)

#### Features

- support start entries contribution (VSCode Insiders)
- support more command arguments (TextDocument, TextEditor, Uri)

## 2.16.1 (2021-06-20)

#### Fix

- activation on new file command

## 2.16.0 (2021-06-20)

#### Features

- customize textdecoration provider

#### Fix

- error while using metadata followRedirect fixed
- http2 needs to explicitly activated

## 2.15.1 (2021-06-17)

#### Fix

- fix gql (wrong Execution Order)

## 2.15.0 (2021-06-13)

#### Features

- add default accept header _/_
- faster parsing with lazy access of fs

## 2.14.1 (2021-06-11)

#### Fix

- update normalize-url
- fix Protocol "https:" not supported. Expected "http:" (disable http2)

## 2.14.0 (2021-06-06)

#### Features

- decorationProvider supports borderlines around region
- better test method support

#### Fix

- error parsing body in inline response

## 2.13.1 (2021-06-05)

#### Fix

- error parsing http version in inline response

## 2.13.0 (2021-06-05)

#### Features

- assertUtils for simple tests

#### Fix

- empty line after requestline not needed anymore

## 2.12.5 (2021-06-04)

#### Features

- new setting `httpyac.environmentStoreSelectedOnStart` to store last used env

#### Fix

- region delimiter ignore chars after delimiter

## 2.12.4 (2021-06-03)

#### Fix

- error on require local javascript file

## 2.12.3 (2021-06-01)

#### Fix

- fix error if ### on first line

## 2.12.1 (2021-05-30)

#### Features

- change signature of responseRef array
- HttpSymbol provides property source
- utils for http file output

#### Fix

- Spelling mistake in symbol
- small error in Http version output

## 2.12.0 (2021-05-30)

#### Features

- update to httpyac 2.12.0

## 2.11.0 (2021-05-29)

#### Features

- add parser for response and responseRef
- add documentStore to extensionApi

## 2.10.0 (2021-05-24)

#### Features

- dependency updates of open, inquirer and dotenv

## 2.9.0 (2021-05-18)

#### Features

- force inject variables with metadata setting (`# @injectVariables`)

## 2.8.0 (2021-05-13)

#### Features

- support [remote repositories](https://code.visualstudio.com/updates/v1_56#_remote-repositories-remotehub)
- add support for mimetype application/x-javascript
- update dotenv to 9.0.2
- add setting to disable codelens in notebooks
- add settting to enable showing request output
- extended extensionApi with ResponseOutputProcessor

#### Fix

- fix error in settings for requestGotOptions

## 2.7.0 (2021-05-03)

#### Features

- all markdown utils exported
- reuse parser promise on same version and filename
- qna redirect to github discussions

#### Fix

- use shared env on empty environment array
- delimiter ignored on source of httpregion

## 2.6.0 (2021-05-01)

#### Features

- extended extension api
- toMarkdown with better option support and style change
- httpClient is optional on httpyacApi.send

#### Fix

- incomplete httpRegion.source fixed

## 2.5.0 (2021-04-25)

#### Breaking Changes

- [Action](https://github.com/AnWeber/httpyac/blob/main/src/models/httpRegionAction.ts#L7) method changed to process instead of processor
- [VariableReplacer](https://github.com/AnWeber/httpyac/blob/main/src/models/variableReplacer.ts#L5) changed to object with replace method, to implement better trust support

#### Features

- better static code analysis in project
- json schema support for .httpyac.json
- rest client dynamic variable support ($guid, $randomInt, $timestamp, $datetime, $localDatetime, $processEnv, $dotenv)

#### Fix

- ref and forceRef support is fixed
- error on executing httpRegionScript

## 2.4.0 (2021-04-15)

#### Features

- better [test](https://github.com/AnWeber/httpyac/blob/main/examples/README.md#node-js-scripts) method support
- refactored response in script to [http response](https://github.com/AnWeber/httpyac/blob/main/src/models/httpResponse.ts) instead of body
- multiple output formats for response view (body, header, full, exchange)

#### Fix

- unnecessary file parse when using ref in vscode
- fixed error in code generation with query parameters (#21)

## 2.3.0 (2021-04-09)

#### Features

- define global script executed after every request
- set ssl client certifcates per request
- intellij syntax support for metadata (`// @no-cookie-jar`)
- send many http regions at once (select per picker)

#### Fix

- priority of config initialization adjusted ([#3](https://github.com/AnWeber/httpyac/issues/3))

## 2.2.0 (2021-04-05)

#### Feature

- support for ssl client certficates
- note http version (version 1.1 disables http2 support)
- cookiejar support

## 2.1.0 (2021-03-30)

### Fix

- error in signing request with aws

## 2.0.0 (2021-03-27)

#### Feature

- cli support with [httpyac cli](https://www.npmjs.com/package/httpyac)

#### Fix

- error if not existing file is imported
- error with meta data note fixed
- error in signing request with aws

## 1.19.2 (2021-03-18)

#### Fix

- Variable with string empty could not be replaced

## 1.19.1 (2021-03-14)

#### Feature

- performance improvement on preview mode with better documentselector
- send and sendAll in editor title

## 1.19.0 (2021-03-12)

#### Fix

- preview mode only works if file is saved to temp file

## 1.18.1 (2021-03-07)

#### Fix

- error in gql requests (I should invest in unit tests)

## 1.18.0 (2021-03-07)

#### Features

- enable/disable code lens in settings
- AWS signature v4 support

#### Fix

- removing header in default headers did not always remove header from request

## 1.17.0 (2021-03-04)

#### Features

- oauth2 implicit flow
- see current sessions and logout
- disable notifications

#### Fix

- user session depending on OAuth Flow, clientId and possibly username. On changed scopes user session is renewed

## 1.16.0 (2021-02-26)

#### Features

- separated log output (log, script console, requests)
- scroll to top on new requests

#### Fix

- cache error in openidVariableReplacer if inline Variables are used

## 1.15.1 (2021-02-26)

#### Fix

- error in gql parsing

## 1.15.0 (2021-02-25)

#### Features

- display of request method in code lens possible
- Intellij Idea Features implemented
  - support single line script
  - support no-log meta param
  - support no-redirect meta param
  - support multi-line request url
- redirect console.log statements in inline scripts to outputchannel

#### Fix

- better oauth server management
- error on undefined authorizationEndpoint in oauth2 flow fixed
- display error when highlighting the variable

## 1.14.0 (2021-02-22)

#### Fix

- scope param is added to authorization code flow

## 1.13.0 (2021-02-21)

#### Features

- generate code with [httpsnippet](https://www.npmjs.com/package/httpsnippet)
- new setting `httpyac.environmentPickMany`
- new script injection with `httpyac.httpRegionScript`

## 1.12.0 (2021-02-15)

#### Fix

- parsed jwt token is added right after request is received

## 1.11.0 (2021-02-15)

#### Features

- keep alive for openid jwt token

#### Fix

- default headers variable replacment fixed
- fixed bug in isTokenExpired

## 1.10.0 (2021-02-15)

#### Fix

- variable replacement in body is broken

## 1.9.0 (2021-02-14)

#### Features

- gql external file support
- caldav http methods added
- variable based default header support
- add command to create empty http file (scratchpad)

#### Fixes

- output parsed jwt token not working in openidvariable replace
- fix table in docs openid

## 1.8.0 (2021-02-13)

#### Features

- better graphql support

## 1.7.0 (2021-02-12)

#### Features

- open id flows (Client Credentials Grant, Resource Owner Password Grant, Authentication Flow) added
- expanding variables
- better output channel logging
- inputBox und quickpick VariableReplacer eingefügt
- multi-line comments

#### Fixes

- warning on invalid js variable names

## 1.5.0 (2021-02-02)

#### Features

- intellij environment variables support
- cancel request
- progress for send request

#### Fixes

- environments of dotenv files next to \*.http files could not be selected

## 1.4.0 (2021-01-24)

#### Features

- better presentation of the request information

#### Fixes

- error on creating jwt meta tag
- response body parsing error on reopen http file
- error open request information from response view fixed

## 1.3.1 (2021-01-22)

#### Fixes

- forgot compiling httpyac

## 1.3 (2021-01-22)

#### Fixes

- global context is available in script (e.g. process.env)

## 1.2 (2021-01-21)

#### Features

- variables can easily be defined in this format `@host = https://www.google.de`
- basic auth replacement added
- digest auth replacement added
- request lines in RFC 2616 format do not need `###` delimiter, but no pre request script is possible
- document symbols are supported
- jwt token decode support
- code completion for request header, mime-types, @ref
- metaName ignores starting " (@import supports [Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense))
- new meta data @note, to show confirmation dialog
- gutter icon to highlight request line

#### Fixes

- last request file has missing body
- Imports used variables of other environments if the file was loaded from 2 different environments
- multiple parsing of a file because of missing version update fixed

## 1.1 (2021-01-13)

#### Features

- Intellij Idea HTTP Client compatibility
- autoupdate environment on changes in dotenv files
- Older Releases of VS Code are supported

#### Fixes

- Javascript Keywords as Variables are not supported message
- multipart/form-data error no body fixed
- Response Information Hover is not updated on new request

## 1.0 (2021-01-10)

#### Features

- initial release
