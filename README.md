<p align="center">
<img src="https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png" alt="HttpYac Logo" />
</p>

# Http Yac - Yet another Rest Client

Quickly and easily send REST, SOAP, and GraphQL requests directly in Editor

![example](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/examples/oauth.gif)


## Examples

```html
@user = doe
@password = 12345678

GET https://httpbin.org/basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}
```

```html
POST https://api.github.com/graphql
Content-Type: application/json
Authorization: Bearer {{git_api_key}}

query test($name: String!, $owner: String!) {
  repository(name: $name, owner: $owner) {
    name
    fullName: nameWithOwner
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

> [more examples and specification](https://github.com/AnWeber/httpyac/tree/main/examples)

A complete specification / documentation can be found [here](https://github.com/AnWeber/httpyac/tree/main/examples/README.md)

## Features

### send/ resend

Create and execute any REST, SOAP, and GraphQL queries from within VS Code and view response in other TextDocument.

  * view response header and timings
  * quick view configurable header list
  * view complete request and response in output channel `httpyac - Requests`

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/examples/send.gif)


### Manage Authentication

There are many authentications already built in
* [OAuth2 / Open Id Connect](https://github.com/AnWeber/httpyac/blob/main/examples/auth/oauth2.http)
* [Basic](https://github.com/AnWeber/httpyac/blob/main/examples/auth/basicAuth.http)
* [Digest](https://github.com/AnWeber/httpyac/blob/main/examples/auth/digest.http)
* [AWS](https://github.com/AnWeber/httpyac/blob/main/examples/auth/aws.http)
* [SSL Client Certificate](https://github.com/AnWeber/httpyac/blob/main/examples/auth/clientCertifcate.http)
* [Custom Authentication](https://github.com/AnWeber/httpyac/blob/main/examples/auth/custom.http) support with NodeJS Scripts


### Variables

Built in support for variables and enviroments.
  * [dotenv](https://www.npmjs.com/package/dotenv) support
  * [intellij variable support](https://www.jetbrains.com/help/idea/exploring-http-syntax.html#environment-variables)
  * provide custom variables with scripts

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/examples/variables.gif)

### Node JS Scripting Support

enrich requests with custom scripts
  * add Custom Authentication to the requests
  * Node JS scripting support (pre request and post request)

> see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/examples/scripting.gif)




### Intellij HTTP Client compatibility

*.http files of [Intellij HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) can be parsed and executed

### CLI support

Check the returns of the responses and execute them automatically using the [httpyac cli](https://www.npmjs.com/package/httpyac) in your ci environment


### Preview Feature
auto open custom preview editor
  * auto preview images and pdf ([vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) needed)
  * support custom editor with openWith Meta Tag

 > see [gif](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/examples/preview.gif)

### It's Extensible

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
## Feature comparisons

| Feature | httpYac | [Postman](https://www.postman.com/) | [Rest Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) | [Intellij Idea](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) |
| - | :-: | :-: | :-: | :-: |
| Send Request and View | ✓ | ✓ | ✓ | ✓ |
| Variable support | ✓ | ✓ | ✓ | ✓ |
| Custom Scripting support | ✓ | ✓ | - ([pull request](https://github.com/Huachao/vscode-restclient/pull/674)) | partially |
| Test/ Assert Response | ✓ | ✓ | - ([pull request](https://github.com/Huachao/vscode-restclient/pull/773)) | ✓ |
| Authorization support | ✓ | ✓ | partially (no custom auth flow) | - |
| -- OAuth2/ OpenId Connect | ✓ | ✓ | - | - |
| -- AWS Signnature v4 | ✓ | ✓ | ✓ | - |
| -- Basic Authentication | ✓ | ✓ | ✓ | ✓ |
| -- Digest Authentication | ✓ | ✓ | ✓ | ✓ |
| -- SSL Client Certificate | ✓ | ✓ | ✓ | - |
| -- Custom Authentication | ✓ | ✓ | - | - |
| Code Generation | ✓ | ✓ | ✓ | - |
| Built-in Preview Support (Image, PDF, ...) | ✓ | - | ✓ (only Image) | - |
| Share workspace | ✓ | paywall | ✓ | ✓ |
| extensible/ plugin support | ✓ | partially | - | - |
| cli support | ✓ | ✓ | - | - |

## Commands

![Commands](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/examples/commands.png)

| Name | Description |
| - | - |
| `httpyac.send` | send request in ActiveTextEditor in active line |
| `httpyac.sendall` | send all requests in ActiveTextEditor |
| `httpyac.resend` | resend last request |
| `httpyac.show` | show cached response of request in ActiveTextEditor in active line |
| `httpyac.viewHeader` | show response headers, request header and timings of request in ActiveTextEditor in active line |
| `httpyac.save` | save response of request in ActiveTextEditor in active line |
| `httpyac.clearall` | clear all cached responses |
| `httpyac.toggle-env` | toggle environment of active text document |
| `httpyac.toggle-allenv` | toggle environment of all files |
| `httpyac.generateCode` | generate code of request in ActiveTextEditor in active line |
| `httpyac.reset` | reset environments, oauth sessions and cookies |
| `httpyac.logout` | see current oauth2 sessions and logout |
| `httpyac.removeCookies` | remove received cookies |
| `httpyac.new` | create empty http file |

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
| `httpyac.requestGotOptions`  | [request options](https://github.com/sindresorhus/got/blob/main/source/types.ts#L96) used for [got](https://www.npmjs.com/package/got) | - |
| `httpyac.cookieJarEnabled` | is cookiejar support enabled | `true`|


> HttpYac extension uses the proxy settings of Visual Studio Code (`http.proxy`).

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
| `httpyac.responseViewMode` | response view mode of file | `preview` |
| `httpyac.responseViewPrettyPrint` | response view pretty prints content. Pretty print is only working, if editor receives focus (vscode limitation) | `true`|
| `httpyac.responseViewPreserveFocus` | response view will not take focus after receiving response | `true`|
| `httpyac.responseViewColumn` | response preview column option (current, beside) | `beside`|
| `httpyac.responseViewLanguageMap` | mimetype to [languageId](https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers) map for response view (only used if not in preview mode) | `beside`|



#### httpYac Extension

| Name | Description | Default |
| - | - | - |
| `httpyac.extensionScript` | absolute path to a script with extensions for HttpYac | - |
| `httpyac.httpRegionScript` | absolute or relative path to a script which gets executed for every http request in a file | - |
| `httpyac.showGutterIcon` | show gutter icon to highlight request lines | `true` |
| `httpyac.showNotificationPopup` | show information, warning and error notifiation message | `true` |
| `httpyac.useMethodInSendCodeLens` | use request method in send code lens | `false` |
| `httpyac.logLevel` | log level of output channel | `warn` |

## Next Steps

* plugins like @vue/cli
* vscode notebook support
* import OpenApi / Postman

## License
[MIT License](LICENSE)

## Change Log
See CHANGELOG [here](CHANGELOG.md)
