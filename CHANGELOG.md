## 1.15.0 (2021-02-xx)


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
