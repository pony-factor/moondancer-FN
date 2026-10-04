import vscode from 'vscode';
import { footnoteContentRegex, buildFootnoteRefRegex } from '../utils';
import createRangeFromFootnoteMatch from '../utils/createRangeFromFootnoteMatch';
import { findSourceDocumentsForFootnoteFile, isFootnoteFile } from '../utils/footnoteStorage';

export default class FootnoteReferenceProvider implements vscode.ReferenceProvider {
  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.Location[] | null> {
    const range = document.getWordRangeAtPosition(position, footnoteContentRegex);
    if (!range) {
      return null;
    }

    const footnoteContentHead = document.getText(range);
    const footnoteName = footnoteContentHead.slice(2, footnoteContentHead.length - 1);
    const keyRegex = buildFootnoteRefRegex(footnoteName);
    const sourceDocuments = isFootnoteFile(document)
      ? await findSourceDocumentsForFootnoteFile(document)
      : [document];

    const locations: vscode.Location[] = [];
    for (const sourceDocument of sourceDocuments) {
      const matches = sourceDocument.getText().matchAll(keyRegex);
      for (const match of matches) {
        locations.push(
          new vscode.Location(
            sourceDocument.uri,
            createRangeFromFootnoteMatch(sourceDocument, match),
          ),
        );
      }
    }
    return locations;
  }
}
