import { preprocessMdx } from '../../mdx/preprocessMdx';

describe('preprocessMdx', () => {
  it('removes module syntax, resolves simple constants, and preserves component children safely', async () => {
    const source = [
      "import { Card } from './Card'",
      'export const answer = 42',
      '# Heading',
      '<Card value={answer}>',
      'Value: { answer }',
      '</Card>',
      '[Other](./other.md)',
    ].join('\n');

    const rendered = await preprocessMdx(source, '/workspace/page.mdx', async () => undefined);

    expect(rendered).not.toContain('import { Card }');
    expect(rendered).not.toContain('export const');
    expect(rendered).toContain('data-mdx-component="Card"');
    expect(rendered).toContain('Value: 42');
    expect(rendered).toContain('file:///workspace/other.md');
  });

  it('inlines relative MDX transclusions', async () => {
    const source = [
      "import Child from './Child.mdx'",
      '# Parent',
      '<Child />',
    ].join('\n');

    const rendered = await preprocessMdx(source, '/workspace/Parent.mdx', async (filePath) => {
      if (filePath === '/workspace/Child.mdx') {
        return '## Child\n\nTranscluded content.';
      }
      return undefined;
    });

    expect(rendered).toContain('## Child');
    expect(rendered).toContain('Transcluded content.');
    expect(rendered).not.toContain('<Child />');
  });

  it('shows unknown expressions without executing them', async () => {
    const rendered = await preprocessMdx(
      'Result: {dangerousCall()}',
      '/workspace/page.mdx',
      async () => undefined,
    );

    expect(rendered).toContain('class="mdx-expression"');
    expect(rendered).toContain('dangerousCall()');
  });

  it('does not rewrite fenced source examples', async () => {
    const source = [
      '```tsx',
      'export const answer = 42',
      '<Card value={answer} />',
      '```',
    ].join('\n');

    const rendered = await preprocessMdx(source, '/workspace/page.mdx', async () => undefined);

    expect(rendered).toContain('export const answer = 42');
    expect(rendered).toContain('<Card value={answer} />');
  });

  it('breaks recursive MDX transclusion cycles', async () => {
    const source = "import Self from './page.mdx'\n<Self />";

    const rendered = await preprocessMdx(source, '/workspace/page.mdx', async () => source);

    expect(rendered).toContain('MDX transclusion cycle skipped');
  });
});
