import { utils } from 'httpyac';
import { getErrorQuickFix } from '../provider';
import { window } from 'vscode';

export const errorNotificationHandler = {
  id: 'errorNotification',

  onError: async function onError(err: unknown): Promise<boolean | undefined> {
    if (utils.isError(err)) {
      let message = err.stack || `${err.name} - ${err.message}`;
      const quickFix = getErrorQuickFix(err);
      if (quickFix) {
        message = `${err.name} - ${err.message} => ${quickFix}`;
      }
      window.showErrorMessage(message);
    } else {
      window.showErrorMessage(utils.toString(err) || `${err}`);
    }
    return true;
  },
};
