import * as fs from 'fs';
import * as path from 'path';

describe('MDX preview kitchen sink fixture', () => {
  const fixture = fs.readFileSync(
    path.resolve(__dirname, '../../../test/workspace/preview-kitchen-sink.mdx'),
    'utf8',
  );

  it.each([
    ['frontmatter', /^---[\s\S]*?title:/],
    ['local TSX imports', /import \{ DemoCard \} from '\.\/MdxCard'/],
    ['MDX transclusion', /import Transcluded from '\.\/Transcluded\.mdx'/],
    ['ESM exports', /export const answer = 42/],
    ['JSX components', /<DemoCard title="Imported component">/],
    ['JavaScript expressions', /\{answer\}/],
    ['Tailwind classes', /className="grid gap-4 rounded-lg border p-4"/],
    ['inline math', /\$a\^2 \+ b\^2 = c\^2\$/],
    ['block math', /\$\$[\s\S]*?\\sum_/],
    ['task lists', /- \[x\] checked task/],
    ['tables', /\| Feature \| Status \|/],
    ['relative MDX links', /\.\/Transcluded\.mdx/],
    ['fragment links', /\(#jsx-and-html\)/],
    ['fenced TSX', /```tsx/],
    ['Mermaid diagrams', /```mermaid/],
    ['details and summary JSX', /<details>[\s\S]*?<summary>/],
    ['HTML-style links in JSX', /<a href="https:\/\/example\.com\/html-link">/],
  ])('covers %s', (_name, pattern) => {
    expect(fixture).toMatch(pattern as RegExp);
  });
});
