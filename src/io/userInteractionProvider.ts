import { APP_NAME } from '../config';
import { io, LogLevel, utils } from 'httpyac';
import { Disposable, OutputChannel, window, env } from 'vscode';

const outputChannels: Record<string, OutputChannel> = {};

export function getOutputChannel(channel: string, show = false): OutputChannel {
  let outputChannel = outputChannels[channel];
  if (!outputChannel) {
    outputChannel = window.createOutputChannel(`${APP_NAME} - ${channel}`);
    if (show) {
      outputChannel.show(true);
    }
    outputChannels[channel] = outputChannel;
  }
  return outputChannel;
}

export async function logStream(channel: string, type: string, message: unknown): Promise<void> {
  const outputChannel = getOutputChannel(channel, true);
  appendToOutputChannel(outputChannel, [message], `${new Date().toLocaleTimeString()} - ${type}: `);
}

export function logToOutputChannelFactory(channel: string): (level: LogLevel, ...messages: Array<unknown>) => void {
  return function logToOutputChannel(level: LogLevel, ...messages: Array<unknown>) {
    const outputChannel = getOutputChannel(channel);
    outputChannel.append(`${toLevelString(level).toUpperCase()}: `);
    appendToOutputChannel(outputChannel, messages);
  };
}

function toLevelString(level: LogLevel) {
  switch (level) {
    case LogLevel.trace:
      return 'TRACE';
    case LogLevel.debug:
      return 'DEBUG';
    case LogLevel.warn:
      return 'WARN';
    case LogLevel.error:
      return 'ERROR';
    default:
      return 'INFO';
  }
}

function appendToOutputChannel(outputChannel: OutputChannel, messages: unknown[], prefix?: string) {
  for (const param of messages) {
    if (param !== undefined) {
      if (prefix) {
        outputChannel.append(prefix);
      }
      if (typeof param === 'string') {
        outputChannel.appendLine(param);
      } else if (Buffer.isBuffer(param)) {
        outputChannel.appendLine(param.toString('utf-8'));
      } else if (utils.isError(param)) {
        outputChannel.appendLine(`${param.name} - ${param.message}`);
        if (param.stack) {
          outputChannel.appendLine(param.stack);
        }
      } else {
        outputChannel.appendLine(`${JSON.stringify(param, null, 2)}`);
      }
    }
  }
}

export function initUserInteractionProvider(): Disposable {
  io.log.options.logMethod = logToOutputChannelFactory('Log');
  io.userInteractionProvider.showInformationMessage = async (message: string, ...buttons: Array<string>) =>
    await window.showInformationMessage(message, ...buttons);
  io.userInteractionProvider.showErrorMessage = async (message: string, ...buttons: Array<string>) =>
    await window.showErrorMessage(message, ...buttons);
  io.userInteractionProvider.showWarnMessage = async (message: string, ...buttons: Array<string>) =>
    await window.showWarningMessage(message, ...buttons);
  io.userInteractionProvider.showNote = async (note: string) => {
    const buttonTitle = 'Execute';
    const result = await window.showWarningMessage(note, { modal: true }, buttonTitle);
    return result === buttonTitle;
  };
  io.userInteractionProvider.showInputPrompt = async (message: string, defaultValue?: string, maskedInput?: boolean) =>
    await window.showInputBox({
      placeHolder: message,
      value: defaultValue,
      prompt: message,
      ignoreFocusOut: true,
      password: maskedInput,
    });
  io.userInteractionProvider.showListPrompt = async (message: string, values: string[]) =>
    await window.showQuickPick(values, {
      placeHolder: message,
      ignoreFocusOut: true,
    });

  io.userInteractionProvider.setClipboard = async message => await env.clipboard.writeText(message);
  io.userInteractionProvider.getClipboard = async () => await env.clipboard.readText();

  return {
    dispose: function dispose() {
      for (const [key, value] of Object.entries(outputChannels)) {
        value.dispose();
        delete outputChannels[key];
      }
    },
  };
}
