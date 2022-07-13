import { APP_NAME } from '../config';
import { io, LogLevel, HttpResponse, StreamResponse, utils } from 'httpyac';
import * as vscode from 'vscode';

const outputChannels: Record<string, vscode.OutputChannel> = {};

export function getOutputChannel(channel: string, languageId: string | undefined = undefined): vscode.OutputChannel {
  let outputChannel = outputChannels[channel];
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(`${APP_NAME} - ${channel}`, languageId);
    outputChannels[channel] = outputChannel;
  }
  return outputChannel;
}

export async function logStream(type: string, response: HttpResponse & StreamResponse): Promise<void> {
  const outputChannel = getOutputChannel(response.protocol);
  outputChannel.show(true);

  appendToOutputChannel(
    outputChannel,
    [response.message || response.body],
    `${new Date().toLocaleTimeString()} - ${type}: `
  );
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

function appendToOutputChannel(outputChannel: vscode.OutputChannel, messages: unknown[], prefix?: string) {
  for (const param of messages) {
    if (param !== undefined) {
      if (prefix) {
        outputChannel.append(prefix);
      }
      if (utils.isError(param)) {
        outputChannel.appendLine(`${param.name} - ${param.message}`);
        if (param.stack) {
          outputChannel.appendLine(param.stack);
        }
      } else {
        outputChannel.appendLine(utils.toString(param) || `${param}`);
      }
    }
  }
}

export function initLog() {
  io.log.options.logMethod = logToOutputChannelFactory('Log');
}

export function initUserInteractionProvider(): vscode.Disposable {
  io.userInteractionProvider.isTrusted = (message?: string) => {
    if (!vscode.workspace.isTrusted) {
      io.log.warn(`Workspace is not trusted. ${message || 'Function'} is disabled`);
      return false;
    }
    return true;
  };
  io.userInteractionProvider.showInformationMessage = async (message: string, ...buttons: Array<string>) =>
    await vscode.window.showInformationMessage(message, ...buttons);
  io.userInteractionProvider.showErrorMessage = async (message: string, ...buttons: Array<string>) =>
    await vscode.window.showErrorMessage(message, ...buttons);
  io.userInteractionProvider.showWarnMessage = async (message: string, ...buttons: Array<string>) =>
    await vscode.window.showWarningMessage(message, ...buttons);
  io.userInteractionProvider.showNote = async (note: string) => {
    const buttonTitle = 'Execute';
    const result = await vscode.window.showWarningMessage(note, { modal: true }, buttonTitle);
    return result === buttonTitle;
  };
  io.userInteractionProvider.showInputPrompt = async (message: string, defaultValue?: string, maskedInput?: boolean) =>
    await vscode.window.showInputBox({
      placeHolder: vscode.workspace.isTrusted ? message : `Workspace not trusted: ${message}`,
      value: defaultValue,
      prompt: message,
      ignoreFocusOut: true,
      password: maskedInput,
    });
  io.userInteractionProvider.showListPrompt = async (message: string, values: string[]) =>
    await vscode.window.showQuickPick(values, {
      placeHolder: message,
      ignoreFocusOut: true,
    });

  io.userInteractionProvider.setClipboard = async message => {
    if (vscode.workspace.isTrusted) {
      try {
        await vscode.env.clipboard.writeText(message);
      } catch (err) {
        io.log.warn(err);
      }
    } else {
      io.log.warn(`Workspace is not trusted. setClipboard is disabled`);
    }
  };
  io.userInteractionProvider.getClipboard = async () => {
    if (vscode.workspace.isTrusted) {
      try {
        return await vscode.env.clipboard.readText();
      } catch (err) {
        io.log.warn(err);
      }
    } else {
      io.log.warn(`Workspace is not trusted. getClipboard is disabled`);
    }
    return '';
  };

  return {
    dispose: function dispose() {
      for (const [key, value] of Object.entries(outputChannels)) {
        value.dispose();
        delete outputChannels[key];
      }
    },
  };
}
