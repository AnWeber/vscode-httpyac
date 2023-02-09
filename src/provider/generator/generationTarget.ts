import * as httpyac from 'httpyac';

export interface GenerationTarget {
  label: string;
  target: string;
  client: string;
  description: string;
  generate: (context: httpyac.HttpRegionSendContext, refName?: string) => Promise<string | undefined>;
}
