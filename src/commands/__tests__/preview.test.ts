import * as vscode from 'vscode';
import {
  MdxPreviewOpener,
  openMarkdownPreview,
  openMarkdownPreviewToSide,
  openMoondancerSettings,
} from '../preview';

jest.mock('vscode');

const markdownEditor = {
  document: {
    languageId: 'markdown',
    uri: { toString: () => 'file:///workspace/test.md' },
  },
};

const mdxEditor = {
  document: {
    languageId: 'mdx',
    uri: { toString: () => 'file:///workspace/test.mdx' },
  },
};

function mdxPreview(): MdxPreviewOpener {
  return {
    open: jest.fn().mockResolvedValue(undefined),
  };
}

describe('preview commands', () => {
  beforeEach(() => {
    (vscode.window as any).activeTextEditor = markdownEditor;
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
  });

  it('opens Markdown through VS Code built-in preview', async () => {
    await openMarkdownPreview();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreview');
  });

  it('opens Markdown to the side through VS Code built-in preview', async () => {
    await openMarkdownPreviewToSide();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreviewToSide');
  });

  it('routes MDX to Moondancer internal preview', async () => {
    const preview = mdxPreview();
    (vscode.window as any).activeTextEditor = mdxEditor;

    await openMarkdownPreview(preview);

    expect(preview.open).toHaveBeenCalledWith(mdxEditor.document.uri, false);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('routes MDX side preview to Moondancer internal preview', async () => {
    const preview = mdxPreview();
    (vscode.window as any).activeTextEditor = mdxEditor;

    await openMarkdownPreviewToSide(preview);

    expect(preview.open).toHaveBeenCalledWith(mdxEditor.document.uri, true);
  });

  it('warns if MDX preview wiring is unavailable instead of probing other extensions', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;

    await openMarkdownPreview();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Moondancer MDX preview is not available.',
    );
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('does nothing for an unrelated editor language', async () => {
    (vscode.window as any).activeTextEditor = {
      document: { languageId: 'typescript', uri: markdownEditor.document.uri },
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
