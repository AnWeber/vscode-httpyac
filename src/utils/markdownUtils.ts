import { HttpRegion, utils } from 'httpyac';
import { EOL } from 'os';
import { getConfigSetting } from '../config';


export function toMarkdown(httpRegion: HttpRegion) {

  const result: Array<string> = [];
  if (httpRegion.response) {
    result.push(`HTTP${httpRegion.response.httpVersion || ''} **${httpRegion.response.statusCode}** - ${httpRegion.response.statusMessage}`);

    result.push('');
    result.push(`|  |  |`);
    result.push(`| --- | --- |`);

    const headers = getConfigSetting<Array<string>>('responseViewHeader') || [];
    result.push(...Object.entries(httpRegion.response.headers)
      .map(([key, value]) => `| ${headers.indexOf(key) >= 0 ? '**' : ''}${key}${headers.indexOf(key) >= 0 ? '**' : ''} | ${value} |`)
      .sort()
    );

    result.push('');
    result.push('---');
    if (httpRegion.response.request) {
      result.push('### Request');
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
        result.push('```');
        result.push(request.body);
        result.push('```');
      }


      result.push('');
      result.push('---');
      result.push('');
      result.push('# Timings');
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