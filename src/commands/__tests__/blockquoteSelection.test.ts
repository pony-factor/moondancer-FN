import * as vscode from 'vscode';
import blockquoteSelection, { selectedLineNumbers } from '../blockquoteSelection';

jest.mock('vscode');

function selection(startLine: number, startCharacter: number, endLine: number, endCharacter: number): vscode.Selection {
  return {
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
    isEmpty: startLine === endLine && startCharacter === endCharacter,
  } as vscode.Selection;
}

describe('blockquoteSelection', () => {
  test('quotes the selected lines, not the line after a trailing newline', () => {
    expect(selectedLineNumbers([selection(0, 3, 2, 0)])).toEqual([1, 0]);
  });

  test('includes a partially selected last line', () => {
    expect(selectedLineNumbers([selection(0, 1, 2, 3)])).toEqual([2, 1, 0]);
  });

  test('deduplicates overlapping selections and ignores empty cursors', () => {
    expect(selectedLineNumbers([
      selection(1, 0, 3, 2),
      selection(2, 1, 4, 0),
      selection(5, 0, 5, 0),
    ])).toEqual([3, 2, 1]);
  });

  test('inserts blockquote markers in one edit, preserving blank lines', async () => {
    const inserts: Array<{ line: number; character: number; text: string }> = [];
    (vscode as any).Position = jest.fn((line, character) => ({ line, character }));
    const editor = {
      document: {
        languageId: 'markdown',
        lineAt: jest.fn((line: number) => ({ text: ['First', '', 'Last', 'Not selected'][line] })),
      },
      selections: [selection(0, 1, 3, 0)],
      edit: jest.fn(async (callback: (builder: any) => void) => {
        callback({
          insert: (position: { line: number; character: number }, text: string) =>
            inserts.push({ ...position, text }),
        });
        return true;
      }),
    };
    (vscode.window as any).activeTextEditor = editor;

    await blockquoteSelection();

    expect(editor.edit).toHaveBeenCalledTimes(1);
    expect(inserts).toEqual([
      { line: 2, character: 0, text: '> ' },
      { line: 1, character: 0, text: '>' },
      { line: 0, character: 0, text: '> ' },
    ]);
  });

  test('does not edit when there is no selection or the document is not Markdown', async () => {
    const editor = {
      document: { languageId: 'markdown' },
      selections: [selection(0, 0, 0, 0)],
      edit: jest.fn(),
    };
    (vscode.window as any).activeTextEditor = editor;
    await blockquoteSelection();

    editor.document.languageId = 'typescript';
    editor.selections = [selection(0, 0, 0, 2)];
    await blockquoteSelection();

    expect(editor.edit).not.toHaveBeenCalled();
  });
});
