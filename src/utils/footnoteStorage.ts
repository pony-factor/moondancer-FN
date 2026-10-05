import * as path from 'path';
import * as vscode from 'vscode';

const configurationSection = 'vscode-markdown-footnote';
const defaultFootnoteFileName = 'footnotes.md';

export function usesSeparateFootnoteFile(): boolean {
  return vscode.workspace
    .getConfiguration(configurationSection)
    .get<boolean>('separateFootnoteFile', false);
}

export function getFootnoteFileName(): string {
  const configured = vscode.workspace
    .getConfiguration(configurationSection)
    .get<string>('footnoteFileName', defaultFootnoteFileName)
    .trim();
  return configured || defaultFootnoteFileName;
}

export function isFootnoteFile(document: vscode.TextDocument): boolean {
  if (!usesSeparateFootnoteFile() || document.uri.scheme !== 'file') {
    return false;
  }
  return path.basename(document.uri.fsPath) === getFootnoteFileName();
}

export function getFootnoteDocumentUri(sourceDocument: vscode.TextDocument): vscode.Uri {
  if (
    !usesSeparateFootnoteFile() ||
    sourceDocument.uri.scheme !== 'file' ||
    isFootnoteFile(sourceDocument)
  ) {
    return sourceDocument.uri;
  }

  return vscode.Uri.file(
    path.join(path.dirname(sourceDocument.uri.fsPath), getFootnoteFileName()),
  );
}

export async function resolveFootnoteDocument(
  sourceDocument: vscode.TextDocument,
  createIfMissing = false,
): Promise<vscode.TextDocument | undefined> {
  const uri = getFootnoteDocumentUri(sourceDocument);
  if (uri.toString() === sourceDocument.uri.toString()) {
    return sourceDocument;
  }

  try {
    return await vscode.workspace.openTextDocument(uri);
  } catch (error) {
    if (!createIfMissing) {
      return undefined;
    }
  }

  await vscode.workspace.fs.writeFile(uri, new Uint8Array());
  return vscode.workspace.openTextDocument(uri);
}

export async function findSourceDocumentsForFootnoteFile(
  footnoteDocument: vscode.TextDocument,
): Promise<vscode.TextDocument[]> {
  if (!isFootnoteFile(footnoteDocument) || footnoteDocument.uri.scheme !== 'file') {
    return [footnoteDocument];
  }

  const directory = path.dirname(footnoteDocument.uri.fsPath);
  const footnoteFileName = path.basename(footnoteDocument.uri.fsPath);
  const uris = await vscode.workspace.findFiles(new vscode.RelativePattern(directory, '*.md'));
  const documents: vscode.TextDocument[] = [];

  for (const uri of uris) {
    if (path.basename(uri.fsPath) === footnoteFileName) {
      continue;
    }
    documents.push(await vscode.workspace.openTextDocument(uri));
  }

  return documents;
}
