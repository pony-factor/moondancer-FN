import * as vscode from 'vscode';
import { Position } from 'vscode';

export type GotoLineColumnArgs = { line: number; column: number; uri?: string };

export default async function gotoLineColumn(arg: GotoLineColumnArgs) {
  let editor = vscode.window.activeTextEditor;

  if (arg.uri && (!editor || editor.document.uri.toString() !== arg.uri)) {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(arg.uri));
    editor = await vscode.window.showTextDocument(document, {
      preview: false,
      preserveFocus: false,
    });
  }

  if (editor) {
    internalGotoLineColumn(editor, arg);
  }
}

export function internalGotoLineColumn(
  editor: vscode.TextEditor,
  { line, column }: GotoLineColumnArgs,
) {
  const position = new Position(line, column);
  const range = new vscode.Range(position, new Position(line, column + 1));
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range);
}
