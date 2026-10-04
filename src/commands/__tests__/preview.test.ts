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

const activeEditor = {
  document: {
    languageId: 'markdown',
    uri: { toString: () => 'file:///workspace/test.md' },
  },
};

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
  const extension = {
    isActive: true,
    activate: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    (vscode.window as any).activeTextEditor = activeEditor;
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(extension);
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
    (vscode.env.asExternalUri as jest.Mock).mockImplementation(async (uri) => uri);
    (vscode.env.openExternal as jest.Mock).mockResolvedValue(true);
    configure();
  });

  it('routes the normal preview through Markdown Preview Enhanced by default', async () => {
    await openMarkdownPreview();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'markdown-preview-enhanced.openPreview',
    );
  });

  it('routes the side preview through Markdown Preview Enhanced', async () => {
    await openMarkdownPreviewToSide();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'markdown-preview-enhanced.openPreviewToTheSide',
    );
  });

  it('activates Markdown Preview Enhanced before using it when necessary', async () => {
    const inactiveExtension = {
      isActive: false,
      activate: jest.fn().mockResolvedValue(undefined),
    };
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(inactiveExtension);

    await openMarkdownPreview();

    expect(inactiveExtension.activate).toHaveBeenCalledTimes(1);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'markdown-preview-enhanced.openPreview',
    );
  });

  it('uses the built-in preview when the enhanced override is disabled', async () => {
    configure({
      'vscode-markdown-footnote': { preferEnhancedPreview: false },
    });

    await openMarkdownPreview();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreview');
  });

  it('uses the built-in preview when Markdown Preview Enhanced is not installed', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);

    await openMarkdownPreviewToSide();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('markdown.showPreviewToSide');
  });

  it('falls back to the built-in preview when the enhanced command fails', async () => {
    (vscode.commands.executeCommand as jest.Mock)
      .mockRejectedValueOnce(new Error('preview failed'))
      .mockResolvedValueOnce(undefined);

    await openMarkdownPreview();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('preview failed'),
    );
    expect(vscode.commands.executeCommand).toHaveBeenLastCalledWith('markdown.showPreview');
  });

  it('does nothing for a non-Markdown editor', async () => {
    (vscode.window as any).activeTextEditor = {
      document: { languageId: 'typescript', uri: activeEditor.document.uri },
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
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);

    await startPreviewServer();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('Markdown Preview Enhanced is not installed'),
    );
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('starts Crossnote without opening a browser when configured to none', async () => {
    configure({
      'vscode-markdown-footnote': { previewServerBrowser: 'none' },
    });

    await startPreviewServer();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'markdown-preview-enhanced.startCrossnoteServer',
    );
    expect(net.createConnection).not.toHaveBeenCalled();
    expect(vscode.env.openExternal).not.toHaveBeenCalled();
  });

  it('opens a reachable Crossnote server in the integrated browser by default', async () => {
    mockReachableServer();

    await startPreviewServer();

    expect(vscode.Uri.parse).toHaveBeenCalledWith('http://localhost:3000');
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'simpleBrowser.show',
      'http://localhost:3000',
    );
    expect(vscode.env.openExternal).not.toHaveBeenCalled();
  });

  it('opens a reachable Crossnote server in the external browser when requested', async () => {
    configure({
      'vscode-markdown-footnote': { previewServerBrowser: 'external' },
      'markdown-preview-enhanced': { crossnoteServePort: 4100 },
    });
    mockReachableServer();

    await startPreviewServer();

    expect(vscode.Uri.parse).toHaveBeenCalledWith('http://localhost:4100');
    expect(vscode.env.openExternal).toHaveBeenCalledTimes(1);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
      'simpleBrowser.show',
      expect.anything(),
    );
  });

  it('falls back to the external browser if the integrated browser command fails', async () => {
    mockReachableServer();
    (vscode.commands.executeCommand as jest.Mock).mockImplementation((command: string) => {
      if (command === 'simpleBrowser.show') {
        return Promise.reject(new Error('Simple Browser unavailable'));
      }
      return Promise.resolve();
    });

    await startPreviewServer();

    expect(vscode.env.openExternal).toHaveBeenCalledTimes(1);
  });

  it('does not guess a URL when Crossnote is configured with an ephemeral port', async () => {
    configure({
      'markdown-preview-enhanced': { crossnoteServePort: 0 },
    });

    await startPreviewServer();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('configured with port 0'),
    );
    expect(net.createConnection).not.toHaveBeenCalled();
  });
});
