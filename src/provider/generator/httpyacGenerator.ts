import * as httpyac from 'httpyac';
import * as vscode from 'vscode';
import { getConfigSetting } from '../../config';

export function getHttpyacTargets() {
  return [
    {
      label: 'httpyac',
      target: 'httpyac',
      client: 'merge',
      description: 'create merged httpyac file',
      generate: generateMergedHttpFile,
    },
  ];
}

async function generateMergedHttpFile(context: httpyac.HttpRegionSendContext) {
  const lines: Array<string> = [await getEnvironmentVariables(context), await getHttpFileSource(context)];
  const content = httpyac.utils.toMultiLineString(lines);
  return removeImports(content);
}

async function getHttpFileSource(context: httpyac.HttpRegionSendContext) {
  const lines: Array<string> = [];

  const config = getConfigSetting();
  await vscode.window.withProgress(
    {
      location:
        config.progressDefaultLocation === 'window'
          ? vscode.ProgressLocation.Window
          : vscode.ProgressLocation.Notification,
      cancellable: true,
      title: 'create merged httpyac file',
    },
    async (progress, token) => {
      context.progress = {
        isCanceled: () => token.isCancellationRequested,
        register: (event: () => void) => {
          const dispose = token.onCancellationRequested(event);
          return () => dispose.dispose();
        },
        report: data => progress.report(data),
      };
      context.processedHttpRegions = [];
      const interceptor = {
        async afterLoop() {
          return false;
        },
      };
      context.httpRegion.hooks.onRequest.addInterceptor(interceptor);
      try {
        await httpyac.send(context);

        for (const httpRegion of context.processedHttpRegions) {
          if (httpRegion.symbol.source) {
            lines.push(httpRegion.symbol.source);
            lines.push('###');
          }
        }
        if (context.httpRegion.symbol.source) {
          lines.push(context.httpRegion.symbol.source);
          lines.push('###');
        }
      } finally {
        context.httpRegion.hooks.onRequest.removeInterceptor(interceptor);
      }
    }
  );
  return httpyac.utils.toMultiLineString(lines);
}

async function getEnvironmentVariables(context: httpyac.HttpRegionSendContext) {
  const lines: Array<string> = [];
  const environmentVariables = await httpyac.getVariables(context);
  for (const [key, value] of Object.entries(environmentVariables)) {
    if (httpyac.utils.isString(value)) {
      lines.push(`@${key}=${value}`);
    } else {
      lines.push(`{{`);
      if (value instanceof Date) {
        lines.push(`  exports.${key}=new Date(${value.getTime()});`);
      } else {
        lines.push(`  exports.${key}=${JSON.stringify(value)};`);
      }
      lines.push(`}}`);
    }
  }
  lines.push(`###`);
  return httpyac.utils.toMultiLineString(lines);
}

function removeImports(content: string) {
  return httpyac.utils.toMultiLineString(
    httpyac.utils.toMultiLineArray(content).filter(obj => !/^\s*(#+|\/{2,})\s+@import\s.*$/u.test(obj))
  );
}
