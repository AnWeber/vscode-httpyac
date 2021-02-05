import { window } from 'vscode';
import { APP_NAME } from './config';
import { log, LogLevel } from 'httpyac';

const outputChannel = window.createOutputChannel(APP_NAME);

function logToOutputChannel(level: LogLevel, message: string, ...params: any[]) {
  if (level >= log.level) {
    outputChannel.appendLine(`[${LogLevel[level].toUpperCase()} - ${(new Date().toLocaleTimeString())}] ${message}`);
    if (params) {
      for (const data of params) {
        if (typeof data === 'string') {
          outputChannel.appendLine(data);
        } else {
          outputChannel.appendLine(`${data}`);
        }
      }
    }
  }
}

function info (message: string, ...params: any[]) {
    logToOutputChannel(LogLevel.info, message, ...params);
};
function trace (message: string, ...params: any[]) {
    logToOutputChannel(LogLevel.trace, message, ...params);
};
function debug (message: string, ...params: any[]) {
    logToOutputChannel(LogLevel.debug, message, ...params);
};
function error (message: string, ...params: any[]) {
    logToOutputChannel(LogLevel.error, message, ...params);
};
function warn(message: string, ...params: any[]) {
  logToOutputChannel(LogLevel.warn, message, ...params);
};


export function initVscodeLogger() {
	log.info = info;
	log.warn = warn;
	log.trace = trace;
	log.debug = debug;
	log.error = error;
}