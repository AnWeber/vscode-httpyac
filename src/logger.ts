import { window } from 'vscode';
import { APP_NAME } from './config';
import { outputProvider, LogLevel } from 'httpyac';

const outputChannel = window.createOutputChannel(APP_NAME);

function logToOutputChannel(level: LogLevel, ...params: any[]) {
  const [message, ...args] = params;
  outputChannel.appendLine(`[${LogLevel[level].toUpperCase()} - ${(new Date().toLocaleTimeString())}] ${message}`);
  if (args) {
    for (const data of args) {
      if (typeof data === 'string') {
        outputChannel.appendLine(data);
      } else {
        outputChannel.appendLine(`${data}`);
      }
    }
  }
}


function showMessage(level: LogLevel, ...params: any[]) {
  const [message, ...args] = params;
  if (message) {
    switch (level) {
      case LogLevel.error:
        window.showErrorMessage(message, ...args);
        break;
      case LogLevel.warn:
        window.showWarningMessage(message, ...args);
        break;
      default:
        window.showInformationMessage(message, ...args);
        break;
    }
  }
}





export function initVscodeLogger() {
  outputProvider.log = logToOutputChannel;
  outputProvider.showMessage = showMessage;
}