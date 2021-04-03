import { HttpRegion, utils } from 'httpyac';
import { EOL } from 'os';


export function toMarkdown(httpRegion: HttpRegion) {

  const result: Array<string> = [];
  if (httpRegion.response) {
    result.push(`## HTTP${httpRegion.response.httpVersion || ''} **${httpRegion.response.statusCode}** - ${httpRegion.response.statusMessage}`);

    result.push('');
    result.push(...Object.entries(httpRegion.response.headers)
      .map(([key, value]) => `**${key}**: ${value}`)
      .sort()
    );

    if (httpRegion.response.request) {
      result.push('');
      result.push('');
      result.push('## Request');
      result.push('');
      const request = httpRegion.response.request;
      result.push(`${request.method} ${request.url}`);
      if (request.headers) {
        result.push(...Object.entries(request.headers)
          .map(([key, value]) => `**${key}**: ${value}`)
          .sort()
        );
      }
      if (utils.isString(request.body)) {
        result.push('');
        result.push('');
        result.push('```json');
        result.push(request.body);
        result.push('```');
      }


      result.push('');
      result.push('');
      result.push('## Timings');
      result.push('');
      result.push(`|  |  |`);
      result.push(`| --- | --- |`);
      result.push(...Object.entries(httpRegion.response.timings)
        .map(([key, value]) => `| ${key.toUpperCase()} | ${value}ms |`)
        .sort()
      );

      if (!!httpRegion.response.meta) {
        result.push('');
        result.push('');
        result.push('## Data');
        result.push('');
        result.push(`|  |  |`);
        result.push(`| --- | --- |`);
        for (const [key, value] of Object.entries(httpRegion.response.meta)) {

          if (Array.isArray(value)) {
            if (value.length > 0) {
              result.push(`| ${key} | ${value.join(',')} |`);
            }
          } else {
            result.push(`| ${key} | ${value} |`);
          }
        }
      }
    }

  }
  return result.join(`  ${EOL}`);
}
