import vscode from 'vscode';

import { footnoteRefRegex, buildFootnoteContentRegex } from '../utils';
import createRangeFromFootnoteMatch from '../utils/createRangeFromFootnoteMatch';
import { resolveFootnoteDocument } from '../utils/footnoteStorage';

export default class FootnoteDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Definition | vscode.LocationLink[] | null> {
    const range = document.getWordRangeAtPosition(position, footnoteRefRegex);
    if (!range) {
      return null;
    }

    const footnoteRefText = document.getText(range);
    const footnoteName = footnoteRefText.slice(2, footnoteRefText.length - 1);
    const definitionDocument = await resolveFootnoteDocument(document);
    if (!definitionDocument) {
      return null;
    }

    const contentRegex = buildFootnoteContentRegex(footnoteName);
    const match = definitionDocument.getText().match(contentRegex);
    if (!match) {
      return null;
    }

    return new vscode.Location(
      definitionDocument.uri,
      createRangeFromFootnoteMatch(definitionDocument, match),
    );
  }
}
