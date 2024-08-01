/* eslint-disable no-invalid-this */
import { getConfigSetting } from '../config';
import { io, utils } from 'httpyac';
import { window } from 'vscode';

export function errorHandler(this: unknown): MethodDecorator {
  return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = errorHandlerWrapper.bind(this)(target, propertyKey, originalMethod);
    return descriptor;
  };
}

export function errorHandlerWrapper(
  target: unknown,
  propertyKey: string | symbol,
  method: (...args: unknown[]) => unknown
) {
  return function (this: unknown, ...args: unknown[]): unknown {
    try {
      const result = method.apply(this, args);
      if (utils.isPromise(result)) {
        return result.catch(err => handleError(target, propertyKey, err));
      }
      return result;
    } catch (err) {
      handleError(target, propertyKey, err);
    }
    return undefined;
  };
}

async function handleError(_target: unknown, propertyKey: string | symbol, err: unknown) {
  io.log.error(`error on property ${String(propertyKey)} call`, err);

  if (getConfigSetting().showNotificationPopup) {
    if (utils.isError(err)) {
      let message = err.stack || `${err.name} - ${err.message}`;
      const quickFix = getErrorQuickFix(err);
      if (quickFix) {
        message = `${err.name} - ${err.message} => ${quickFix}`;
      }
      await window.showErrorMessage(message);
    } else {
      await window.showErrorMessage(utils.toString(err) || `${err}`);
    }
  }
}

export function getErrorQuickFix(err: Error): string | undefined {
  if (err.name === 'RequestError') {
    if (['self signed certificate', 'unable to verify the first certificate'].indexOf(err.message) >= 0) {
      io.log.info(
        'Disable SSL Verification could fix the problem (# @noRejectUnauthorized or use settings httpyac.requestGotOptions)'
      );
      return 'Disable SSL Verification could fix the problem (# @noRejectUnauthorized or use settings httpyac.requestGotOptions)';
    }
    if (['Protocol "https:" not supported. Expected "http:"'].indexOf(err.message) >= 0) {
      io.log.info('HTTP2 requests are not supported with settings http.proxySupport!=off');
      return 'HTTP2 request are not supported with settings http.proxySupport!=off';
    }
  }
  return undefined;
}
