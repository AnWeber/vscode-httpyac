import { log, utils } from 'httpyac';
import { window } from 'vscode';
import { getConfigSetting } from '../config';

export function errorHandler(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    //@ts-ignore-line
    descriptor.value = errorHandlerWrapper.bind(this)(target, propertyKey, originalMethod);
    return descriptor;
  };
}

export function errorHandlerWrapper(target: any, propertyKey: string | symbol, method: (...args: any[]) => any) {
  return function (...args: any[]) {
    try {
      //@ts-ignore-line
      const result = method.apply(this, args);
      if (utils.isPromise(result)) {
        return result.catch(err => handleError(target, propertyKey, err));
      }
      return result;
    } catch (err) {
      handleError(target, propertyKey, err);
    }
  };
}

async function handleError(_target: unknown, _propertyKey: string | symbol, err: any) {
  log.error(err);

  if (getConfigSetting().showNotificationPopup) {
    if (err instanceof Error) {
      await window.showErrorMessage(err.stack || `${err.name} - ${err.message}`);
    } else if (utils.isString(err)) {
      await window.showErrorMessage(err);
    } else {
      await window.showErrorMessage(JSON.stringify(err, null, 2));
    }
  }
}
