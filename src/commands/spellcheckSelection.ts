import * as vscode from 'vscode';
import { buildSpellcheckUrl, DEFAULT_SPELLCHECK_PLUGIN } from '../utils/spellcheck';

export const SPELLCHECK_SELECTION_COMMAND = 'vscode-markdown-footnote.spellcheckSelection';

export default async function spellcheckSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown' || editor.selection.isEmpty) {
    vscode.window.showInformationMessage('Select Markdown text to spellcheck.');
    return;
  }

  const selectedText = editor.document.getText(editor.selection);
  const pluginName = vscode.workspace
    .getConfiguration('vscode-markdown-footnote')
    .get<string>('spellcheckPluginName', DEFAULT_SPELLCHECK_PLUGIN);

  const opened = await vscode.env.openExternal(vscode.Uri.parse(buildSpellcheckUrl(selectedText, pluginName)));
  if (!opened) {
    vscode.window.showErrorMessage('Could not open ChatGPT for the selected text.');
  }
}
