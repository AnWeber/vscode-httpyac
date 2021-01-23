import { HttpRegion, utils } from 'httpyac';
import { EOL } from 'os';


export function toMarkdown(httpRegion: HttpRegion) {

  const result: Array<string> = [];
  if (httpRegion.response) {
    result.push(`HTTP${httpRegion.response.httpVersion || ''} ${httpRegion.response.statusCode} - ${httpRegion.response.statusMessage}`);

    result.push('');
    result.push(`|  |  |`);
    result.push(`| --- | --- |`);
    result.push(...Object.entries(httpRegion.response.headers)
      .map(([key, value]) => `| ${key} | ${value} |`)
      .sort()
    );

    result.push('');
    result.push('---');
    if (httpRegion.response.request) {
      result.push('### request');
      result.push('');
      const request = httpRegion.response.request;
      result.push(`${request.method} ${request.url}`);
      result.push('');
      result.push(`|  |  |`);
      result.push(`| --- | --- |`);
      result.push(...Object.entries(request.headers)
        .map(([key, value]) => `| ${key} | ${value} |`)
        .sort()
      );
      if (utils.isString(request.body)) {
        result.push('');
        result.push(request.body);
      }


      result.push('');
      result.push('---');
      result.push('');
      result.push('### timings');
      result.push('');
      result.push(`|  |  |`);
      result.push(`| --- | --- |`);
      result.push(...Object.entries(httpRegion.response.timings)
        .map(([key, value]) => `| ${key.toUpperCase()} | ${value}ms |`)
        .sort()
      );
    }

  }
  return result.join(EOL).split(EOL).join(`  ${EOL}`);
}