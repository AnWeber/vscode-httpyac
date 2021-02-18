[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/anweber.vscode-httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac) [![Downloads](https://vsmarketplacebadge.apphb.com/downloads/anweber.vscode-httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac) [![Installs](https://vsmarketplacebadge.apphb.com/installs/anweber.vscode-httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac) [![Rating](https://vsmarketplacebadge.apphb.com/rating/anweber.vscode-httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac)

<p align="center">
<img src="https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png" alt="HttpYac Logo" />
</p>

# Http Yac - Yet another Client

Quickly and easily send REST, SOAP, and GraphQL requests directly within Visual Studio Code

![example](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/oauth.gif)

## Features

#### send/ resend

Create and execute any REST, SOAP, and GraphQL queries from within VS Code and view response in other TextDocument.

  * view response header and timings
  * quick view configurable header list

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/send.gif)

#### variables

Built in support for variables and enviroments.
  * Quickly switch environments
  * [dotenv](https://www.npmjs.com/package/dotenv) support
  * provide custom variables with scripts

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/variables.gif)

#### script support

enrich requests with custom scripts
  * create custom variables
  * add Custom Authentication to the requests
  * Node JS scripting support (pre request and post request)
  * require any library

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/scripting.gif)


#### preview feature
auto open custom preview editor
  * auto preview images and pdf ([vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) needed)
  * support custom editor with openWith Meta Tag

 > see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/preview.gif)

#### reference other *.http files
it is possible to reference other http files and create requeste cascades

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/import.gif)

#### It's Extensible

Due to the NodeJS support the client can be extended arbitrarily. In addition, the extension supports an Api with which, all components can be changed arbitrarily (parser, processing, output).

  * extension exports a [api](https://code.visualstudio.com/api/references/vscode-api#extensions)
  * extension support with setting `httpyac.extensionScript`, which points to script

  ```javascript
  const {httpYacApi} = require('httpYac');
  const vscode = require('vscode');
  httpYacApi.httpRegionParsers.splice(2, 0, {
    parse: (lineReader,...args) => {
      const next = lineReader.next();
      if(next.value.textLine.startsWith('//')){
        vscode.window.showInformationMessage(next.value.textLine.substring(1));
        return {
          endLine: next.value.line,
          symbols: []
        };
      }
      return false;
    }
  });
  ```


#### Intellij HTTP Client compatibility

*.http files of [Intellij HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) can be parsed and executed


## Feature comparisons

| Feature | httpYac | [Postman](https://www.postman.com/) | [Rest Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) | [Intellij Idea](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) |
| - | :-: | :-: | :-: | :-: |
| Send Request and View| ✓ | ✓ | ✓ | ✓ |
| Variable support | ✓ | ✓ | ✓ | ✓ |
| Custom Scripting support | ✓ | ✓ | [pull request](https://github.com/Huachao/vscode-restclient/pull/674) | partially |
| Test/ Assert Response | ✓ | ✓ | - | ✓ |
| Authorization support | ✓ | ✓ | partially (no custom auth flow) | - |
| Code Generation | in development | ✓ | ✓ | - |
| Built-in Preview Support (Image, PDF, ...) | ✓ | - | ✓ (only Image) | - |
| Share workspace | ✓ | paywall | ✓ | ✓ |
| extensible/ plugin support | ✓ | partially | - | - |
| cli support | in development | ✓ | - | - |
| import OpenAPI | in development | ✓ | - | - |

## Http Language

All Features are enabled if language of TextDocument is http. By default the language will be activated in two cases:
* file extension is .http or .rest
* First line of file follows standard request line in [RFC 2616](https://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html) (e.g GET www.google.de)

Or manually

> see [switch language](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/language.gif)

#### Request

Http language supports multiple Requests in one file. Requests get delimited with `###`. The first line in one region is interpreted as request-line. All Parts of a request supports replacement with dynamic variables (`{{variable}}`)

##### Request-Line

```html
GET https://www.google.de HTTP/1.1
```

Request Method and Http Version is optional. If no Request Method is provided GET is used.
##### Query Strings
Query Params can be added in the request-line

```html
GET https://www.google.de?q=httpyac HTTP/1.1
```
or can attached immediatly after the request-line


```html
GET https://www.google.de HTTP/1.1
  ?q=httpyac
  &ie=UTF-8
```
##### Headers

The next lines after the Request Line is parsed as request headers
```html
GET https://www.google.de HTTP/1.1
Content-Type: text/html
Authorization: Bearer {{token}}
```

If you use the same headers several times, it is possible to store them in a variable and reuse them.

```html
{{
  exports.defaultHeaders = {
    'Content-Type': 'text/html',
    'Authorization': `Bearer ${token}`
  };
}}
GET https://www.google.de HTTP/1.1
...defaultHeaders
```

##### Request Body
All content separated with a blank line after the request-line gets parsed as request body

```html
POST {{host}}/auth
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {{authorization}}

grant_type=client_credentials
```

You can also import contents of other files into the body (relative and absolute paths are supported).
```html
POST {{host}}/auth
Authorization: Basic {{authorization}}

< ./body.json
```

If you want to replace variables in the file please import it with `<@`
```html
POST {{host}}/auth
Authorization: Basic {{authorization}}

<@ ./body.json
```
All files are read with UTF-8 encoding. If a different encoding is desired, provide it.
```html
POST {{host}}/auth
Authorization: Basic {{authorization}}

<@latin1 ./body.json
```

Inline Text and file imports can be mixed

```html
POST {{host}}/auth
Content-Type: multipart/form-data; boundary=--WebKitFormBoundary

--WebKitFormBoundary
Content-Disposition: form-data; name="text"

invoice
--WebKitFormBoundary
Content-Disposition: form-data; name="invoice"; filename="invoice.pdf"
Content-Type: application/pdf

< ./invoice.pdf
--WebKitFormBoundary
```

GraphQL queries are supported. Parsing Logic will automatically generate a GraphQL request body from the query and the optional variables. GraphQL fragments are also supported and are included in the body by name.

```html
fragment IOParts on Repository {
  description
  diskUsage
}

POST https://api.github.com/graphql
Content-Type: application/json
Authorization: Bearer {{git_api_key}}


query repositoryQuery($name: String!, $owner: String!) {
  repository(name: $name, owner: $owner) {
    name
    fullName: nameWithOwner
    ...IOParts
    forkCount
    watchers {
        totalCount
    }
  }
}

{
    "name": "vscode-httpyac",
    "owner": "AnWeber"
}
```

To import GraphQL File you need to use special GraphQL Import Directive. Operationname foo is optional

```html
POST https://api.github.com/graphql
Content-Type: application/json
Authorization: Bearer {{git_api_key}}


gql foo < ./bar.gql

{
    "name": "vscode-httpyac",
    "owner": "AnWeber"
}
```


#### Meta Data

All lines starting with `#` are interpreted as comment lines. Lines starting with `###` starts a new region. Lines with `# @property value` are meta data and tags the request with the property.


##### regions
All lines starting with a `###` are interpreted as new region. Only one request per region is supported.

```html
https:/www.google.de

###

https://www.google.de
```

If the requests are provided in [RFC 2616](https://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html) format, separation with `###` is not required. All scripts between the two requests are interpreted as post scripts.
```html
GET https:/www.google.de


GET https://www.google.de
```

##### name
responses of a requests with a name are automatically added as variables and can be reused by other requests
```html
# @name keycloak
POST {{host}}/auth

###
GET {{host}}/tasks
Authorization: Bearer {{keycloak.access_token}}
```

> name must be unique in all imported files, there is no scope support and first found request with name will be used.

##### ref and forceRef
requests can reference other requests. When the request is called, it is ensured that the referenced request is called beforehand. `forceRef` always call the other request. `ref` only calls if no response is cached

```html
# @name keycloak
POST {{host}}/auth

###
GET {{host}}/tasks
# @ref keycloak
Authorization: Bearer {{keycloak.access_token}}
```

##### import
To reference requests from other files, these must first be imported. Imported files are enabled for all requests in one file.
```html
GET {{host}}/tasks
# @import ./keycloak.http
# @ref keycloak
Authorization: Bearer {{keycloak.access_token}}
```

##### disabled
requests can be disabled. It is possible to disable requests dynamically with `{{httpRegion.metaParams.disabled=true}}` in script
```html
# @disabled
POST {{host}}/auth
```

##### jwt
jwt meta data supports auto decode of jwt token. just provide property in response to decode and it is added to the promise with ${property}_parsed
```html
# @jwt access_secret

POST {{keycloak}}/auth/realms/test/protocol/openid-connect/token

```


##### language
[Language Id](https://code.visualstudio.com/docs/languages/overview) of the response view. If language is not specified, it will be generated from the content-type header of the response

```html
# @language json
POST {{host}}/auth
```

##### note
shows a confirmation dialog before sending request

```html
# @note are you sure?
DELETE /invoices
```

##### save

If `@save` is specified, the response will not be displayed but saved directly.
##### openWith

Provide viewType of custom editor to preview files. If content-type header of the response is image, files will be previewed automatically with built-in image preview. If content-type is `application/pdf` and extension [vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) is installed, it will be used for preview.
```html
# @openWith imagePreview.previewEditor
https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png
```
##### extension

extension of file for save or openWith.

#### Variables

Variables can be easily created with the following scheme.
```
@host = http://elastic:9200
```

These are valid from definition for all subsequent requests and scripts. The variables are saved per file after creation. The variables are also imported from other files using @import meta param.

```
# @import ./variables.http

@host = {{keycloak_url}}
```

> Variables definition in this format also allows variables substitution

#### Node JS Scripts
It is possible to create NodeJS scripts. All scripts before the request line are executed before the request is called. All scripts after the request line are executed as soon as the response is received. All exports of the script are stored as variables. External scripts can be imported using require, but you need to install dependencies yourself.

> Variables already defined can be accessed via the global scope.

```
{{
  const CryptoJS = require('crypto-js');
  const request = httpRegion.request;
  const authDate = new Date();
  let requestUri = request.url.substring(request.url.indexOf('/v1'), request.url.indexOf('?') > 0 ? request.url.indexOf('?') : request.url.length);
  let timeInMillis = authDate.getTime() - authDate.getMilliseconds();

  let signature = request.method + "|" + requestUri + "|" + timeInMillis;

  let signatureHmac = CryptoJS.HmacSHA256(signature, accessSecret);
  let signatureBase64 = CryptoJS.enc.Base64.stringify(signatureHmac);
  exports.authentcation = serviceToken + " " + accessKey + ":" + signatureBase64;
}}
@host = https://www.mydomain.de
# @name admin
GET {{host}}/admin
Authentication: {{authentcation}}

{{
  const assert = require('assert');
  assert.equal(admin.name, "Mario", "name is valid");
}}
```

> Since all variables are placed on the global scope of the script, they may overwrite other variables. Please use unique variable names

Scripts with no request in the same region are executed for every requests in the file (Global Scripts)


> External dependencies must be installed independently, exceptions are [vscode](https://www.npmjs.com/package/@types/vscode), [got](https://www.npmjs.com/package/got) and [httpYac](https://www.npmjs.com/package/httpyac) Dependency, which are provided from the extension.

#### Variable Substitution in Request

Before the request is sent, all variables in the request are replaced.

##### NodeJs Script Replacement
All entries of the form {{...}} are interpreted as NodeJS Javascript which returns exactly one value. Since all variables can be easily accessed on the global scope, this allows for simple substitution.

```
@searchVal = test

GET https://www.google.de?q={{searchVal}}
```

> It is possible to create more complex scripts, but this is not recommended and you should use a separate script block instead.


##### Intellij Dynamic Variables
Intellij dynamic variables are supported.

| Name | Description |
| - | - |
| $uuid | generates a universally unique identifier (UUID-v4) |
| $timestamp | generates the current UNIX timestamp |
| $randomInt| generates a random integer between 0 and 1000. |

```
GET https://www.google.de?q={{$timestamp}}&q2={{$uuid}}&q2={{$randomInt}}
```

##### Host Replacment
If the url starts with / and a variable host is defined the URL of this host will be prepended

```html
@host = http://elastic:9200


GET /.kibana

GET /_cat/indices
```


##### Input und QuickPick Replacment
Dynamic Variable Resolution with VS Code showInputBox and showQuickPick is supported

```html
@app = {{$pick select app? $value: foo,bar}}
@app2 = {{$input input app? $value: foo}}

```

##### OpenID Connect Replacment
The following [Open ID Connect](https://openid.net/specs/openid-connect-basic-1_0.html) flows are supported.

* Authentication (or Basic) Flow (grant_type = authorization_code)
* Resource Owner Password Grant (grant_type = password)
* Client Credentials Grant (grant_type = client_credentials)

```html

GET /secured_service
Authorization: openid {{grant_type}} {{variable_prefix}}

# example

GET /secured_service
Authorization: openid client_credentials auth
```
To configure the flow, the following variables must be specified

| variable | flow |
| - | - |
| {{prefix}}_tokenEndpoint | authorization_code, password, client_credentials |
| {{prefix}}_clientId | authorization_code, password, client_credentials |
| {{prefix}}_clientId | authorization_code, password, client_credentials |
| {{prefix}}_authorizationEndpoint | authorization_code |
| {{prefix}}_port | authorization_code |
| {{prefix}}_username | password |
| {{prefix}}_password | password |

> To get the code from the Open ID server, a http server must be started for the Authorization Flow on port 3000 (default). The server is stopped immediatly after receiving the code. You need to configure your OpenId Provider to allow localhost:3000 as valid redirect url


It is possible to convert the generated token into a token of another realm using [Token Exchange](https://tools.ietf.org/html/rfc8693)


```html

GET /secured_service
Authorization: openid {{grant_type}} {{variable_prefix}} token_exchange {{token_exchange_prefix}}

# example

GET /secured_service
Authorization: openid client_credentials auth token_exchange realm_auth
```

> All calls made can be traced in the output channel httpyac

Functionality was tested using [keycloak](https://www.keycloak.org/docs/latest/getting_started/)


##### BasicAuth Replacment
A support method is provided for using Basic Authentication. Just specify the username and password separated by spaces and the base64 encoding will be applied automatically

```html
@host = https://httpbin.org
@user=doe
@password=12345678


GET /basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}

```
##### DigestAuth Replacment
A support method is provided for using Digest Authentication. Just specify the username and password separated by spaces and the digest access authentication will be applied automatically

```html
@host = https://httpbin.org
@user=doe
@password=12345678


GET /digest-auth/auth/{{user}}/{{password}}
Authorization: Digest {{user}} {{password}}

```

#### Intellij Script

Intellij Scripts are supported. An Http client and response object corresponding to the interface is created and are available in the script. Possibly the behavior (order of test execution, not described internal Api, ...) is not completely identical, to Intellij Execution. If needed, please let us know.

```
GET https://www.google.de?q={{$uuid}}
Accept: text/html

> {%
    client.global.set("search", "test");
    client.test("Request executed successfully", function() {

        client.assert(response.status === 200, "Response status is not 200");
    });
%}
###
```

> Intellij scripts are always executed after request. Scripts before Request Line are ignored


## Environment Support

The extension supports switching to different environments. Several environments can be active at the same time. A different environment can be selected per file. Newly opened files are opened with the last active environment.
All environment variables are expanded automatically.

```
# .env
auth_tokenEndpoint={{authHost}}/auth/realms/test/protocol/openid-connect/token

# 9.env
authHost=https://my.openid.de

# resolved variables
authHost=https://my.openid.de
auth_tokenEndpoint=https://my.openid.de/auth/realms/test/protocol/openid-connect/token
```

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/variables.gif)

##### VS Code Setting
Environments can be provided with VS Code setting `httpyac.environmentVariables`. All settings with key `$shared` are shared between all environments

```json
{
  "$shared": {
    "host": "https://mydoman"
  },
  "dev": {
    "user": "mario",
    "password": "123456"
  },
  "prod": {
    "user": "mario",
    "password": "password$ecure123"
  }
}
```
> VS Code settings are automatically monitored and when changes are made, the environment is reinitialized.

##### Dotenv File Support
[dotenv](https://www.npmjs.com/package/dotenv) support is enabled by default.  This automatically scans the root folder of the project and a configurable folder for .env file. All files with the {{name}}.env or .env.{{name}} scheme are interpreted as different environment and can be picked while switching environments

> .env files are automatically monitored by File Watcher and when changes are made, the environment is reinitialized.

> it is possible to enable a dotenvVariableProvider, which scans the directory of the current *.http file. The default for this setting is disabled.

##### Intellij Environment Variables
[intellij environment variables support](https://www.jetbrains.com/help/idea/exploring-http-syntax.html#environment-variables) support is enabled by default. This automatically scans the root folder of the project and a configurable folder for http-client.env.json/ http-client.private.env.json file.

> http-client.env.json files are automatically monitored by File Watcher and when changes are made, the environment is reinitialized.

> it is possible to enable a intellijVariableProvider, which scans the directory of the current *.http file. The default for this setting is disabled.
## Commands

![Commands](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/commands.png)

| Name | Description |
| - | - | - |
| `httpyac.send` | send request in ActiveTextEditor in active line |
| `httpyac.sendall` | send all requests in ActiveTextEditor |
| `httpyac.resend` | resend last request |
| `httpyac.show` | show cached response of request in ActiveTextEditor in active line |
| `httpyac.viewHeader` | show response headers, request header and timings of request in ActiveTextEditor in active line |
| `httpyac.save` | save response of request in ActiveTextEditor in active line |
| `httpyac.clearall` | clear all cached responses |
| `httpyac.toggle-env` | toggle environment of active text document |
| `httpyac.toggle-allenv` | toggle environment of all files |
| `httpyac.refresh` | reload environments |

## Keybindings

keybindings are only active in files with language http

| Name | Description| keybindings |
| - | - | - |
| `httpyac.send` | send request in ActiveTextEditor in active line | `ctrl+alt+r` |
| `httpyac.resend` | resend last request | `ctrl+alt+l` |
| `httpyac.toggle-env` | toggle environment of active text document | `ctrl+alt+e` |

## Settings

#### Request Settings
| Name | Description | Default |
| - | - | - |
| `httpyac.requestDefaultHeaders` | default request headers if not overwritten | `{ "User-Agent": "httpyac"}`|
| `httpyac.requestSslCertficateValidation`  | enable ssl certificate validation | `true`|
| `httpyac.requestFollowRedirect`  | Defines if redirect responses should be followed automatically.| `true`|
| `httpyac.requestTimeout`  | Milliseconds to wait for the server to end the response before aborting the request. (0 = Infity)| `0`|

> HttpYac extension uses the proxy settings made for Visual Studio Code (`http.proxy`).

#### Environment Settings
| Name | Description | Default |
| - | - | - |
| `httpyac.environmentSelectedOnStart` | list of selected environments on startup | - |
| `httpyac.environmentPickMany` | allow picking many environments at the same time | `true` |
| `httpyac.environmentVariables` | environment variables | `{ "$shared":{} }`|
| `httpyac.dotenvEnabled` | dotenv support is enabled | `true` |
| `httpyac.dotenvDirname` | relative or absolute path to folder with dotenv files | `"env"` |
| `httpyac.dotenvDefaultFiles` | default dotenv files which is active in all profiles | `[".env"]`|
| `httpyac.dotenvVariableProviderEnabled` | search for .env file next to *.http files | `false`|
| `httpyac.intellijEnvEnabled` | intellij support is enabled | `true` |
| `httpyac.intellijDirname` | relative or absolute path to folder with intellij variables files | - |
| `httpyac.intellijVariableProviderEnabled` | search for http-client.env.json file next to *.http files | `false` |

#### Response View Settings
| Name | Description | Default |
| - | - | - |
| `httpyac.responseViewHeader` | headers visible in code lens of response | `[ "content-type", "content-length" ]`|
| `httpyac.responseViewPreview` | response view will act as preview tab | `true` |
| `httpyac.responseViewReuseEditor` | response view will open in text document of same language id | `true` |
| `httpyac.responseViewPrettyPrint` | response view pretty prints content (uses VSCode Format Document) | `true`|
| `httpyac.responseViewPreserveFocus` | response view will take focus after receiving response | `true`|
| `httpyac.responseViewColumn` | response preview column option (current, beside) | `beside`|

#### httpYac Extension

| Name | Description | Default |
| - | - | - |
| `httpyac.extensionScript` | Path to a file with which the extension is adjusted | - |
| `httpyac.showGutterIcon` | show gutter icon to highlight request lines | `true` |

## Next Steps

* debugging and sanding edges
* import OpenApi
* CLI support

## License
[MIT License](LICENSE)

## Change Log
See CHANGELOG [here](CHANGELOG.md)
