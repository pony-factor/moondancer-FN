import * as vscode from 'vscode';
import insertFootnote from './commands/insertFootnote';
import gotoLineColumn from './commands/gotoLineColumn';
import FootnoteLinkProvider from './providers/FootnoteLinkProvider';
import FootnoteHoverProvider from './providers/FootnoteHoverProvider';
import FootnoteReferenceProvider from './providers/FootnoteReferenceProvider';
import FootnoteDefinitionProvider from './providers/FootnoteDefinitionProvider';
import FootnoteEditor from './FootnoteEditor';
import peek from './commands/peek';
import spellcheckSelection, { SPELLCHECK_SELECTION_COMMAND } from './commands/spellcheckSelection';
import SpellcheckCodeActionProvider from './providers/SpellcheckCodeActionProvider';
// import FootnoteDeclarationProvider from './providers/FootnoteDeclarationProvider';

const mdLangSelector = { language: 'markdown' };

export function activate(context: vscode.ExtensionContext) {
  const footnoteEditor = new FootnoteEditor();

  context.subscriptions.push(
    footnoteEditor,
    vscode.commands.registerCommand('_vscode-markdown-footnote.gotoLineColumn', gotoLineColumn),
    vscode.commands.registerCommand('_vscode-markdown-footnote.peek', peek),
    vscode.commands.registerCommand('vscode-markdown-footnote.insertFootnote', (args) =>
      insertFootnote(
        args,
        (document, footnoteName) => footnoteEditor.open(document, footnoteName),
        (sourceDocument, definitionDocument) =>
          footnoteEditor.getDefinitionInsertionPosition(sourceDocument, definitionDocument),
      ),
    ),
    vscode.commands.registerCommand(SPELLCHECK_SELECTION_COMMAND, spellcheckSelection),
    vscode.commands.registerCommand('vscode-markdown-footnote.openFootnoteEditor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        return;
      }
      await footnoteEditor.open(editor.document);
    }),
    vscode.languages.registerHoverProvider(mdLangSelector, new FootnoteHoverProvider()),
    vscode.languages.registerDocumentLinkProvider(mdLangSelector, new FootnoteLinkProvider()),
    vscode.languages.registerDefinitionProvider(mdLangSelector, new FootnoteDefinitionProvider()),
    vscode.languages.registerReferenceProvider(mdLangSelector, new FootnoteReferenceProvider()),
    vscode.languages.registerCodeActionsProvider(mdLangSelector, new SpellcheckCodeActionProvider(), {
      providedCodeActionKinds: SpellcheckCodeActionProvider.providedCodeActionKinds,
    }),

    // NOTE: Not sure what's the difference between declaration and definition.
    // vscode.languages.registerDeclarationProvider(mdLangSelector, new FootnoteDeclarationProvider()),
  );

  return {
    extendMarkdownIt(md: any) {
      return md.use(require('markdown-it-footnote'));
    },
  };
}

export function deactivate() {}
