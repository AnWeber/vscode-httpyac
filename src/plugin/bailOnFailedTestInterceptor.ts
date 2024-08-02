import { ProcessorContext, TestResultStatus } from 'httpyac';
import { getConfigSetting } from '../config';

export const bailOnFailedTestInterceptor = {
  id: 'bailOnFailedTests',
  afterLoop: async function bail(hookContext: { args: [ProcessorContext] }) {
    const [context] = hookContext.args;
    const failedTest = context.httpRegion.testResults?.find?.(obj =>
      [TestResultStatus.ERROR, TestResultStatus.FAILED].includes(obj.status)
    );
    if (failedTest) {
      const bailOnFailedTest = getConfigSetting().testBailOnFailedTest;
      if (bailOnFailedTest === 'error') {
        throw failedTest.error || new Error('bail on failed test');
      } else if (bailOnFailedTest === 'silent') {
        return false;
      }
    }
    return true;
  },
};
