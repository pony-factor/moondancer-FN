import * as path from 'path';
import { pathToFileURL } from 'url';

export type MdxLoader = (filePath: string) => Promise<string | undefined>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function simpleExportValue(raw: string): string | undefined {
  const value = raw.trim().replace(/;$/, '').trim();
  const stringMatch = value.match(/^(['"])([\s\S]*)\1$/);
  if (stringMatch) {
    return stringMatch[2];
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value) || /^(?:true|false|null)$/.test(value)) {
    return value;
  }
  return undefined;
}

function rewriteRelativeLinks(line: string, filePath: string): string {
  const baseDirectory = path.dirname(filePath);
  return line.replace(
    /(\!?\[[^\]]*\]\()((?:\.\.?\/)[^)#\s]+)(#[^)\s]*)?(\))/g,
    (_match, prefix: string, target: string, fragment = '', suffix: string) => {
      const absolute = path.resolve(baseDirectory, target);
      return prefix + pathToFileURL(absolute).toString() + fragment + suffix;
    },
  );
}

function replaceKnownExpressions(line: string, constants: Map<string, string>): string {
  let output = line;
  for (const [name, value] of constants) {
    const regexName = name.split('$').join('\\$');
    output = output.replace(
      new RegExp('=\\{\\s*' + regexName + '\\s*\\}', 'g'),
      '="' + escapeHtml(value) + '"',
    );
    output = output.replace(
      new RegExp('\\{\\s*' + regexName + '\\s*\\}', 'g'),
      escapeHtml(value),
    );
  }
  return output;
}

function replaceUnknownExpressions(line: string): string {
  return line.replace(/\{([^{}\n]+)\}/g, (_match, expression: string) => {
    return '<code class="mdx-expression">&#123;' + escapeHtml(expression.trim()) + '&#125;</code>';
  });
}

export async function preprocessMdx(
  text: string,
  filePath: string,
  loadMdx: MdxLoader,
  visited: Set<string> = new Set(),
): Promise<string> {
  const normalizedFile = path.resolve(filePath);
  if (visited.has(normalizedFile)) {
    return '> MDX transclusion cycle skipped: ' + path.basename(filePath);
  }

  const nextVisited = new Set(visited);
  nextVisited.add(normalizedFile);

  const constants = new Map<string, string>();
  const mdxImports = new Map<string, string>();
  const body: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const defaultImport = line.match(
      /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/,
    );
    if (defaultImport) {
      if (defaultImport[2].endsWith('.mdx')) {
        mdxImports.set(defaultImport[1], defaultImport[2]);
      }
      continue;
    }

    if (/^\s*import\b/.test(line)) {
      continue;
    }

    const exportedConstant = line.match(
      /^\s*export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?)\s*$/,
    );
    if (exportedConstant) {
      const value = simpleExportValue(exportedConstant[2]);
      if (value !== undefined) {
        constants.set(exportedConstant[1], value);
      }
      continue;
    }

    if (/^\s*export\b/.test(line)) {
      continue;
    }

    body.push(line);
  }

  const rendered: string[] = [];
  let inFence = false;

  for (const originalLine of body) {
    const trimmed = originalLine.trim();
    if (/^\`\`\`/.test(trimmed)) {
      inFence = !inFence;
      rendered.push(originalLine);
      continue;
    }

    if (inFence) {
      rendered.push(originalLine);
      continue;
    }

    const selfClosing = trimmed.match(/^<([A-Z][\w.]*)\b[^>]*\/>$/);
    if (selfClosing) {
      const componentName = selfClosing[1];
      const importedPath = mdxImports.get(componentName);
      if (importedPath) {
        const targetPath = path.resolve(path.dirname(filePath), importedPath);
        const targetText = await loadMdx(targetPath);
        if (targetText !== undefined) {
          rendered.push(
            '<!-- Moondancer MDX transclusion: ' + escapeHtml(componentName) + ' -->',
            await preprocessMdx(targetText, targetPath, loadMdx, nextVisited),
          );
          continue;
        }
      }

      rendered.push(
        '<div class="mdx-component mdx-component-empty"><span class="mdx-component-label">&lt;' +
          escapeHtml(componentName) +
          ' /&gt;</span></div>',
      );
      continue;
    }

    let line = replaceKnownExpressions(originalLine, constants);
    line = line.replace(
      /<([A-Z][\w.]*)\b[^>]*>/g,
      (_match, componentName: string) =>
        '<div class="mdx-component mdx-component-open" data-mdx-component="' +
        escapeHtml(componentName) +
        '"><span class="mdx-component-label">&lt;' +
        escapeHtml(componentName) +
        '&gt;</span></div>',
    );
    line = line.replace(
      /<\/([A-Z][\w.]*)>/g,
      (_match, componentName: string) =>
        '<div class="mdx-component mdx-component-close"><span class="mdx-component-label">&lt;/' +
        escapeHtml(componentName) +
        '&gt;</span></div>',
    );
    line = replaceUnknownExpressions(line);
    line = rewriteRelativeLinks(line, filePath);
    rendered.push(line);
  }

  return rendered.join('\n');
}
