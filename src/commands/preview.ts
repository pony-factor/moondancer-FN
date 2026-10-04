import * as net from 'net';
import * as vscode from 'vscode';

const configSection = 'vscode-markdown-footnote';
const enhancedPreviewExtensionId = 'shd101wyy.markdown-preview-enhanced';

async function activateEnhancedPreview(): Promise<boolean> {
  const extension = vscode.extensions.getExtension(enhancedPreviewExtensionId);
  if (!extension) {
    return false;
  }

  if (!extension.isActive) {
    await extension.activate();
  }
  return true;
}

async function openPreview(toSide: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    return;
  }

  const preferEnhanced = vscode.workspace
    .getConfiguration(configSection, editor.document.uri)
    .get<boolean>('preferEnhancedPreview', true);

  if (preferEnhanced) {
    try {
      if (await activateEnhancedPreview()) {
        await vscode.commands.executeCommand(
          toSide
            ? 'markdown-preview-enhanced.openPreviewToTheSide'
            : 'markdown-preview-enhanced.openPreview',
        );
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showWarningMessage(
        `Markdown Preview Enhanced could not open the preview (${message}); using VS Code's built-in preview instead.`,
      );
    }
  }

  await vscode.commands.executeCommand(toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview');
}

export async function openMarkdownPreview(): Promise<void> {
  await openPreview(false);
}

export async function openMarkdownPreviewToSide(): Promise<void> {
  await openPreview(true);
}

export async function openMoondancerSettings(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:pony-factor.moondancer-fn');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let settled = false;
    const finish = (connected: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(250, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function waitForServer(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(port)) {
      return true;
    }
    await delay(200);
  }
  return false;
}

async function openServerUri(uri: vscode.Uri, browser: string): Promise<void> {
  const externalUri = await vscode.env.asExternalUri(uri);

  if (browser === 'external') {
    await vscode.env.openExternal(externalUri);
    return;
  }

  try {
    await vscode.commands.executeCommand('simpleBrowser.show', externalUri.toString());
  } catch {
    await vscode.env.openExternal(externalUri);
  }
}

export async function startPreviewServer(): Promise<void> {
  if (!(await activateEnhancedPreview())) {
    vscode.window.showWarningMessage(
      'Markdown Preview Enhanced is not installed. Install it to use the Crossnote preview server.',
    );
    return;
  }

  await vscode.commands.executeCommand('markdown-preview-enhanced.startCrossnoteServer');

  const browser = vscode.workspace
    .getConfiguration(configSection)
    .get<string>('previewServerBrowser', 'integrated');
  if (browser === 'none') {
    return;
  }

  const port = vscode.workspace
    .getConfiguration('markdown-preview-enhanced')
    .get<number>('crossnoteServePort', 3000);
  if (!port) {
    vscode.window.showWarningMessage(
      'Moondancer cannot auto-open a Crossnote server configured with port 0. Choose a fixed Markdown Preview Enhanced Crossnote port to open it automatically.',
    );
    return;
  }

  const ready = await waitForServer(port, 10000);
  if (!ready) {
    vscode.window.showWarningMessage(
      `The Crossnote server did not become reachable on localhost:${port}; it may still be starting.`,
    );
    return;
  }

  await openServerUri(vscode.Uri.parse(`http://localhost:${port}`), browser);
}
