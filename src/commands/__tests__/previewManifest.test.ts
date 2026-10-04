import * as fs from 'fs';
import * as path from 'path';

describe('standalone preview integration manifest', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
  );

  it('does not require companion Marketplace extensions', () => {
    expect(packageJson.extensionPack).toBeUndefined();
    expect(packageJson.extensionDependencies).toBeUndefined();
  });

  it('styles VS Code built-in Markdown preview from Moondancer itself', () => {
    expect(packageJson.contributes['markdown.previewStyles']).toEqual([
      './media/moondancer-preview.css',
    ]);
  });

  it('requires the VS Code release that includes built-in Mermaid preview support', () => {
    expect(packageJson.engines.vscode).toBe('^1.121.0');
  });

  it('keeps built-in math enabled', () => {
    expect(packageJson.contributes.configurationDefaults).toMatchObject({
      'markdown.math.enabled': true,
      'markdown.preview.frontMatter': 'table',
    });
  });

  it('has no Crossnote or external-preview commands or settings', () => {
    const commandIds = packageJson.contributes.commands.map(
      (command: { command: string }) => command.command,
    );
    const properties = packageJson.contributes.configuration.properties;

    expect(commandIds).not.toContain('vscode-markdown-footnote.startPreviewServer');
    expect(properties['vscode-markdown-footnote.preferEnhancedPreview']).toBeUndefined();
    expect(properties['vscode-markdown-footnote.previewServerBrowser']).toBeUndefined();
  });
});
