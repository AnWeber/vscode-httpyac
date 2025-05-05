import * as httpyac from 'httpyac';
import { ResourceConfig, getResourceConfig, getConfigSetting } from '../config';
import { getOutputChannel } from '../io';

export async function provideOutputChannelLogger(
  _env: string[] | undefined,
  context: httpyac.VariableProviderContext
): Promise<httpyac.Variables> {
  if (context.config && isProcessorContext(context)) {
    const appConfig = getConfigSetting();
    const resourceConfig = getResourceConfig(context.httpFile.fileName);
    if (resourceConfig.logRequest) {
      const outputChannelLogResponse = httpyac.utils.requestLoggerFactory(
        (arg: string) => {
          const requestChannel = getOutputChannel('Request', 'http');
          requestChannel.appendLine(arg);

          if (appConfig.responseViewMode === 'none' && !context.variables.TEST_RUNNER) {
            requestChannel.show(true);
          }
        },
        getRequestLoggerOptions(resourceConfig, context.config)
      );
      const logContextStream = context.logStream;
      context.logStream = async (type, message) => {
        context.scriptConsole?.info(type, message);
        if (logContextStream) {
          await logContextStream?.(type, message);
        }
      };
      const logResponse = context.logResponse;
      context.logResponse = async (response, httpRegion) => {
        await outputChannelLogResponse(response, httpRegion);
        await logResponse?.(response, httpRegion);
      };
    }
  }

  return {};
}

function isProcessorContext(context: unknown): context is httpyac.ProcessorContext {
  const guard = context as httpyac.ProcessorContext;
  return !!guard?.config;
}

function getRequestLoggerOptions(
  resourceConfig: ResourceConfig,
  config: httpyac.EnvironmentConfig
): httpyac.RequestLoggerFactoryOptions | undefined {
  if (resourceConfig.logOutputChannelOptions || config.log?.options) {
    return Object.assign({}, resourceConfig.logOutputChannelOptions, config.log?.options);
  }
  return {
    requestOutput: true,
    requestHeaders: true,
    requestBodyLength: 1024,
    responseHeaders: true,
    responseBodyLength: 1024,
  };
}
