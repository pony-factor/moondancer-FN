import * as vscode from 'vscode';
import createRangeFromFootnoteMatch from '../utils/createRangeFromFootnoteMatch';
import createUriForRange from '../utils/createUriForRange';
import {
  buildFootnoteRefRegex,
  footnoteContentRegex,
  footnoteRefRegex,
  matchAll,
} from '../utils';
import {
  findSourceDocumentsForFootnoteFile,
  isFootnoteFile,
  resolveFootnoteDocument,
} from '../utils/footnoteStorage';

const previewLength = 18;
function getRefPreviewText(document: vscode.TextDocument, refRange: vscode.Range) {
  const start = new vscode.Position(
    refRange.start.line,
    Math.max(0, refRange.start.character - previewLength),
  );
  const end = new vscode.Position(
    refRange.end.line,
    Math.max(0, refRange.end.character + previewLength),
  );
  const text = document.getText(new vscode.Range(start, end));
  return `...${text}...`;
}

export default class FootnoteLinkProvider implements vscode.DocumentLinkProvider {
  public async provideDocumentLinks(document: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
    if (isFootnoteFile(document)) {
      return this.provideDefinitionLinks(document);
    }

    const results: vscode.DocumentLink[] = [];
    const refMatches = matchAll(footnoteRefRegex, document.getText());
    const definitionDocument = await resolveFootnoteDocument(document);
    const contentMatches = definitionDocument
      ? matchAll(footnoteContentRegex, definitionDocument.getText())
      : [];
    const contentMatchesMap = new Map<string, RegExpMatchArray>();

    for (const contentMatch of contentMatches) {
      const key = contentMatch.groups!.key;
      if (!contentMatchesMap.has(key)) {
        contentMatchesMap.set(key, contentMatch);
      }
    }

    for (const refMatch of refMatches) {
      const refRange = createRangeFromFootnoteMatch(document, refMatch);
      const footnoteName = refMatch.groups!.key;
      const contentMatch = contentMatchesMap.get(footnoteName);

      if (contentMatch && definitionDocument) {
        const contentRange = createRangeFromFootnoteMatch(definitionDocument, contentMatch);
        const refLink = new vscode.DocumentLink(
          refRange,
          createUriForRange(definitionDocument, contentRange),
        );
        refLink.tooltip = 'Go to';
        results.push(refLink);
      } else {
        const refLink = new vscode.DocumentLink(
          refRange,
          vscode.Uri.parse(
            `command:vscode-markdown-footnote.insertFootnote?${encodeURIComponent(
              JSON.stringify({ footnoteName }),
            )}`,
          ),
        );
        refLink.tooltip = 'Create footnote';
        results.push(refLink);
      }
    }

    return results;
  }

  private async provideDefinitionLinks(
    document: vscode.TextDocument,
  ): Promise<vscode.DocumentLink[]> {
    const results: vscode.DocumentLink[] = [];
    const contentMatches = matchAll(footnoteContentRegex, document.getText());
    const sourceDocuments = await findSourceDocumentsForFootnoteFile(document);

    for (const contentMatch of contentMatches) {
      const contentRange = createRangeFromFootnoteMatch(document, contentMatch);
      const footnoteName = contentMatch.groups!.key;

      for (const sourceDocument of sourceDocuments) {
        const refMatches = matchAll(buildFootnoteRefRegex(footnoteName), sourceDocument.getText());
        for (const refMatch of refMatches) {
          const refRange = createRangeFromFootnoteMatch(sourceDocument, refMatch);
          const contentLink = new vscode.DocumentLink(
            contentRange,
            createUriForRange(sourceDocument, refRange),
          );
          contentLink.tooltip = getRefPreviewText(sourceDocument, refRange);
          results.push(contentLink);
        }
      }
    }

    return results;
  }
}
