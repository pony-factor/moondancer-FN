import * as fs from 'fs';
import * as path from 'path';

describe('preview integration manifest', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
  );

  it('ships the enhanced preview and GitHub styling companions', () => {
    expect(packageJson.extensionPack).toEqual(
      expect.arrayContaining([
        'shd101wyy.markdown-preview-enhanced',
        'bierner.markdown-preview-github-styles',
      ]),
    );
  });

  it('defaults both preview paths to dark GitHub styling', () => {
    expect(packageJson.contributes.configurationDefaults).toMatchObject({
      'markdown-preview-enhanced.previewTheme': 'github-dark.css',
      'markdown-preview-enhanced.codeBlockTheme': 'github-dark.css',
      'markdown-preview-github-styles.colorTheme': 'dark',
      'markdown-preview-github-styles.darkTheme': 'dark',
    });
  });

  it('keeps enhanced preview and the integrated server browser enabled by default', () => {
    const properties = packageJson.contributes.configuration.properties;
    expect(properties['vscode-markdown-footnote.preferEnhancedPreview'].default).toBe(true);
    expect(properties['vscode-markdown-footnote.previewServerBrowser'].default).toBe(
      'integrated',
    );
  });
});
