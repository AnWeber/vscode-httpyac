## 2.16.2 (2021-06-27)

#### Features
* support start entries contribution (VSCode Insiders)
* support more command arguments (TextDocument, TextEditor, Uri)

## 2.16.1 (2021-06-20)

#### Fix
* activation on new file command

## 2.16.0 (2021-06-20)

#### Features
* customize textdecoration provider

#### Fix
* error while using metadata followRedirect fixed
* http2 needs to explicitly activated

## 2.15.1 (2021-06-17)

#### Fix
* fix gql (wrong Execution Order)

## 2.15.0 (2021-06-13)

#### Features
* add default accept header */*
* faster parsing with lazy access of fs

## 2.14.1 (2021-06-11)

#### Fix
* update normalize-url
* fix Protocol "https:" not supported. Expected "http:" (disable http2)

## 2.14.0 (2021-06-06)

#### Features
* decorationProvider supports borderlines around region
* better test method support

#### Fix
* error parsing body in inline response

## 2.13.1 (2021-06-05)

#### Fix
* error parsing http version in inline response

## 2.13.0 (2021-06-05)

#### Features
* assertUtils for simple tests
#### Fix
* empty line after requestline not needed anymore

## 2.12.5 (2021-06-04)

#### Features
* new setting `httpyac.environmentStoreSelectedOnStart` to store last used env

#### Fix
* region delimiter ignore chars after delimiter

## 2.12.4 (2021-06-03)
#### Fix
* error on require local javascript file

## 2.12.3 (2021-06-01)

#### Fix
* fix error if ### on first line
## 2.12.1 (2021-05-30)

#### Features
* change signature of responseRef array
* HttpSymbol provides property source
* utils for http file output
#### Fix
* Spelling mistake in symbol
* small error in Http version output

## 2.12.0 (2021-05-30)

#### Features
* update to httpyac 2.12.0
## 2.11.0 (2021-05-29)

#### Features
* add parser for response and responseRef
* add documentStore to extensionApi

## 2.10.0 (2021-05-24)

#### Features
* dependency updates of open, inquirer and dotenv

## 2.9.0 (2021-05-18)

#### Features
* force inject variables with metadata setting (`# @injectVariables`)

## 2.8.0 (2021-05-13)

#### Features
* support [remote repositories](https://code.visualstudio.com/updates/v1_56#_remote-repositories-remotehub)
* add support for mimetype application/x-javascript
* update dotenv to 9.0.2
* add setting to disable codelens in notebooks
* add settting to enable showing request output
* extended extensionApi with ResponseOutputProcessor
#### Fix
* fix error in settings for requestGotOptions

## 2.7.0 (2021-05-03)

#### Features
* all markdown utils exported
* reuse parser promise on same version and filename
* qna redirect to github discussions

#### Fix
* use shared env on empty environment array
* delimiter ignored on source of httpregion

## 2.6.0 (2021-05-01)

#### Features
* extended extension api
* toMarkdown with better option support and style change
* httpClient is optional on httpyacApi.send

#### Fix
* incomplete httpRegion.source fixed

## 2.5.0 (2021-04-25)

#### Breaking Changes

* [Action](https://github.com/AnWeber/httpyac/blob/main/src/models/httpRegionAction.ts#L7) method changed to process instead of processor
*  [VariableReplacer](https://github.com/AnWeber/httpyac/blob/main/src/models/variableReplacer.ts#L5) changed to object with replace method, to implement better trust support
#### Features

* better static code analysis in project
* json schema support for .httpyac.json
* rest client dynamic variable support ($guid, $randomInt, $timestamp, $datetime, $localDatetime, $processEnv, $dotenv)

#### Fix

* ref and forceRef support is fixed
* error on executing httpRegionScript
## 2.4.0 (2021-04-15)

#### Features

* better [test](https://github.com/AnWeber/httpyac/blob/main/examples/README.md#node-js-scripts) method support
* refactored response in script to [http response](https://github.com/AnWeber/httpyac/blob/main/src/models/httpResponse.ts) instead of body
* multiple output formats for response view (body, header, full, exchange)

#### Fix

* unnecessary file parse when using ref in vscode
* fixed error in code generation with query parameters (#21)

## 2.3.0 (2021-04-09)

#### Features

* define global script executed after every request
* set ssl client certifcates per request
* intellij syntax support for metadata (`// @no-cookie-jar`)
* send many http regions at once (select per picker)

#### Fix

* priority of config initialization adjusted ([#3](https://github.com/AnWeber/httpyac/issues/3))


## 2.2.0 (2021-04-05)

#### Feature

* support for ssl client certficates
* note http version (version 1.1 disables http2 support)
* cookiejar support

## 2.1.0 (2021-03-30)

### Fix

* error in signing request with aws

## 2.0.0 (2021-03-27)

#### Feature

* cli support with [httpyac cli](https://www.npmjs.com/package/httpyac)

#### Fix

* error if not existing file is imported
* error with meta data note fixed
* error in signing request with aws

## 1.19.2 (2021-03-18)

#### Fix

* Variable with string empty could not be replaced

## 1.19.1 (2021-03-14)

#### Feature

* performance improvement on preview mode with better documentselector
* send and sendAll in editor title

## 1.19.0 (2021-03-12)

#### Fix

* preview mode only works if file is saved to temp file

## 1.18.1 (2021-03-07)

#### Fix

* error in gql requests (I should invest in unit tests)

## 1.18.0 (2021-03-07)

#### Features

* enable/disable code lens in settings
* AWS signature v4 support

#### Fix

* removing header in default headers did not always remove header from request

## 1.17.0 (2021-03-04)

#### Features

* oauth2 implicit flow
* see current sessions and logout
* disable notifications

#### Fix
* user session depending on OAuth Flow, clientId and possibly username. On changed scopes user session is renewed

## 1.16.0 (2021-02-26)

#### Features

* separated log output (log, script console, requests)
* scroll to top on new requests
#### Fix
* cache error in openidVariableReplacer if inline Variables are used

## 1.15.1 (2021-02-26)
#### Fix
* error in gql parsing
## 1.15.0 (2021-02-25)
#### Features

* display of request method in code lens possible
* Intellij Idea Features implemented
  * support single line script
  * support no-log meta param
  * support no-redirect meta param
  * support multi-line request url
* redirect console.log statements in inline scripts to outputchannel
#### Fix

* better oauth server management
* error on undefined authorizationEndpoint in oauth2 flow fixed
* display error when highlighting the variable
## 1.14.0 (2021-02-22)

#### Fix

* scope param is added to authorization code flow

## 1.13.0 (2021-02-21)

#### Features

* generate code with [httpsnippet](https://www.npmjs.com/package/httpsnippet)
* new setting `httpyac.environmentPickMany`
* new script injection with `httpyac.httpRegionScript`

## 1.12.0 (2021-02-15)

#### Fix

* parsed jwt token is added right after request is received

## 1.11.0 (2021-02-15)

#### Features
* keep alive for openid jwt token

#### Fix

* default headers variable replacment fixed
* fixed bug in isTokenExpired


## 1.10.0 (2021-02-15)

#### Fix

* variable replacement in body is broken

## 1.9.0 (2021-02-14)

#### Features
* gql external file support
* caldav http methods added
* variable based default header support
* add command to create empty http file (scratchpad)


#### Fixes
* output parsed jwt token not working in openidvariable replace
* fix table in docs openid

## 1.8.0 (2021-02-13)

#### Features
* better graphql support

## 1.7.0 (2021-02-12)

#### Features
* open id flows (Client Credentials Grant, Resource Owner Password Grant, Authentication Flow) added
* expanding variables
* better output channel logging
* inputBox und quickpick VariableReplacer eingefügt
* multi-line comments

#### Fixes
* warning on invalid js variable names


## 1.5.0 (2021-02-02)

#### Features
* intellij environment variables support
* cancel request
* progress for send request

#### Fixes
* environments of dotenv files next to *.http files could not be selected

## 1.4.0 (2021-01-24)

#### Features
* better presentation of the request information

#### Fixes
* error on creating jwt meta tag
* response body parsing error on reopen http file
* error open request information from response view fixed

## 1.3.1 (2021-01-22)


#### Fixes
* forgot compiling httpyac


## 1.3 (2021-01-22)


#### Fixes
* global context is available in script (e.g. process.env)


## 1.2 (2021-01-21)

#### Features
* variables can easily be defined in this format `@host = https://www.google.de`
* basic auth replacement added
* digest auth replacement added
* request lines in RFC 2616 format do not need `###` delimiter, but no pre request script is possible
* document symbols are supported
* jwt token decode support
* code completion for request header, mime-types, @ref
* metaName ignores starting " (@import supports [Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense))
* new meta data @note, to show confirmation dialog
* gutter icon to highlight request line

#### Fixes
* last request file has missing body
* Imports used variables of other environments if the file was loaded from 2 different environments
* multiple parsing of a file because of missing version update fixed

## 1.1 (2021-01-13)

#### Features
* Intellij Idea HTTP Client compatibility
* autoupdate environment on changes in dotenv files
* Older Releases of VS Code are supported

#### Fixes
* Javascript Keywords as Variables are not supported message
* multipart/form-data error no body fixed
* Response Information Hover is not updated on new request

## 1.0 (2021-01-10)

#### Features
* initial release
