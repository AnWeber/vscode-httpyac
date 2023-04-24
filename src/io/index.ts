export { toUri } from './fileProvider';
export * from './storageProvider';
export { getOutputChannel, logStream, logToOutputChannelFactory } from './userInteractionProvider';
import { initFileProvider } from './fileProvider';
import { initLog, initUserInteractionProvider } from './userInteractionProvider';

export function initIOProvider() {
  initFileProvider();
  initLog();
  return initUserInteractionProvider();
}
