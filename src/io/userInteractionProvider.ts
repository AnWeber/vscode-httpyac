import { Disposable, OutputChannel, window } from 'vscode';
import { APP_NAME } from '../config';
import { log, userInteractionProvider, LogLevel } from 'httpyac';


const outputChannels: Record<string, OutputChannel> = {};

export function getOutputChannel(channel: string): OutputChannel {
  let outputChannel = outputChannels[channel];
  if (!outputChannel) {
    outputChannel = window.createOutputChannel(`${APP_NAME} - ${channel}`);
    outputChannels[channel] = outputChannel;
  }
  return outputChannel;
}

export function logToOuputChannelFactory(channel: string) : (level: LogLevel, ...params: Array<unknown>) => void {
  return function logToOuputChannel(level: LogLevel, ...params: Array<unknown>) {
    const outputChannel = getOutputChannel(channel);

    outputChannel.append(`${LogLevel[level].toUpperCase()}: `);
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

  };
}

export function initUserInteractionProvider(): Disposable {
  log.options.logMethod = logToOuputChannelFactory('Log');

  userInteractionProvider.showErrorMessage = async (message: string) => {
    await window.showErrorMessage(message);
  };
  userInteractionProvider.showWarnMessage = async (message: string) => {
    await window.showWarningMessage(message);
  };
  userInteractionProvider.showNote = async (note: string) => {
    const buttonTitle = 'Execute';
    const result = await window.showWarningMessage(note, { modal: true }, buttonTitle);
    return result === buttonTitle;
  };
  userInteractionProvider.showInputPrompt = async (message: string, defaultValue?: string) => await window.showInputBox({
    placeHolder: message,
    value: defaultValue,
    prompt: message
  });
  userInteractionProvider.showListPrompt = async (message: string, values: string[]) => await window.showQuickPick(values, {
    placeHolder: message
  });

  return {
    dispose: function dispose() {
      for (const [key, value] of Object.entries(outputChannels)) {
        value.dispose();
        delete outputChannels[key];
      }
    }
  };
}
