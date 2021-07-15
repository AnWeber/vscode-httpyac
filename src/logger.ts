import { Disposable, OutputChannel, window } from 'vscode';
import { APP_NAME, getConfigSetting } from './config';
import { logOutputProvider, LogLevel, LogChannels, LogHandler } from 'httpyac';


const outputChannels: Record<string, OutputChannel> = {};

export function getOutputChannel(channel: string): OutputChannel {
  let outputChannel = outputChannels[channel];
  if (!outputChannel) {
    outputChannel = window.createOutputChannel(`${APP_NAME} - ${channel}`);
    outputChannels[channel] = outputChannel;
  }
  return outputChannel;
}

export class OutputChannelLogHandler implements LogHandler {
  private readonly outputChannel: OutputChannel;
  constructor(channel: string) {
    this.outputChannel = getOutputChannel(channel);
  }
  info(...params: unknown[]): void {
    if (params.length > 0) {
      this.outputChannel.append('INFO: ');
      logParams(this.outputChannel, ...params);
    } else {
      this.outputChannel.appendLine('');
    }
  }
  log(...params: unknown[]): void {
    if (params.length > 0) {
      this.outputChannel.append('INFO: ');
      logParams(this.outputChannel, ...params);
    } else {
      this.outputChannel.appendLine('');
    }
  }
  trace(...params: unknown[]): void {
    if (params.length > 0) {
      this.outputChannel.append('TRACE: ');
      logParams(this.outputChannel, ...params);
    } else {
      this.outputChannel.appendLine('');
    }
  }
  debug(...params: unknown[]): void {
    if (params.length > 0) {
      this.outputChannel.append('DEBUG: ');
      logParams(this.outputChannel, ...params);
    } else {
      this.outputChannel.appendLine('');
    }
  }
  error(...params: unknown[]): void {
    if (params.length > 0) {
      this.outputChannel.append('ERROR: ');
      logParams(this.outputChannel, ...params);
    } else {
      this.outputChannel.appendLine('');
    }
  }
  warn(...params: unknown[]): void {
    if (params.length > 0) {
      this.outputChannel.append('WARN: ');
      logParams(this.outputChannel, ...params);
    } else {
      this.outputChannel.appendLine('');
    }
  }
  clear(): void {
    this.outputChannel.clear();
  }

}

function logToOutputChannel(channel: LogChannels, level: LogLevel, ...params: unknown[]) {
  if (channel === LogChannels.PopupChannel) {
    showMessage(level, ...params);
    return;
  }

  const outputChannel = getOutputChannel(LogChannels[channel]);
  outputChannel.append(`${LogLevel[level].toUpperCase()}: `);
  logParams(outputChannel, params);
  if (level === LogLevel.error) {
    outputChannel.show(true);
  }
}


function logParams(outputChannel: OutputChannel, ...params: unknown[]) {
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
    const outputChannel = getOutputChannel(LogChannels[channel]);
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
