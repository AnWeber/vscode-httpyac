import * as httpyac from 'httpyac';

export function logTestRun(httpRegions: Array<httpyac.ProcessedHttpRegion>) {
  const groupedHttpRegions = groupProcessedHttpRegions(httpRegions);

  for (const groupedHttpRegion of groupedHttpRegions) {
    const messages: Array<string> = [];
    for (const httpRegion of groupedHttpRegion) {
      if (messages.length === 0) {
        messages.push(`${fillWhitespace(httpRegion.symbol.name, 50)}:`);
      }

      const results: Array<string> = [];
      if (httpRegion.response?.statusCode) {
        results.push(`${httpRegion.response?.statusCode}`);
      }
      if (httpRegion.testResults && httpRegion.testResults.some(obj => obj.error)) {
        results.push(`${httpRegion.testResults.filter(obj => !!obj.error).length}✖`);
      }
      if (httpRegion.response?.timings?.total) {
        const total = `${httpRegion.response?.timings?.total}`;
        results.push(`${fillWhitespace(total, 4)}ms`);
      }
      messages.push(results.join(' '));
    }

    httpyac.io.log.info(messages.join(' '));
  }
}

function fillWhitespace(text: string, length: number) {
  if (text.length >= length) {
    return text;
  }
  const whitespace = [...new Array(length - text.length)].map(() => ' ').join('');
  return `${whitespace}${text}`;
}

function groupProcessedHttpRegions(httpRegions: httpyac.ProcessedHttpRegion[]) {
  const result: Record<string, Record<string, Array<httpyac.ProcessedHttpRegion>>> = {};
  for (const httpRegion of httpRegions) {
    const filename = httpyac.io.fileProvider.toString(httpRegion.filename);
    const httpRegionKey = `${httpRegion.symbol.name}_${httpRegion.symbol.startLine}`;
    const httpRegionMap = getOrCreateKey(result, filename, {});
    const values = getOrCreateKey(httpRegionMap, httpRegionKey, []);
    values.push(httpRegion);
  }

  return Object.values(result)
    .map(obj => Object.values(obj))
    .flat(1);
}

function getOrCreateKey<T>(map: Record<string, T>, key: string, defaultVal: T): T {
  const val = map[key];
  if (val) {
    return val;
  }
  map[key] = defaultVal;
  return defaultVal;
}
