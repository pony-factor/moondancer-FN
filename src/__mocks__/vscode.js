const languages = {
  createDiagnosticCollection: jest.fn(),
};

const StatusBarAlignment = {};

const window = {
  activeTextEditor: undefined,
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn(),
  })),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  createTextEditorDecorationType: jest.fn(),
};

const workspace = {
  getConfiguration: jest.fn(),
  workspaceFolders: [],
  onDidSaveTextDocument: jest.fn(),
};

const extensions = {
  getExtension: jest.fn(),
};

const env = {
  asExternalUri: jest.fn(async (uri) => uri),
  openExternal: jest.fn(async () => true),
};

const OverviewRulerLane = {
  Left: null,
};

const Uri = {
  file: (f) => f,
  parse: jest.fn((value) => ({
    toString: () => value,
  })),
};
const Range = jest.fn();
const Diagnostic = jest.fn();
const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };

const debug = {
  onDidTerminateDebugSession: jest.fn(),
  startDebugging: jest.fn(),
};

const commands = {
  executeCommand: jest.fn(),
};

const vscode = {
  languages,
  StatusBarAlignment,
  window,
  workspace,
  extensions,
  env,
  OverviewRulerLane,
  Uri,
  Range,
  Diagnostic,
  DiagnosticSeverity,
  debug,
  commands,
};

module.exports = vscode;
