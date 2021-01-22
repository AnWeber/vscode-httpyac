import { log, utils } from 'httpyac';
import { window } from 'vscode';

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

async function handleError(target: any, propertyKey: string | symbol, err: any) {
  log.error(`${target}.${String(propertyKey)}`, err);
  if (err instanceof Error) {
    const showTitle = 'show dialog';
    const result = await window.showErrorMessage(err.stack || `${err.name} - ${err.message}`, showTitle);
    if (result === showTitle) {
      await window.showErrorMessage(err.stack || `${err.name} - ${err.message}`, {modal: true});
    }
  } else if(utils.isString(err)) {
    await window.showErrorMessage(err);
  } else {
    await window.showErrorMessage(JSON.stringify(err));
  }
}
