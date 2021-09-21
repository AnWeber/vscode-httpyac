<p align="center">
<img src="https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png" alt="HttpYac Logo" />
</p>

# httpYac - Yet another Client

> Quickly and easily send REST, SOAP, GraphQL or gRPC requests directly in Editor

<p align="center">
<a href="https://httpyac.github.io/">
<img src="https://httpyac.github.io/httpyac_site.png" alt="HttpYac" />
</a>
<img src="https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/examples/oauth.gif" alt="HttpYac Extension" />
</p>

## Example

```html
@user = doe
@password = 12345678

GET https://httpbin.org/basic-auth/{{user}}/{{password}}
Authorization: Basic {{user}} {{password}}
```

more [examples](https://httpyac.github.io/guide/examples) and [guide](https://httpyac.github.io/guide/)


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
| `httpyac.generateCode` | generate code of request in ActiveTextEditor in active line |
| `httpyac.reset` | reset environments, oauth sessions and cookies |
| `httpyac.logout` | see current oauth2 sessions and logout |
| `httpyac.removeCookies` | remove received cookies |
| `httpyac.new` | create empty http file |
| `httpyac.showHistory` | show response history |
| `httpyac.clearHistory` | clear response history |
| `httpyac.removeHistory` | remove history entry |

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
| `httpyac.envDirName` | relative or absolute path to folder with dotenv files | `"env"` |

#### Response View Settings
| Name | Description | Default |
| - | - | - |
| `httpyac.responseViewHeader` | headers (e.g. content-type), test results (e.g. tests.failed), timings (e.g. timings.total) and meta data (e.g. meta.size) visible in code lens of response | `[ "timings.total", "content-type", "content-length" ]`|
| `httpyac.responseViewMode` | response view mode of file | `preview` |
| `httpyac.responseViewPrettyPrint` | response view pretty prints content. Pretty print is only working, if editor receives focus (vscode limitation) | `true`|
| `httpyac.responseViewPreserveFocus` | response view will not take focus after receiving response | `true`|
| `httpyac.responseViewColumn` | response preview column option (current, beside) | `beside`|
| `httpyac.responseViewLanguageMap` | mimetype to [languageId](https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers) map for response view (only used if not in preview mode) | `beside`|



#### httpYac Extension

| Name | Description | Default |
| - | - | - |
| `httpyac.showGutterIcon` | show gutter icon to highlight request lines | `true` |
| `httpyac.showNotificationPopup` | show information, warning and error notifiation message | `true` |
| `httpyac.useMethodInSendCodeLens` | use request method in send code lens | `false` |
| `httpyac.logLevel` | log level of output channel | `warn` |
| `httpyac.maxHistoryItems` | number of max history items | `50` |


## License
[MIT License](LICENSE)

## Change Log
See CHANGELOG [here](CHANGELOG.md)
