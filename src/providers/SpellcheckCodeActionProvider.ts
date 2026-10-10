import * as vscode from 'vscode';
import { SPELLCHECK_SELECTION_COMMAND } from '../commands/spellcheckSelection';

export default class SpellcheckCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(document: vscode.TextDocument): vscode.CodeAction[] {
    const editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      editor.document.uri.toString() !== document.uri.toString() ||
      editor.selection.isEmpty
    ) {
      return [];
    }

    const action = new vscode.CodeAction(
      'Spellcheck selection with Spellcheck Only',
      vscode.CodeActionKind.QuickFix,
    );
    action.command = {
      command: SPELLCHECK_SELECTION_COMMAND,
      title: action.title,
    };
    action.isPreferred = true;
    return [action];
  }
}
