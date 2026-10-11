import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function viewerCheckout(): string | undefined {
  const configured = vscode.workspace.getConfiguration('moondancer').get<string>('pdfViewerCheckout', '').trim();
  const folders = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath) || [];
  const candidates = configured ? [configured] : [
    ...folders.flatMap(folder => [
      path.join(folder, 'viewer'),
      path.join(folder, 'PDF-magic', 'viewer'),
      path.join(path.dirname(folder), 'viewer'),
    ]),
    path.join(os.homedir(), 'PDF-magic', 'viewer'),
    path.join(os.homedir(), 'Developer', 'PDF-magic', 'viewer'),
  ];
  return candidates.map(candidate => path.resolve(candidate.replace(/^~(?=\\/|$)/, os.homedir())))
    .find(candidate => fs.existsSync(path.join(candidate, 'dist', 'viewer.html'))
      && fs.existsSync(path.join(candidate, 'dist', 'pdf.worker.min.mjs')));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] || character));
}

async function readRemotePdf(uri: vscode.Uri): Promise<Uint8Array> {
  if (uri.scheme !== 'http' && uri.scheme !== 'https') {
    return vscode.workspace.fs.readFile(uri);
  }
  // Web PDFs are requested by the extension host, avoiding webview CORS limitations.
  // Do not silently forward browser cookies or VS Code authentication tokens.
  const https = require(uri.scheme) as typeof import('https');
  return new Promise((resolve, reject) => {
    const request = https.get(uri.toString(true), response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error('PDF server returned HTTP ' + response.statusCode));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 150 * 1024 * 1024) {
          request.destroy(new Error('PDF exceeds the 150 MiB webview transfer limit.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(30000, () => request.destroy(new Error('PDF server timed out.')));
  });
}

function makeHtml(webview: vscode.Webview, dist: vscode.Uri, originalUrl: string): string {
  const raw = fs.readFileSync(vscode.Uri.joinPath(dist, 'viewer.html').fsPath, 'utf8');
  const rootUri = webview.asWebviewUri(dist).toString().replace(/\\/$/, '') + '/';
  const localResource = (item: string) => {
    if (/^(?:https?:|data:|#|mailto:)/i.test(item)) return item;
    if (item.startsWith('/') || item.includes('..')) return '#';
    return webview.asWebviewUri(vscode.Uri.joinPath(dist, item)).toString();
  };
  const rewritten = raw.replace(/(\\b(?:src|href)=")([^"]+)(")/g, (_match, prefix, item, suffix) =>
    prefix + escapeHtml(localResource(item)) + suffix);
  const bootstrap = `<script>
    (() => {
      const assetRoot = ${JSON.stringify(rootUri)};
      const originalUrl = ${JSON.stringify(originalUrl)};
      const vscode = acquireVsCodeApi();
      let resolveStream;
      const documentStream = new Promise(resolve => { resolveStream = resolve; });
      window.addEventListener('message', event => {
        if (event.data?.type === 'moondancer-pdf-bytes') {
          const data = Uint8Array.from(atob(event.data.base64), ch => ch.charCodeAt(0));
          resolveStream(URL.createObjectURL(new Blob([data], { type: 'application/pdf' })));
        }
        if (event.data?.type === 'moondancer-pdf-error') {
          document.getElementById('status').textContent = event.data.message;
        }
      });
      window.chrome = {
        runtime: {
          id: 'moondancer-pdf-viewer',
          getURL: item => assetRoot + String(item).replace(/^\\//, ''),
          connectNative: () => { throw new Error('PDF Enhancer native messaging is unavailable in VS Code.'); },
        },
        mimeHandler: {
          getStreamInfo: async () => ({ originalUrl, streamUrl: await documentStream }),
        },
        storage: { local: {
          get: async () => ({}),
          set: async () => {},
        }},
        tabs: { getCurrent: async () => null },
      };
      window.addEventListener('DOMContentLoaded', () => {
        document.getElementById('enhance-nav')?.setAttribute('hidden', '');
        document.getElementById('open-enhancer-setup')?.setAttribute('hidden', '');
        vscode.postMessage({ type: 'ready' });
      });
    })();
  </script>`;
  return rewritten.replace('</head>', bootstrap + '</head>');
}

export function registerPdfViewer(context: vscode.ExtensionContext): void {
  const provider: vscode.CustomReadonlyEditorProvider = {
    async openCustomDocument(uri): Promise<vscode.CustomDocument> {
      return { uri, dispose() {} };
    },
    async resolveCustomEditor(document, panel): Promise<void> {
      const checkout = viewerCheckout();
      if (!checkout) {
        panel.webview.html = '<p>Build your local PDF-magic/viewer checkout with <code>npm install && npm run build</code>, '
          + 'then set <code>moondancer.pdfViewerCheckout</code> to its folder.</p>';
        return;
      }
      const dist = vscode.Uri.file(path.join(checkout, 'dist'));
      panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [dist],
      };
      panel.webview.html = makeHtml(panel.webview, dist, document.uri.toString(true));
      let disposed = false;
      panel.onDidDispose(() => { disposed = true; });
      let started = false;
      panel.webview.onDidReceiveMessage(async event => {
        if (event?.type !== 'ready' || started) return;
        started = true;
        try {
          const data = await readRemotePdf(document.uri);
          if (!disposed) {
            await panel.webview.postMessage({
              type: 'moondancer-pdf-bytes',
              base64: Buffer.from(data).toString('base64'),
            });
          }
        } catch (error) {
          if (!disposed) await panel.webview.postMessage({
            type: 'moondancer-pdf-error',
            message: 'Could not load PDF: ' + String(error),
          });
        }
      });
    },
  };
  context.subscriptions.push(vscode.window.registerCustomEditorProvider('moondancer.pdfViewer', provider, {
    webviewOptions: { retainContextWhenHidden: true },
    supportsMultipleEditorsPerDocument: true,
  }));
  context.subscriptions.push(vscode.commands.registerCommand('moondancer.openWebPdf', async () => {
    const url = await vscode.window.showInputBox({
      title: 'Open PDF-magic viewer',
      prompt: 'HTTPS URL of a PDF document',
      validateInput: value => /^https?:\\/\\//i.test(value) ? undefined : 'Enter an HTTP or HTTPS URL',
    });
    if (!url) return;
    const uri = vscode.Uri.parse(url);
    // Use a unique untitled editor tab for remote PDFs, preserving a distinct source URI.
    await vscode.commands.executeCommand('vscode.openWith', uri, 'moondancer.pdfViewer');
  }));
}
