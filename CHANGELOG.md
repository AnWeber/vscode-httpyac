## 1.2 (2021-01-??)


#### Features
* variables can easily be defined in this format `@host = https://www.google.de`
* request lines in RFC 2616 format do not need `###` delimiter, but no pre request script is possible
* document symbols are supported
* gutter icon to highlight request line

#### Fixes
* last request file has missing body
* Imports used variables of other environments if the file was loaded from 2 different environments

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
