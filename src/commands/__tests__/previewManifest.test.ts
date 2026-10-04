import * as fs from 'fs';
import * as path from 'path';

describe('preview integration manifest', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
  );

  it('ships the Markdown and MDX preview companions', () => {
    expect(packageJson.extensionPack).toEqual(
      expect.arrayContaining([
        'shd101wyy.markdown-preview-enhanced',
        'bierner.markdown-preview-github-styles',
        'unifiedjs.vscode-mdx',
        'ggfincke.vsc-mdx-preview',
      ]),
    );
  });

  it('activates when either Markdown or MDX becomes active', () => {
    expect(packageJson.activationEvents).toEqual(
      expect.arrayContaining(['onLanguage:markdown', 'onLanguage:mdx']),
    );
  });

  it('defaults both Markdown preview paths to dark GitHub styling', () => {
    expect(packageJson.contributes.configurationDefaults).toMatchObject({
      'markdown-preview-enhanced.previewTheme': 'github-dark.css',
      'markdown-preview-enhanced.codeBlockTheme': 'github-dark.css',
      'markdown-preview-github-styles.colorTheme': 'dark',
      'markdown-preview-github-styles.darkTheme': 'dark',
    });
  });

  it('defaults MDX to dark, safe, synchronized preview behavior', () => {
    expect(packageJson.contributes.configurationDefaults).toMatchObject({
      'mdx-preview.preview.previewTheme': 'github-dark',
      'mdx-preview.preview.codeBlockTheme': 'github-dark',
      'mdx-preview.preview.autoTheme': false,
      'mdx-preview.preview.security': 'strict',
      'mdx-preview.preview.enableScripts': false,
      'mdx-preview.preview.useWhiteBackground': false,
      'mdx-preview.preview.openMdxLinksInPreview': true,
      'mdx-preview.preview.scrollSync': 'bidirectional',
      'mdx-preview.tailwind.enabled': 'auto',
      'mdx-preview.framework': 'auto',
    });
  });

  it('prefers dedicated MDX preview and keeps the integrated server browser enabled', () => {
    const properties = packageJson.contributes.configuration.properties;
    expect(properties['vscode-markdown-footnote.preferEnhancedPreview'].default).toBe(true);
    expect(properties['vscode-markdown-footnote.preferMdxPreview'].default).toBe(true);
    expect(properties['vscode-markdown-footnote.previewServerBrowser'].default).toBe('integrated');
  });
});
