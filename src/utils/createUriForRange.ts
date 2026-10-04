import * as vscode from 'vscode';
import { GotoLineColumnArgs } from '../commands/gotoLineColumn';

export default function createUriForRange(
  document: vscode.TextDocument,
  range: vscode.Range,
): vscode.Uri {
  return vscode.Uri.parse('command:_vscode-markdown-footnote.gotoLineColumn').with({
    query: JSON.stringify({
      line: range.start.line,
      column: range.start.character,
      uri: document.uri.toString(),
    } as GotoLineColumnArgs),
  });
}
