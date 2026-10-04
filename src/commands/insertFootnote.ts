import * as vscode from 'vscode';
import { footnoteRefRegex, matchAll } from '../utils';

type InsertFootnoteArgs = { footnoteName?: string };
type OpenFootnoteEditor = (document: vscode.TextDocument, footnoteName: string) => Thenable<void>;
type GetDefinitionInsertionPosition = (document: vscode.TextDocument) => vscode.Position | undefined;

export default async function insertFootnote(
  { footnoteName }: InsertFootnoteArgs = {},
  openFootnoteEditor?: OpenFootnoteEditor,
  getDefinitionInsertionPosition?: GetDefinitionInsertionPosition,
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const insertionPosition = editor.selection.start;
  const shouldInsertFootnoteRef = !footnoteName;

  if (shouldInsertFootnoteRef) {
    const refMatches = matchAll(footnoteRefRegex, editor.document.getText());
    const input = await vscode.window.showInputBox({
      prompt: 'Footnote name (no space or tab)',
      placeHolder: 'Footnote name',
      value: '' + (refMatches.length + 1),
    });
    if (input === undefined) {
      return;
    }
    footnoteName = input;
  }

  footnoteName = (footnoteName || '').replace(/\s/g, '');
  if (!footnoteName) {
    return;
  }

  let referenceCursor = insertionPosition;
  if (shouldInsertFootnoteRef) {
    const reference = `[^${footnoteName}]`;
    const insertedReference = await editor.edit(
      (edit) => edit.insert(insertionPosition, reference),
      { undoStopBefore: true, undoStopAfter: false },
    );
    if (!insertedReference) {
      return;
    }
    referenceCursor = insertionPosition.translate(0, reference.length);
  }

  const text = editor.document.getText();
  const eol = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  const preferredPosition = getDefinitionInsertionPosition?.(editor.document);
  let definitionPosition = preferredPosition || editor.document.positionAt(text.length);
  let definitionText: string;

  if (preferredPosition) {
    const preferredOffset = editor.document.offsetAt(preferredPosition);
    if (preferredOffset === text.length) {
      const prefix = text.length === 0 || text.endsWith('\n') ? '' : eol;
      definitionText = `${prefix}[^${footnoteName}]: `;
    } else {
      definitionText = `[^${footnoteName}]: ${eol}`;
    }
  } else {
    const emptyLinesAbove = text.length === 0 ? '' : text.endsWith('\n') ? eol : `${eol}${eol}`;
    definitionText = `${emptyLinesAbove}[^${footnoteName}]: `;
  }

  const insertedDefinition = await editor.edit(
    (edit) => edit.insert(definitionPosition, definitionText),
    { undoStopBefore: false, undoStopAfter: true },
  );
  if (!insertedDefinition) {
    return;
  }

  if (shouldInsertFootnoteRef) {
    editor.selection = new vscode.Selection(referenceCursor, referenceCursor);
  }

  if (openFootnoteEditor) {
    await openFootnoteEditor(editor.document, footnoteName);
  }
}
