import * as vscode from 'vscode';
import { footnoteContentRegex, footnoteRefRegex, matchAll } from '../utils';
import { resolveFootnoteDocument } from '../utils/footnoteStorage';

export const QUICK_INSERT_FOOTNOTE_COMMAND = 'vscode-markdown-footnote.quickInsertFootnote';

export function nextFootnoteName(...texts: string[]): string {
  const used = new Set<number>();

  for (const text of texts) {
    for (const pattern of [footnoteRefRegex, footnoteContentRegex]) {
      for (const match of matchAll(pattern, text)) {
        const key = match.groups?.key;
        if (key && /^\d+$/.test(key)) {
          used.add(Number(key));
        }
      }
    }
  }

  let candidate = 1;
  while (used.has(candidate)) {
    candidate += 1;
  }
  return String(candidate);
}

export function buildDefinitionAppendText(
  existingText: string,
  footnoteName: string,
  eol: string,
): string {
  const spacing = existingText.length === 0 ? '' : existingText.endsWith('\n') ? eol : `${eol}${eol}`;
  return `${spacing}[^${footnoteName}]: `;
}

export default async function quickInsertFootnote() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    return;
  }

  const sourceDocument = editor.document;
  const insertionPosition = editor.selection.active;
  const definitionDocument = await resolveFootnoteDocument(sourceDocument, true);
  if (!definitionDocument) {
    return;
  }

  const definitionIsSource = definitionDocument.uri.toString() === sourceDocument.uri.toString();
  const footnoteName = nextFootnoteName(
    sourceDocument.getText(),
    definitionIsSource ? '' : definitionDocument.getText(),
  );
  const reference = `[^${footnoteName}]`;

  const insertedReference = await editor.edit(
    (edit) => edit.insert(insertionPosition, reference),
    { undoStopBefore: true, undoStopAfter: false },
  );
  if (!insertedReference) {
    return;
  }

  const existingDefinitionText = definitionDocument.getText();
  const eol = definitionDocument.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  const definitionPosition = definitionDocument.positionAt(existingDefinitionText.length);
  const definitionText = buildDefinitionAppendText(existingDefinitionText, footnoteName, eol);

  let insertedDefinition: boolean;
  if (definitionIsSource) {
    insertedDefinition = await editor.edit(
      (edit) => edit.insert(definitionPosition, definitionText),
      { undoStopBefore: false, undoStopAfter: true },
    );
  } else {
    const edit = new vscode.WorkspaceEdit();
    edit.insert(definitionDocument.uri, definitionPosition, definitionText);
    insertedDefinition = await vscode.workspace.applyEdit(edit);
  }

  if (!insertedDefinition) {
    return;
  }

  const definitionCursor = definitionDocument.positionAt(definitionDocument.getText().length);
  if (definitionIsSource) {
    editor.selection = new vscode.Selection(definitionCursor, definitionCursor);
    editor.revealRange(new vscode.Range(definitionCursor, definitionCursor));
    return;
  }

  const definitionEditor = await vscode.window.showTextDocument(definitionDocument, {
    preserveFocus: false,
    preview: false,
  });
  definitionEditor.selection = new vscode.Selection(definitionCursor, definitionCursor);
  definitionEditor.revealRange(new vscode.Range(definitionCursor, definitionCursor));
}
