declare module 'httpsnippet' {
  export default class HttpSnippet {
    constructor(obj: unknown);
    convert(target: string, client: string): string;
  }
  export function availableTargets(): Array<{
    title: string;
    key: string;
    extname: string;
    clients: Array<{
      title: string;
      key: string;
      link?: string;
      description: string;
    }>;
  }>;
}
