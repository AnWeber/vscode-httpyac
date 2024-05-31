import { TestTag } from 'vscode';

export class TestTagResolver {
  private testTags: Array<TestTag> = [];

  public getOrCreateTestTag(id: string) {
    const testTag = this.testTags.find(t => t.id === id);
    if (testTag) {
      return testTag;
    }
    const newTestTag = new TestTag(id);
    this.testTags.push(newTestTag);
    return newTestTag;
  }
}
