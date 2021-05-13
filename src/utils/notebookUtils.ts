// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function isNotebook(document: any) : boolean {
  return document && !!document.notebook;
}
