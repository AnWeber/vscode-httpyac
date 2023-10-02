## [6.7.1] (2023-10-02)

### Fix

- default of setting `testRunAlwaysUseEnv`is null (Anweber/vscode-httpyac#230)
- testRunner uses latest activeEnvironemnt (Anweber/vscode-httpyac#230)
- testRunner supports repeating tests multipe times (Anweber/vscode-httpyac#229)

## [6.7.0] (2023-10-01)

### Feature

- allow change of active Environment in provided context (Anweber/vscode-httpyac#225)

### Fixes

- create unique filename for markdown preview to prevent microsoft/vscode#194421 (#226)
- responseItem for httpregion were not found, which caused an incorrect display of the CodeLens (#228)
- improvements to completionItem API (AnWeber/vscode-httpyac#224)


## [6.6.7]  (2023-09-18)

### Fixes

- reenable Http Header completion (#223)

## [6.6.6]  (2023-09-15)

### Fixes
- resolve connect Promise in Websocket Requests on close before open Connection (AnWeber/httpbook#96)
- fixed Syntax highlighting issue with Intellij scripts when JSON body is used (#220)
- generate code did not load VSCode Settings configuration (#221)

## [6.6.4]  (2023-09-02)

### Fixes

- support return of null in variable replacement (Anweber/httpyac#513)
- allow for variable use in $pick picklists: `{{ $pick ask-variable? $value: data }}` (Anweber/httpyac#537)
- pre request in intellij format is executed before variable replacer (Anweber/httpyac#534)
- allow removal of UserAgent Header (httpyac/httpyac.github.io#70) using script
```
{{@request
  request.headers["User-Agent"] = undefined
}}
```
- Settings ignore `""` value (#215)
- open Response Editor in same viewColumn as previous Editor (#216)

## [6.6.3]  (2023-07-25)

### Fixes

- support multiple `# @import` of the same file from different httpFiles (Anweber/httpyac#508)

## [6.6.2]  (2023-07-24)

### Fixes

- support OData Batch Processing (Anweber/httpyac#507)
- update to httpsnippet@3.0.1


## [6.6.1]  (2023-07-23)

### Fixes

- improve stability of asserts using objects/arrays (Anweber/httpyac#503)

## [6.6.0]  (2023-07-17)

### Features

- add method `$getOAuth2Response` to javascript context (Anweber/httpyac#499)
- add `HttpClientProvider` and `JavascriptProvider` to httpyac API
- allow global Asserts and `onRequest`/ `onResponse` hooks and import global Asserts from other Http Files (Anweber/httpyac#488) 
- support xpath namespaces using `@xpath_ns` (Anweber/httpyac#493)

### Fixes

- always log current `httpRegion` and `response` on exception (Anweber/httpyac#275)

## [6.5.1]  (2023-06-13)

### Fixes

- `output=none` is respected in CLI (Anweber/httpyac#477)
- `$input-askonce` does not ask again for existing variables (Anweber/httpyac#477)

## [6.5.0]  (2023-06-11)

### Features

- support configuration of output request logger options in .httpyac config (Anweber/httpyac#467)
- calculate average of timings for repeat (httpyac/httpyac.github.io#69)

### Fixes

- use `env` as default env dirname (Anweber/vscode-httpyac#198)

## [6.4.6]  (2023-06-09)

### Fixes

- default headers do not overwrite headers with other casing (Anweber/vscode-httpyac#200)
- env dir is resolved correctly (Anweber/vscode-httpyac#198)

## [6.4.5]

### Fixes

- output-failed did not work, if output none is used (Anweber/httpyac#460)
- prefer httpyac config files for root determination (#194)
- unresolved `# @ref` throws error (#197)
- after script is not triggered too much while using `@loop` (Anweber/httpyac#463)
- CookieJar can be disabled with file config (AnWeber/httpyac#457)

## [6.4.4] (2023-05-23)

### Fixes

- `# @jwt` metadata parsedBody matches body (Anweber/httpyac#454)
- allow comment in last line of script (Anweber/httpyac#454)
- ignore region names which are not valid Javascript Variables (Anweber/httpyac#455)
- responseViewLanguageMap is also used in preview mode (#193)

## [6.4.3] (2023-05-16)

### Fixes

- request method detection supports only uppercase character to prevent false positives (Anweber/httpyac#447)

## [6.4.2] (2023-05-07)

### Fixes

- reuse current NodeJS Context instead of creating custom Context to allow use of crypto in NodeJS@20 (AnWeber/httpyac#437)

## 6.4.1 (2023-05-01)

### Fixes

- using askonce modifier is optional (#190)

## 6.4.0 (2023-04-29)

### Features

- add setting `testBailOnFailedTest` to stop execution on failed assertions (#186)
- add support for custom plugins in httpFileStore initialization (#186)
- add modifier `$input-askonce` to ask only once for $input (AnWeber/httpyac##436)

### Fixes

- ensure deletion of additional body properties (prettyPrintBody, parsedBody, rawBody), if `body` property is modified (AnWeber/httpbook#84)

### Fixes

- Assertions ends JSON Block (#187)

## 6.3.4 (2023-03-30)

### Fixes

- response is correctly parsed with HttpSymbolKind.Response

## 6.3.3 (2023-03-23)

### Fixes

- allow async/await syntax in code snippets (AnWeber/httpyac#398)
- unable to use variable as graphql input (AnWeber/httpyac#421)

## 6.3.2 (2023-03-17)

### Fixes

- `# @import` imports variables of \*.http files (#184)
- setSource uses correct startOffset (AnWeber/httpbook#82)

## 6.3.1 (2023-03-16)

### Fixes

- add activeEnvironment to HttpFile (#415)

## 6.3.0 (2023-03-15)

### Breaking Changes

- some utils functions are removed and added directly to httpRegion (e.g isGlobalHttpRegion)

### Features

- add Additional orchestration capabilities by providing [`$httpyac`](https://github.com/AnWeber/httpyac/blob/main/src/plugins/javascript/httpyacJsApi.ts) in Script (Anweber/httpyac#405)

### Fixes

- fix Maximum call stack size exceeded when remove AMQP Session from store (Anweber/httpyac#410)
- add missing request to GRPC, AMQP, Websocket and EventSource Responses (Anweber/httpyac#413)

## 6.2.0 (2023-03-05)

### Features

- allow sending body in GET Request (AnWeber/vscode-httpyac#179)
- allow import of files into variable (AnWeber/vscode-httpyac#180)
- allow setting global var with variable notation (AnWeber/vscode-httpyac#180)

### Fixes

- GRPC Request needs to be object instead of Buffer/string (Anweber/httpyac#407)

## 6.1.0 (2023-02-13)

#### Features

- add code completion for tests

## 6.0.0 (2023-02-12)

#### Breaking Changes

- Protocol Specific Request Clients are replaced with generic interface RequestClient (`$requestClient`).
- to access previous Client you can use `$requestClient.nativeClient`
- removed Variables: amqpClient, amqpChannel, grpcStream, mqttClient, websocketClient
- requireUncached is removed

#### Features

- use `$requestClient.send(<body>)` to send string or Buffer with current client. Add EventListener `$requestClient.on('message', (response) => ...)` to access respones of client

```
MQTT tcp://broker.hivemq.com
topic: httpyac

{{@streaming
  async function writeStream(){
    await sleep(1000);
    $requestClient.on("message", (response) => {
      console.info(response);
    });
    $requestClient.send("find me");
    await sleep(1000);
    $requestClient.send("wait for response");
    await sleep(1000);
  }
  exports.waitPromise = writeStream();
}}
```

- extended and simpler assert logic ([docs](https://httpyac.github.io/guide/assert.html))

```
GET https://httpbin.org/anything

?? status == 200
```

- multiple specification of request body per response (like Intellij Request Body separator)

```
MQTT tcp://broker.hivemq.com
topic: httpyac

Send one
===
Send two
=== wait-for-server
=== wait-for-server
Send three
```

- websocket requests with same url as a websocket request are requested with the same url. You can keep a WebSocket Client open and send additional requests.

```
# @keepStreaming
wss://scrumpoker.foo

###
wss://scrumpoker.foo
["CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\u0000"]
===
["SUBSCRIBE\nid:sub-0\ndestination:/user/topic/username\n\n\u0000"]
===
["SUBSCRIBE\nid:sub-1\ndestination:/user/topic/notification\n\n\u0000"]
===
["SUBSCRIBE\nid:sub-3\ndestination:/topic/setting/cardset/{{roomId}}\n\n\u0000"]
===
["SEND\ndestination:/ws/room/register\n\n{\"roomID\":\"{{roomId}}\"}\u0000"]
===
["SEND\ndestination:/ws/user/username\n\n{\"username\":\"httpyac\"}\u0000"]
###
wss://scrumpoker.foo
["SEND\ndestination:/ws/room/{{roomId}}/estimate\n\n{\"estimation\":\"5\"}\u0000"]

```

- add parallel option to cli and test runner to execute requests in parallel.
- process each line of an event stream like Intellij ([see](https://www.jetbrains.com/help/idea/http-response-handling-examples.html#stream_scripting))
- add `proxyExcludeList` config to exclude some url from proxy calls (AnWeber/vscode-httpyac#176)
- add icon indicator for copy value (#169)

#### Fixes

- no-redirect did not prevent redirect (AnWeber/vscode-httpyac#171)
- `private.env.json` settings overrides other `env.json` settings to be Intellij compatible (AnWeber/vscode-httpyac#175)

## 5.10.3 (2023-01-21)

#### Fix

- xmldom warnings and errors are redirected to log.debug (#383)

## 5.10.2(2023-01-09)

#### Fix

- update to httpyac@5.10.1

## 5.10.1 (2023-01-09)

#### Fix

- generate code uses Buffer as valid body for harRequest (#166)

## 5.10.0 (2023-01-08)

#### Features

- add Intellijj Http Graphql Method support (AnWeber/vscode-httpyac#165)
- update Intellijj Dynamic Variables
- add Intellij PreRequest Script Support
- add `$random` Utils to create Mock Data

## 5.9.0 (2023-01-03)

#### Features

- provide Global Variable Cache (#358)
- add XPath Variable Replacer (httpyac/httpyac.github.io#62)

#### Fixes

- replace header variables before body (httpyac/httpyac.github.io#63)

## 5.8.3 (2022-12-15)

#### Features

- nesting of testItems support filesystem structure (#163)

## 5.8.2 (2022-11-16)

#### Fixes

- allow whitespace around variable definition (AnWeber/httpyac#354)
- response code lens support if user-data-dir is used (#161)
- generate unique id for httpRegion (httpyac/httpyac.github.io#60)

## 5.8.1 (2022-11-13)

#### Fixes

- allow set of MQTT Username and Password with Request Headers (httpyac/httpyac.github.io#58)
- display correct version in docker command

## 5.8.0 (2022-11-06)

#### Features

- add docker image for httpyac CLI
- some debug improvements

#### Fixes

- Cookie Header support variable replacment (AnWeber/httpyac#352)
- Parsing Issue with non HTTP responses
- add response to cache before showing editor

## 5.7.6 (2022-10-30)

#### Fixes

- support protocol with multiline urls (AnWeber/vscode-httpyac#159)
- prevent issue with string.replace special replacement patterns (httpyac/httpyac.github.io#57)

## 5.7.5 (2022-10-21)

#### Fixes

- fix missing jwt data (httpyac/httpyac.github.io#56)

## 5.7.4 (2022-10-08)

#### Fixes

- update inquirer and filesize
- parser error on `/* ... */` comment directly after header

## 5.7.3 (2022-09-28)

#### Fixes

- update hookpoint to prevent error with interceptor

## 5.7.2 (2022-09-19)

#### Fixes

- TestController use FileSystemWatcher to watch changes outside of VSCode API
- trim filename in `@import` (#150)

## 5.7.1 (2022-09-12)

#### Features

- add Syntax highlighting in Markdown (#149)

## 5.7.0 (2022-09-06)

#### Features

- allow setting CookieJar Options (httpyac/httpyac.github.io#55)

## 5.6.4 (2022-08-25)

#### Fixes

- issue with breaking change in minor version of tough-cookie

## 5.6.3 (2022-08-24)

#### Features

- add response tags to allow better filtering in responseLogging Hook (AnWeber/httpyac#322)

#### Fixes

- update dependency hookpoint@2.0.1
- modify usage because of Variadic option (AnWeber/httpyac#326)

## 5.6.2 (2022-08-14)

#### Features

- generate http file with inlined variables (httpyac/httpyac.github.io#54)

#### Fixes

- all test items are enqueued at start of test run to get better progress
- respect timeout in GRPC, MQTT and Websocket Requests (AnWeber/httpyac#320)

## 5.6.1 (2022-08-05)

#### Fixes

- prevent override of httpYac Script Keywords (AnWeber/vscode-httpyac#144)
- output failed tests and not success message (AnWeber/vscode-httpyac#143)

## 5.6.0 (2022-08-04)

#### Features

- add [VSCode Test Controller](https://code.visualstudio.com/updates/v1_59#_testing-apis) support for http files (#140)
- add OAuth2 config setting to change server.listener port (AnWeber/httpyac#315)

#### Fixes

- notebook detection was broken after VSCode breaking change
- request body is not deleted with default settings
- no exception after cancel while OAuth2 Authorization Code flow

## 5.5.6 (2022-07-12)

#### Fixes

- prevent circular JSON.stringify with fallback (#139)
- output header key in test.header (AnWeber/httpyac#304)
- support scheme `vscode-userdata` (httpyac/httpyac.github.io#51)

## 5.5.5 (2022-07-12)

#### Fixes

- better logging for invalid uri (httpyac/httpyac.github.io#51)

## 5.5.4 (2022-07-11)

#### Fixes

- prevent missing body with request body and `@loop` (Anweber/httpyac#302)

## 5.5.3 (2022-07-05)

#### Fixes

- use correct request for HTTP302 logging (#137)
- prevent excessive ref calls if response body is falsy (#136)

## 5.5.2 (2022-06-23)

#### Fixes

- support Request Body in AWS Signature (Anweber/httpyac#299)
- fix Filesystem Error with `vscode-notebook-cell` Scheme (Anweber/httpbook#60)
- fixed Syntax Language Issues with Headers highlighted in request body
- fixed several Syntax Language Issues with Handlebars
- fixed missing Response Header highlighting

## 5.5.1 (2022-06-22)

#### Fixes

- fixed several Syntax Language Issues with Handlebars (#123)

## 5.5.0 (2022-06-19)

#### Features

- log redirect responses (HTTP 302)
- add Hover Provider to view variables and OAuth2 Header

#### Fixes

- grpc requests allows output redirection (AnWeber/httpyac#297)
- copy of value in TreeDataProvider works only with string values (#131)

## 5.4.2 (2022-05-28)

#### Fixes

- `# @loop` allows statements before the loop is executed (AnWeber/httpyac#279)
- `# @loop` sets variable for `# @name` (AnWeber/httpyac#279)
- ensure string headers in http requests
- ignore casing in Intellij Headers (httpyac/httpyac.github.io#47)
- use correct symbol for response Header (AnWeber/httpbook#53)

## 5.4.1 (2022-05-09)

#### Features

- allow variables in outputRedirection (httpyac/httpyac.github.io#46)

#### Fixes

- allow empty string as variable (AnWeber/httpyac#268)
- add response parser for GRPC, WS, SSE to fix issues in httpbook (AnWeber/httpbook#51)
- add user with space in http auth digest (AnWeber/httpyac#274)

## 5.4.0 (2022-04-21)

#### Features

- add `dayjs` and `uuid` to require
- `# @disabled` allows evalExpression which is evaluated on each step in execution (AnWeber/httpyac#246)

#### Fixes

- throw error on javascript error (AnWeber/httpyac#245)
- correct order of output using `# @ref` (AnWeber/httpyac#245)
- correct order of output using `# @loop` (AnWeber/httpyac#243)
- right request count using `# @loop` (AnWeber/httpyac#242)
- ignore current state of metaData.disabled in code lens for send (#119)

## 5.3.0 (2022-04-03)

#### Breaking Changes

- The default behavior of setting variables has been changed. Now the variables are evaluated directly (query evaluates to `?foo=foobar`).

```
@bar=bar
@foo=foo{{bar}}

###
@bar=bar2
GET https://httpbin.org/anything?foo={{foo}} HTTP/1.1
```

The previous behavior can be enforced by means of `:=` (query evaluates to `?foo=foobar2`).

```
@bar=bar
@foo:=foo{{bar}}

###
@bar=bar2
GET https://httpbin.org/anything?foo={{foo}} HTTP/1.1
```

#### Features

- allow simple transform response variables (AnWeber/httpyac#235)

```
GET https://httpbin.org/json

@foo={{response.parsedBody.slideshow.author}}
```

- `Request` Output Channel supports `http` language id

#### Fix

- right order of cli output (AnWeber/httpyac#237)
- fix `when` condition of Variables TreeDataProvider and Environment Tree Data Provider

## 5.2.3 (2022-03-26)

#### Fix

- Security fix for transitive Dependency minimist
- more options to modify name of response preview (#114)

## 5.2.2 (2022-03-20)

#### Fix

- OAuth2 uses only fallback, if prefixed value is undefined or null (AnWeber/httpyac#228)

## 5.2.1 (2022-03-16)

#### Features

- merge all responses on using `repeat-mode` and add count of status (httpyac.github.io#34)

#### Fix

- Variable substitution did not work inside body of `application/x-www-form-urlencoded` (httpyac/httpyac.github.io#36)
- revert modification of `# @import` and store imported http files in httpFileStore (#112)
- VSCode command `httpyac.reset` does not throw error message (#113)

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
- infinite loop if `@ref` in `@import` disabled or not found

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
