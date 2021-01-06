import { window } from 'vscode';
import { APP_NAME } from './config';

import { log } from 'httpyac';

const outputChannel = window.createOutputChannel(APP_NAME);

function logToOutputChannel(level: string,  message: string, ...params: any[]){
  outputChannel.appendLine(`[${level} - ${(new Date().toLocaleTimeString())}] ${message}`);
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

function info (message: string, ...params: any[]) {
    logToOutputChannel('INFO', message, ...params);
};
function trace (message: string, ...params: any[]) {
    logToOutputChannel('TRACE', message, ...params);
};
function debug (message: string, ...params: any[]) {
    logToOutputChannel('DEBUG', message, ...params);
};
function error (message: string, ...params: any[]) {
    logToOutputChannel('ERROR', message, ...params);
};
function warn(message: string, ...params: any[]) {
  logToOutputChannel('WARN', message, ...params);
};


export function initVscodeLogger() {
	log.info = info;
	log.warn = warn;
	log.trace = trace;
	log.debug = debug;
	log.error = error;
}