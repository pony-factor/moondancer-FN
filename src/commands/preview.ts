import * as vscode from 'vscode';

export interface MdxPreviewOpener {
  open(sourceUri: vscode.Uri, toSide: boolean): Promise<void>;
}

async function openPreview(toSide: boolean, mdxPreview?: MdxPreviewOpener): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  if (editor.document.languageId === 'mdx') {
    if (!mdxPreview) {
      vscode.window.showWarningMessage('Moondancer MDX preview is not available.');
      return;
    }
    await mdxPreview.open(editor.document.uri, toSide);
    return;
  }

  if (editor.document.languageId !== 'markdown') {
    return;
  }

  await vscode.commands.executeCommand(toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview');
}

export async function openMarkdownPreview(mdxPreview?: MdxPreviewOpener): Promise<void> {
  await openPreview(false, mdxPreview);
}

export async function openMarkdownPreviewToSide(mdxPreview?: MdxPreviewOpener): Promise<void> {
  await openPreview(true, mdxPreview);
}

export async function openMoondancerSettings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:pony-factor.moondancer-fn');
}
