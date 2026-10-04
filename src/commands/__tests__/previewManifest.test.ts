import * as fs from 'fs';
import * as path from 'path';

describe('standalone Markdown and MDX preview manifest', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
  );

  it('does not require companion Marketplace extensions', () => {
    expect(packageJson.extensionPack).toBeUndefined();
    expect(packageJson.extensionDependencies).toBeUndefined();
  });

  it('registers MDX directly in Moondancer', () => {
    expect(packageJson.activationEvents).toContain('onLanguage:mdx');
    expect(packageJson.contributes.languages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mdx',
          extensions: ['.mdx'],
        }),
      ]),
    );
    expect(packageJson.contributes.grammars).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          language: 'mdx',
          scopeName: 'text.html.markdown.mdx',
        }),
      ]),
    );
  });

  it('uses Moondancer styling with the VS Code built-in renderer', () => {
    expect(packageJson.contributes['markdown.previewStyles']).toEqual([
      './media/moondancer-preview.css',
    ]);
    expect(packageJson.contributes.configurationDefaults).toMatchObject({
      'markdown.math.enabled': true,
      'markdown.preview.frontMatter': 'table',
    });
  });

  it('requires the VS Code release with built-in Mermaid preview support', () => {
    expect(packageJson.engines.vscode).toBe('^1.121.0');
  });
});
