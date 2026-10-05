import * as vscode from 'vscode';
import { preprocessMdx } from './preprocessMdx';

export const MDX_PREVIEW_SCHEME = 'moondancer-mdx-preview';

export default class MdxPreviewProvider
  implements vscode.TextDocumentContentProvider, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.changeEmitter.event;

  private readonly previewsBySource = new Map<string, vscode.Uri>();
  private readonly sourceChangeSubscription: vscode.Disposable;

  constructor() {
    this.sourceChangeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId !== 'mdx') {
        return;
      }

      const previewUri = this.previewsBySource.get(event.document.uri.toString());
      if (previewUri) {
        this.changeEmitter.fire(previewUri);
      }
    });
  }

  async open(sourceUri: vscode.Uri, toSide: boolean): Promise<void> {
    const previewUri = this.previewUriFor(sourceUri);
    this.previewsBySource.set(sourceUri.toString(), previewUri);

    await vscode.workspace.openTextDocument(previewUri);
    await vscode.commands.executeCommand(
      toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview',
      previewUri,
    );
  }

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const sourceValue = decodeURIComponent(uri.query.replace(/^source=/, ''));
    const sourceUri = vscode.Uri.parse(sourceValue);
    const sourceDocument = await vscode.workspace.openTextDocument(sourceUri);

    return preprocessMdx(sourceDocument.getText(), sourceUri.fsPath, async (filePath) => {
      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        return document.getText();
      } catch {
        return undefined;
      }
    });
  }

  dispose(): void {
    this.sourceChangeSubscription.dispose();
    this.changeEmitter.dispose();
  }

  private previewUriFor(sourceUri: vscode.Uri): vscode.Uri {
    return vscode.Uri.parse(
      MDX_PREVIEW_SCHEME +
        ':' +
        sourceUri.path +
        '?source=' +
        encodeURIComponent(sourceUri.toString()),
    );
  }
}
