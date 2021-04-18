import { Disposable, OutputChannel, window } from 'vscode';
import { APP_NAME, getConfigSetting } from './config';
import { logOutputProvider, LogLevel, LogChannels } from 'httpyac';


const outputChannels: Record<string, OutputChannel> = {};

function getOutputChannel(channel: LogChannels) {
  let outputChannel = outputChannels[channel];
  if (!outputChannel) {
    outputChannel = window.createOutputChannel(`${APP_NAME} - ${LogChannels[channel]}`);
    outputChannels[channel] = outputChannel;
    outputChannel.show(true);
  }
  return outputChannel;
}

function logToOutputChannel(channel: LogChannels, level: LogLevel, ...params: unknown[]) {
  if (channel === LogChannels.PopupChannel) {
    showMessage(level, ...params);
    return;
  }

  const outputChannel = getOutputChannel(channel);

  if (channel !== LogChannels.Request) {
    outputChannel.append(`${LogLevel[level].toUpperCase()}: `);
  }
  for (const param of params) {
    if (typeof param === 'string') {
      outputChannel.appendLine(param);
    } else if (param instanceof Error) {
      outputChannel.appendLine(`${param.name} - ${param.message}`);
      if (param.stack) {
        outputChannel.appendLine(param.stack);
      }
    } else {
      outputChannel.appendLine(`${JSON.stringify(param, null, 2)}`);
    }
  }
  if (level === LogLevel.error) {
    outputChannel.show(true);
  } else if (getConfigSetting().logRequest && channel === LogChannels.Request) {
    outputChannel.show(true);
  }
}


function showMessage(level: LogLevel, ...params: unknown[]) {
  if (getConfigSetting().showNotificationPopup) {
    const [message, ...args] = params.map(obj => `${obj}`);
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
}





export function initVscodeLogger() : Disposable {
  logOutputProvider.log = logToOutputChannel;
  logOutputProvider.clear = (channel: LogChannels) => {
    const outputChannel = getOutputChannel(channel);
    outputChannel.clear();
  };
  return {
    dispose: function dispose() {
      for (const [key, value] of Object.entries(outputChannels)) {
        value.dispose();
        delete outputChannels[key];
      }
    }
  };
}