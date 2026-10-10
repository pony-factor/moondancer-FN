import * as vscode from 'vscode';

export const ENTER_OR_EXIT_PUNCTUATION_COMMAND = 'vscode-markdown-footnote.enterOrExitPunctuation';

const closingPunctuation = new Set([')', ']', '}']);

export function isClosingPunctuationAt(lineText: string, character: number): boolean {
  return character >= 0 && character < lineText.length && closingPunctuation.has(lineText[character]);
}

/**
 * Jump over an immediately following closing delimiter; otherwise let VS Code
 * handle Enter through its normal typing command (including indentation).
 */
export default async function enterOrExitPunctuation(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (
    !editor ||
    editor.document.languageId !== 'markdown' ||
    editor.selections.length === 0 ||
    editor.selections.some(
      (selection) =>
        !selection.isEmpty ||
        !isClosingPunctuationAt(
          editor.document.lineAt(selection.active.line).text,
          selection.active.character,
        ),
    )
  ) {
    await vscode.commands.executeCommand('type', { text: '\n' });
    return;
  }

  // Only skip if every cursor can advance, so multi-cursor edits stay consistent.
  editor.selections = editor.selections.map((selection) => {
    const nextPosition = selection.active.translate(0, 1);
    return new vscode.Selection(nextPosition, nextPosition);
  });
}
