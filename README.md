[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/anweber.httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.httpyac) [![Downloads](https://vsmarketplacebadge.apphb.com/downloads/anweber.httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.httpyac) [![Installs](https://vsmarketplacebadge.apphb.com/installs/anweber.httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.httpyac) [![Rating](https://vsmarketplacebadge.apphb.com/rating/anweber.httpyac.svg)](https://marketplace.visualstudio.com/items?itemName=anweber.httpyac)

<p align="center">
<img src="https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/icon.png" alt="HttpYac Logo" />
</p>

# Http Yac - Yet another Client

Quickly and easily send REST, SOAP, and GraphQL requests directly within Visual Studio Code



## Features

#### send/ resend
#### preview images/ pdf
#### save
#### environments
#### extendable

## Http Language

#### Request

#### Meta Information
name
import
ref
forceRef
disabled
save
openWith
language


#### Script

## Environment Support

#### Vscode Settings
#### Dotenv Settings


## Commands

![Commands](https://raw.githubusercontent.com/AnWeber/vscode-httpyac/master/assets/commands.png)

| Name | Description  |
| - | - | - |
| `httpyac.send` | send request in ActiveTextEditor in active line |
| `httpyac.sendall` | send all requests in ActiveTextEditor |
| `httpyac.resend` | resend last request |
| `httpyac.show` | show cached response of request in ActiveTextEditor in active line |
| `httpyac.viewHeader` | show response headers, request header and timins of request in ActiveTextEditor in active line |
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
| `httpyac.environmentVariables` | environment variables | `{ "$shared":{} }`|
| `httpyac.dotenvDirname` | relative or absolute path to folder with dotenv files | - |
| `httpyac.dotenvDefaultFiles` | default dotenv files which is active in all profiles | `[".env"]`|

#### Response View Settings
| Name | Description | Default |
| - | - | - |
| `httpyac.responseViewHeader` | headers visible in code lens of response | `[ "content-type", "content-length" ]`|
| `httpyac.responseViewPreview` | response view will act as preview tab | `true` |
| `httpyac.responseViewReuseEditor` | response view will open in text document of same language id | `true` |
| `httpyac.responseViewPrettyPrint` | response view pretty prints content (uses VSCode Format Document) | `true`|
| `httpyac.responseViewPreserveFocus` | response view will take focus after receiving response | `true`|
| `httpyac.responseViewColumn` | response preview column option (current, beside) | `beside`|


## Next Steps

* Debugging and sanding rough corners
* [Intellij HttpClient](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html) compatibility layer
* CLI support

## License
[MIT License](LICENSE)

## Change Log
See CHANGELOG [here](CHANGELOG.md)
