## 1.4.0 (2021-??-??)


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
