import * as vscode from 'vscode';

export const BLOCKQUOTE_SELECTION_COMMAND = 'vscode-markdown-footnote.blockquoteSelection';

/**
 * Include every selected line once, but do not quote the unselected line after
 * a selection that ends at column zero. Descending order avoids offset shifts
 * when inserting blockquote markers for several selections.
 */
export function selectedLineNumbers(selections: readonly vscode.Selection[]): number[] {
  const lines = new Set<number>();
  for (const selection of selections) {
    if (selection.isEmpty) {
      continue;
    }
    const endLine =
      selection.end.line > selection.start.line && selection.end.character === 0
        ? selection.end.line - 1
        : selection.end.line;
    for (let line = selection.start.line; line <= endLine; line += 1) {
      lines.add(line);
    }
  }
  return [...lines].sort((a, b) => b - a);
}

export default async function blockquoteSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    return;
  }
  const lines = selectedLineNumbers(editor.selections);
  if (lines.length === 0) {
    return;
  }

  await editor.edit((builder) => {
    for (const line of lines) {
      // A bare > on blank lines avoids trailing spaces in the Markdown.
      const prefix = editor.document.lineAt(line).text.length === 0 ? '>' : '> ';
      builder.insert(new vscode.Position(line, 0), prefix);
    }
  });
}
