import { log, utils } from 'httpyac';
import { window, workspace } from 'vscode';
import { getConfigSetting } from '../config';

export function errorHandler(this: unknown): MethodDecorator {
  return (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = errorHandlerWrapper.bind(this)(target, propertyKey, originalMethod);
    return descriptor;
  };
}

export function errorHandlerWrapper(target: unknown, propertyKey: string | symbol, method: (...args: unknown[]) => unknown) {
  return function(this: unknown, ...args: unknown[]) : unknown {
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

async function handleError(_target: unknown, _propertyKey: string | symbol, err: unknown) {
  log.error(err);

  if (getConfigSetting().showNotificationPopup) {
    if (err instanceof Error) {
      if (err.message.match(/Protocol.*not\s+supported/u)) {
        if (workspace.getConfiguration('http').proxySupport === 'override') {
          await window.showErrorMessage('Proxy issue: maybe change http.proxySupport=override to off');
        }
      }
      await window.showErrorMessage(err.stack || `${err.name} - ${err.message}`);
    } else if (utils.isString(err)) {
      await window.showErrorMessage(err);
    } else {
      await window.showErrorMessage(JSON.stringify(err, null, 2));
    }
  }
}
