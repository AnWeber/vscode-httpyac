import * as vscode from 'vscode';
import { DocumentStore } from '../../documentStore';
import * as utils from '../../utils';
import { watchConfigSettings } from '../../config';
import { ResponseStore } from '../../responseStore';
import { TestRunner } from './testRunner';
import { TestItemResolver } from './testItemResolver';

export class TestController extends utils.DisposeProvider {
  private testController: vscode.TestController | undefined;
  private testItemResolver: TestItemResolver | undefined;

  constructor(private readonly documentStore: DocumentStore, private readonly responseStore: ResponseStore) {
    super();

    this.subscriptions.push(
      watchConfigSettings(config => {
        if (config.testControllerEnabled) {
          this.initTestControllerSupport();
        } else {
          this.disposeTestControllerSupport();
        }
      })
    );
  }

  private initTestControllerSupport() {
    if (this.testController || this.testItemResolver) {
      this.disposeTestControllerSupport();
    }
    this.testController = vscode.tests.createTestController('httpYacTests', 'httpYac Tests');
    this.testItemResolver = new TestItemResolver(this.testController, this.documentStore);
    this.testController.resolveHandler = this.testItemResolver.resolveTestItems.bind(this.testItemResolver);
    this.testController.refreshHandler = this.testItemResolver.refreshTestItems.bind(this.testItemResolver);

    this.testController.createRunProfile(
      'Run',
      vscode.TestRunProfileKind.Run,
      async (request: vscode.TestRunRequest, token: vscode.CancellationToken) => {
        if (this.testItemResolver && this.testController) {
          const testRunner = new TestRunner(
            this.testController,
            this.testItemResolver,
            this.documentStore,
            this.responseStore
          );
          const testItems: Array<vscode.TestItem> = await this.testItemResolver.resolveTestItemsForRequest(request);
          await testRunner.run(request, testItems, token);
        }
      }
    );
    this.subscriptions.push(...[this.testController, this.testItemResolver]);
  }

  private disposeTestControllerSupport() {
    if (this.testItemResolver) {
      const index = this.subscriptions.indexOf(this.testItemResolver);
      if (index >= 0) {
        this.subscriptions.splice(index, 1);
      }
      this.testItemResolver.dispose();
      delete this.testItemResolver;
    }
    if (this.testController) {
      const index = this.subscriptions.indexOf(this.testController);
      if (index >= 0) {
        this.subscriptions.splice(index, 1);
      }
      this.testController.dispose();
      delete this.testController;
    }
  }
}
