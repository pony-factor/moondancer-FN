import * as net from 'net';
import * as vscode from 'vscode';
import {
  openMarkdownPreview,
  openMarkdownPreviewToSide,
  openMoondancerSettings,
  startPreviewServer,
} from '../preview';

jest.mock('vscode');
jest.mock('net');

type ConfigValues = Record<string, Record<string, unknown>>;
type ExtensionMap = Record<string, { isActive: boolean; activate: jest.Mock } | undefined>;

const enhancedId = 'shd101wyy.markdown-preview-enhanced';
const modernMdxId = 'ggfincke.vsc-mdx-preview';
const legacyMdxId = 'xyc.vscode-mdx-preview';

const markdownEditor = {
  document: {
    languageId: 'markdown',
    uri: { toString: () => 'file:///workspace/test.md' },
  },
};

const mdxEditor = {
  document: {
    languageId: 'mdx',
    uri: { toString: () => 'file:///workspace/test.mdx' },
  },
};

let extensions: ExtensionMap;

function extension(isActive = true) {
  return {
    isActive,
    activate: jest.fn().mockResolvedValue(undefined),
  };
}

function configure(values: ConfigValues = {}) {
  (vscode.workspace.getConfiguration as jest.Mock).mockImplementation((section: string) => ({
    get: (key: string, fallback: unknown) =>
      Object.prototype.hasOwnProperty.call(values[section] || {}, key)
        ? values[section][key]
        : fallback,
  }));
}

function mockReachableServer() {
  (net.createConnection as jest.Mock).mockImplementation(() => {
    const socket: any = {
      destroy: jest.fn(),
      setTimeout: jest.fn(),
      once: jest.fn((event: string, callback: () => void) => {
        if (event === 'connect') {
          Promise.resolve().then(callback);
        }
        return socket;
      }),
    };
    return socket;
  });
}

describe('preview commands', () => {
  beforeEach(() => {
    extensions = {
      [enhancedId]: extension(),
    };
    (vscode.window as any).activeTextEditor = markdownEditor;
    (vscode.extensions.getExtension as jest.Mock).mockImplementation(
      (id: string) => extensions[id],
    );
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
    (vscode.env.asExternalUri as jest.Mock).mockImplementation(async (uri) => uri);
    (vscode.env.openExternal as jest.Mock).mockResolvedValue(true);
    configure();
  });

  it('routes the normal Markdown preview through Markdown Preview Enhanced by default', async () => {
    await openMarkdownPreview();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown-preview-enhanced.openPreview');
  });

  it('routes the Markdown side preview through Markdown Preview Enhanced', async () => {
    await openMarkdownPreviewToSide();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown-preview-enhanced.openPreviewToTheSide');
  });

  it('activates Markdown Preview Enhanced before using it when necessary', async () => {
    extensions[enhancedId] = extension(false);
    await openMarkdownPreview();
    expect(extensions[enhancedId]!.activate).toHaveBeenCalledTimes(1);
  });

  it('uses the built-in Markdown preview when the enhanced override is disabled', async () => {
    configure({'vscode-markdown-footnote': { preferEnhancedPreview: false }});
    await openMarkdownPreview();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreview');
  });

  it('uses the built-in Markdown preview when Markdown Preview Enhanced is not installed', async () => {
    extensions[enhancedId] = undefined;
    await openMarkdownPreviewToSide();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreviewToSide');
  });

  it('falls back to the built-in Markdown preview when the enhanced command fails', async () => {
    (vscode.commands.executeCommand as jest.Mock)
      .mockRejectedValueOnce(new Error('preview failed'))
      .mockResolvedValueOnce(undefined);
    await openMarkdownPreview();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('preview failed'));
    expect(vscode.commands.executeCommand).toHaveBeenLastCalledWith('markdown.showPreview');
  });

  it('routes MDX through Modern MDX Preview when available', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;
    extensions[modernMdxId] = extension();
    await openMarkdownPreview();
    expect(vscode.extensions.getExtension).toHaveBeenCalledWith(modernMdxId);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mdx-preview.commands.openPreview');
    expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith('markdown-preview-enhanced.openPreview');
  });

  it('activates Modern MDX Preview before use when necessary', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;
    extensions[modernMdxId] = extension(false);
    await openMarkdownPreview();
    expect(extensions[modernMdxId]!.activate).toHaveBeenCalledTimes(1);
  });

  it('recognizes the legacy Xiaoyi MDX Preview when modern preview is absent', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;
    extensions[legacyMdxId] = extension(false);
    await openMarkdownPreview();
    expect(vscode.extensions.getExtension).toHaveBeenCalledWith(modernMdxId);
    expect(vscode.extensions.getExtension).toHaveBeenCalledWith(legacyMdxId);
    expect(extensions[legacyMdxId]!.activate).toHaveBeenCalledTimes(1);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mdx-preview.commands.openPreview');
  });

  it('uses Markdown Preview Enhanced for MDX when dedicated MDX preview is disabled', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;
    extensions[modernMdxId] = extension();
    configure({'vscode-markdown-footnote': { preferMdxPreview: false }});
    await openMarkdownPreviewToSide();
    expect(vscode.extensions.getExtension).not.toHaveBeenCalledWith(modernMdxId);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown-preview-enhanced.openPreviewToTheSide');
  });

  it('falls back to Markdown Preview Enhanced if the MDX preview command fails', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;
    extensions[modernMdxId] = extension();
    (vscode.commands.executeCommand as jest.Mock)
      .mockRejectedValueOnce(new Error('mdx failed'))
      .mockResolvedValueOnce(undefined);
    await openMarkdownPreview();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('mdx failed'));
    expect(vscode.commands.executeCommand).toHaveBeenLastCalledWith('markdown-preview-enhanced.openPreview');
  });

  it('warns when MDX has neither a dedicated provider nor the enhanced fallback', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;
    extensions[enhancedId] = undefined;
    await openMarkdownPreview();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('No MDX preview provider is available'));
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('uses the same MDX provider for the side-preview command', async () => {
    (vscode.window as any).activeTextEditor = mdxEditor;
    extensions[modernMdxId] = extension();
    await openMarkdownPreviewToSide();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mdx-preview.commands.openPreview');
  });

  it('does nothing for an unrelated editor language', async () => {
    (vscode.window as any).activeTextEditor = {
      document: { languageId: 'typescript', uri: markdownEditor.document.uri },
    };
    await openMarkdownPreview();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('opens the Moondancer settings surface', async () => {
    await openMoondancerSettings();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.openSettings',
      '@ext:pony-factor.moondancer-fn',
    );
  });

  it('warns instead of starting the Crossnote server when MPE is missing', async () => {
    extensions[enhancedId] = undefined;
    await startPreviewServer();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('Markdown Preview Enhanced is not installed'),
    );
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('starts Crossnote without opening a browser when configured to none', async () => {
    configure({'vscode-markdown-footnote': { previewServerBrowser: 'none' }});
    await startPreviewServer();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown-preview-enhanced.startCrossnoteServer');
    expect(net.createConnection).not.toHaveBeenCalled();
  });

  it('opens a reachable Crossnote server in the integrated browser by default', async () => {
    mockReachableServer();
    await startPreviewServer();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('simpleBrowser.show', 'http://localhost:3000');
  });

  it('opens a reachable Crossnote server in the external browser when requested', async () => {
    configure({
      'vscode-markdown-footnote': { previewServerBrowser: 'external' },
      'markdown-preview-enhanced': { crossnoteServePort: 4100 },
    });
    mockReachableServer();
    await startPreviewServer();
    expect(vscode.env.openExternal).toHaveBeenCalledTimes(1);
  });

  it('falls back to the external browser if the integrated browser command fails', async () => {
    mockReachableServer();
    (vscode.commands.executeCommand as jest.Mock).mockImplementation((command: string) => {
      if (command === 'simpleBrowser.show') return Promise.reject(new Error('Simple Browser unavailable'));
      return Promise.resolve();
    });
    await startPreviewServer();
    expect(vscode.env.openExternal).toHaveBeenCalledTimes(1);
  });

  it('does not guess a URL when Crossnote is configured with an ephemeral port', async () => {
    configure({'markdown-preview-enhanced': { crossnoteServePort: 0 }});
    await startPreviewServer();
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('configured with port 0'));
    expect(net.createConnection).not.toHaveBeenCalled();
  });
});
