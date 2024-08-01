import { initFileProvider } from './fileProvider';
import { initLog, initUserInteractionProvider } from './userInteractionProvider';

export function initIOProvider() {
  initFileProvider();
  initLog();
  return initUserInteractionProvider();
}
