import { ProcessorContext, TestResultStatus, utils } from 'httpyac';
import { getConfigSetting } from '../config';

let bailInBeforeLoop = false;

export function resetBail() {
  bailInBeforeLoop = false;
}

export const bailOnFailedTestInterceptor = {
  id: 'bailOnFailed',
  beforeLoop: async function beforeLoop(hookContext: { args: [ProcessorContext] }) {
    if (bailInBeforeLoop) {
      const [context] = hookContext.args;
      utils.addSkippedTestResult(context.httpRegion, 'request skipped because of bail');
      return false;
    }
    return true;
  },
  onError: async function bailOnError() {
    if (getConfigSetting().testBailOnFailedTest) {
      bailInBeforeLoop = true;
    }
    return true;
  },
  afterTrigger: async function bail(hookContext: { args: [ProcessorContext] }) {
    const context = hookContext.args[0];
    const failedTest = context.httpRegion.testResults?.find?.(obj => [TestResultStatus.FAILED].includes(obj.status));
    if (failedTest && getConfigSetting().testBailOnFailedTest) {
      bailInBeforeLoop = true;
    }
    return true;
  },
};
