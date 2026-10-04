import * as net from 'net';
import * as vscode from 'vscode';

const configSection = 'vscode-markdown-footnote';
const enhancedPreviewExtensionId = 'shd101wyy.markdown-preview-enhanced';
const modernMdxPreviewExtensionId = 'ggfincke.vsc-mdx-preview';
const legacyMdxPreviewExtensionId = 'xyc.vscode-mdx-preview';
const mdxPreviewCommand = 'mdx-preview.commands.openPreview';

async function activateExtension(extensionId: string): Promise<boolean> {
  const extension = vscode.extensions.getExtension(extensionId);
  if (!extension) {
    return false;
  }

  if (!extension.isActive) {
    await extension.activate();
  }
  return true;
}

async function activateFirstInstalledExtension(extensionIds: string[]): Promise<string | undefined> {
  for (const extensionId of extensionIds) {
    if (await activateExtension(extensionId)) {
      return extensionId;
    }
  }
  return undefined;
}

async function openEnhancedPreview(toSide: boolean): Promise<boolean> {
  if (!(await activateExtension(enhancedPreviewExtensionId))) {
    return false;
  }

  await vscode.commands.executeCommand(
    toSide
      ? 'markdown-preview-enhanced.openPreviewToTheSide'
      : 'markdown-preview-enhanced.openPreview',
  );
  return true;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function openMarkdownDocumentPreview(
  toSide: boolean,
  resource: vscode.Uri,
): Promise<void> {
  const preferEnhanced = vscode.workspace
    .getConfiguration(configSection, resource)
    .get<boolean>('preferEnhancedPreview', true);

  if (preferEnhanced) {
    try {
      if (await openEnhancedPreview(toSide)) {
        return;
      }
    } catch (error) {
      vscode.window.showWarningMessage(
        `Markdown Preview Enhanced could not open the preview (${errorMessage(
          error,
        )}); using VS Code's built-in preview instead.`,
      );
    }
  }

  await vscode.commands.executeCommand(toSide ? 'markdown.showPreviewToSide' : 'markdown.showPreview');
}

async function openMdxDocumentPreview(toSide: boolean, resource: vscode.Uri): Promise<void> {
  const configuration = vscode.workspace.getConfiguration(configSection, resource);
  const preferMdxPreview = configuration.get<boolean>('preferMdxPreview', true);

  if (preferMdxPreview) {
    try {
      const activated = await activateFirstInstalledExtension([
        modernMdxPreviewExtensionId,
        legacyMdxPreviewExtensionId,
      ]);
      if (activated) {
        await vscode.commands.executeCommand(mdxPreviewCommand);
        return;
      }
    } catch (error) {
      vscode.window.showWarningMessage(
        `MDX Preview could not open the preview (${errorMessage(
          error,
        )}); trying Markdown Preview Enhanced instead.`,
      );
    }
  }

  const preferEnhanced = configuration.get<boolean>('preferEnhancedPreview', true);
  if (preferEnhanced) {
    try {
      if (await openEnhancedPreview(toSide)) {
        return;
      }
    } catch (error) {
      vscode.window.showWarningMessage(
        `Markdown Preview Enhanced could not open the MDX fallback (${errorMessage(error)}).`,
      );
    }
  }

  vscode.window.showWarningMessage(
    'No MDX preview provider is available. Install Modern MDX Preview or enable Markdown Preview Enhanced as the fallback.',
  );
}

async function openPreview(toSide: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  if (editor.document.languageId === 'mdx') {
    await openMdxDocumentPreview(toSide, editor.document.uri);
    return;
  }

  if (editor.document.languageId !== 'markdown') {
    return;
  }

  await openMarkdownDocumentPreview(toSide, editor.document.uri);
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
  if (!(await activateExtension(enhancedPreviewExtensionId))) {
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
