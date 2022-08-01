import * as vscode from 'vscode';
import { DocumentStore } from '../../documentStore';
import * as utils from '../../utils';
import { ResponseStore } from '../../responseStore';
import { TestRunner } from './testRunner';
import { TestItemResolver } from './testItemResolver';

export class TestController extends utils.DisposeProvider {
  private testController: vscode.TestController;
  private testItemResolver: TestItemResolver;

  constructor(private readonly documentStore: DocumentStore, private readonly responseStore: ResponseStore) {
    super();

    this.testController = vscode.tests.createTestController('httpYacTests', 'httpYac Tests');
    this.testItemResolver = new TestItemResolver(this.testController, this.documentStore);
    this.testController.resolveHandler = this.testItemResolver.resolveTestItems.bind(this.testItemResolver);

    const testRunner = new TestRunner(
      this.testController,
      this.testItemResolver,
      this.documentStore,
      this.responseStore
    );
    this.testController.createRunProfile(
      'Run',
      vscode.TestRunProfileKind.Run,
      async (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        const testItems: Array<vscode.TestItem> = await this.testItemResolver.resolveTestItemsForRequest(request);
        await testRunner.run(request, testItems, token);
      }
    );

    this.subscriptions = [this.testController, this.testItemResolver];
  }
}
