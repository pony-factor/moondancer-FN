import * as vscode from 'vscode';
import enterOrExitPunctuation, { isClosingPunctuationAt } from '../enterOrExitPunctuation';

jest.mock(
  'vscode',
  () => ({
    window: { activeTextEditor: undefined },
    commands: { executeCommand: jest.fn() },
    Selection: jest.fn((anchor, active) => ({ anchor, active })),
  }),
  { virtual: true },
);

function position(character: number): any {
  return {
    line: 0,
    character,
    translate: (_lineDelta: number, characterDelta: number) => position(character + characterDelta),
  };
}

function selection(character: number, isEmpty = true): any {
  const active = position(character);
  return { active, anchor: active, isEmpty };
}

function mockEditor(text: string, cursors = [selection(0)]): any {
  const editor = {
    document: { languageId: 'markdown', lineAt: jest.fn(() => ({ text })) },
    selections: cursors,
  };
  (vscode.window as any).activeTextEditor = editor;
  return editor;
}

describe('Enter to exit closing punctuation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.window as any).activeTextEditor = undefined;
  });

  test('recognizes closing parentheses, brackets, and braces only at the caret', () => {
    for (const character of [')', ']', '}']) {
      expect(isClosingPunctuationAt(`a${character}`, 1)).toBe(true);
    }
    expect(isClosingPunctuationAt('abc', 1)).toBe(false);
    expect(isClosingPunctuationAt('abc', 3)).toBe(false);
    expect(isClosingPunctuationAt(']', -1)).toBe(false);
  });

  test('advances over the closing bracket without inserting a newline', async () => {
    const editor = mockEditor('[^1]', [selection(3)]);
    await enterOrExitPunctuation();

    expect(editor.selections[0].active.character).toBe(4);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  test('delegates a normal Enter when the next character is not a closer', async () => {
    const editor = mockEditor('Hello world', [selection(5)]);
    await enterOrExitPunctuation();

    expect(editor.selections[0].active.character).toBe(5);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('type', { text: '\n' });
  });

  test('delegates Enter with a selected range rather than discarding the selection', async () => {
    mockEditor('()', [selection(1, false)]);
    await enterOrExitPunctuation();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('type', { text: '\n' });
  });

  test('moves all cursors when every cursor precedes closing punctuation', async () => {
    const editor = mockEditor('())', [selection(1), selection(2)]);
    await enterOrExitPunctuation();

    expect(editor.selections.map((cursor: any) => cursor.active.character)).toEqual([2, 3]);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  test('delegates Enter for mixed multi-cursor positions', async () => {
    const editor = mockEditor('(x)', [selection(1), selection(2)]);
    await enterOrExitPunctuation();

    expect(editor.selections.map((cursor: any) => cursor.active.character)).toEqual([1, 2]);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('type', { text: '\n' });
  });

  test('delegates Enter outside Markdown', async () => {
    const editor = mockEditor('()', [selection(1)]);
    editor.document.languageId = 'typescript';
    await enterOrExitPunctuation();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('type', { text: '\n' });
  });
});
