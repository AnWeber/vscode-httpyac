import { APP_NAME } from '../config';
import { io, LogLevel, utils } from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../config';

const outputChannels: Record<string, vscode.OutputChannel> = {};

export enum LogChannel {
  Log = 'Log',
  Console = 'Console',
}

export function getOutputChannel(channel: string, options: string): vscode.OutputChannel {
  let outputChannel = outputChannels[channel];
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(`${APP_NAME} - ${channel}`, options);
    outputChannels[channel] = outputChannel;
  }
  return outputChannel;
}

function getLogOutputChannel(channel: string): vscode.LogOutputChannel {
  let outputChannel = outputChannels[channel];
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(`${APP_NAME} - ${channel}`, { log: true });
    outputChannels[channel] = outputChannel;
  }
  return outputChannel as vscode.LogOutputChannel;
}

export function logToOutputChannelFactory(
  ...channels: Array<LogChannel>
): (level: LogLevel, ...messages: Array<unknown>) => void {
  return function logToOutputChannel(level: LogLevel, ...messages: Array<unknown>) {
    const outputChannels = channels.map(c => getLogOutputChannel(c));

    const strings = messages.map(m => {
      if (utils.isError(m)) {
        return [m.message, m.stack].filter(m => !!m).join('\n');
      }
      return utils.toString(m);
    });

    const message = strings.shift();
    if (!message) {
      return;
    }
    const method = logForLevel(level);
    outputChannels.forEach(c => method(c)(message, ...strings));
  };
}

function logForLevel(level: LogLevel) {
  switch (level) {
    case LogLevel.trace:
      return (c: vscode.LogOutputChannel) => c.trace.bind(c);
    case LogLevel.debug:
      return (c: vscode.LogOutputChannel) => c.debug.bind(c);
    case LogLevel.warn:
      return (c: vscode.LogOutputChannel) => c.warn.bind(c);
    case LogLevel.error:
      return (c: vscode.LogOutputChannel) => c.error.bind(c);
    default:
      return (c: vscode.LogOutputChannel) => c.info.bind(c);
  }
}

export function resetOutputChannel() {
  const config = getConfigSetting();
  if (!config.logResetOutputchannel) {
    return;
  }
  for (const c of Object.values(outputChannels)) {
    c.clear();
  }
}

export function initLog() {
  io.log.options.logMethod = logToOutputChannelFactory(LogChannel.Log);
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
