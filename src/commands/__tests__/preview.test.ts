import * as vscode from 'vscode';
import {
  openMarkdownPreview,
  openMarkdownPreviewToSide,
  openMoondancerSettings,
} from '../preview';

jest.mock('vscode');

const activeEditor = {
  document: {
    languageId: 'markdown',
    uri: { toString: () => 'file:///workspace/test.md' },
  },
};

describe('preview commands', () => {
  beforeEach(() => {
    (vscode.window as any).activeTextEditor = activeEditor;
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
  });

  it('opens the built-in Markdown preview', async () => {
    await openMarkdownPreview();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreview');
  });

  it('opens the built-in Markdown preview to the side', async () => {
    await openMarkdownPreviewToSide();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreviewToSide');
  });

  it('does nothing for a non-Markdown editor', async () => {
    (vscode.window as any).activeTextEditor = {
      document: { languageId: 'typescript', uri: activeEditor.document.uri },
    };

    await openMarkdownPreview();

    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('opens the Moondancer settings surface', async () => {
    await openMoondancerSettings();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.openSettings',
      '@ext:pony-factor.moondancer-fn',
    );
  });
});
