import * as fs from 'fs';
import * as path from 'path';

describe('Markdown preview kitchen sink fixture', () => {
  const fixture = fs.readFileSync(
    path.resolve(__dirname, '../../../test/workspace/preview-kitchen-sink.md'),
    'utf8',
  );

  it.each([
    ['frontmatter', /^---[\s\S]*?title:/],
    ['headings and fragment links', /\[Jump to raw HTML\]\(#raw-html\)/],
    ['inline math', /\$E = mc\^2\$/],
    ['block math', /\$\$[\s\S]*?\\int_0\^1/],
    ['GitHub text styling', /\*\*bold\*\*[\s\S]*?~~strikethrough~~/],
    ['task lists', /- \[x\] checked item/],
    ['tables', /\| Feature \| Example \|/],
    ['fenced code', /```typescript/],
    ['Mermaid diagrams', /```mermaid/],
    ['external links', /https:\/\/example\.com/],
    ['relative links', /\.\/test\.md/],
    ['images', /!\[Preview image\]/],
    ['raw HTML sections', /<section id="raw-html">/],
    ['details and summary', /<details>[\s\S]*?<summary>/],
    ['inline HTML styling', /<span style="text-decoration: underline;">/],
    ['footnotes', /\[\^kitchen-sink\]:/],
  ])('covers %s', (_name, pattern) => {
    expect(fixture).toMatch(pattern as RegExp);
  });
});
