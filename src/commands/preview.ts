import * as vscode from 'vscode';

async function openPreview(toSide: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    return;
  }

  await vscode.commands.executeCommand(toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview');
}

export async function openMarkdownPreview(): Promise<void> {
  await openPreview(false);
}

export async function openMarkdownPreviewToSide(): Promise<void> {
  await openPreview(true);
}

export async function openMoondancerSettings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:pony-factor.moondancer-fn');
}
