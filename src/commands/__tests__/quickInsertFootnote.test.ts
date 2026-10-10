import { buildDefinitionAppendText, nextFootnoteName } from '../quickInsertFootnote';

jest.mock('vscode');

describe('quickInsertFootnote helpers', () => {
  test('uses the first unused positive numeric footnote name', () => {
    expect(nextFootnoteName('Alpha[^1] beta[^3].', '[^4]: Four')).toBe('2');
  });

  test('ignores non-numeric footnote names when choosing a number', () => {
    expect(nextFootnoteName('Alpha[^note].', '[^note]: Named footnote')).toBe('1');
  });

  test('builds an empty-document definition scaffold without leading whitespace', () => {
    expect(buildDefinitionAppendText('', '1', '\n')).toBe('[^1]: ');
  });

  test('separates an appended definition from existing text with a blank line', () => {
    expect(buildDefinitionAppendText('Body text', '2', '\n')).toBe('\n\n[^2]: ');
  });
});
