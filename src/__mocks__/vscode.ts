/**
 * Manual Jest mock for the `vscode` module.
 * Mapped via jest.config.ts moduleNameMapper so all source files that
 * `import * as vscode from 'vscode'` receive this stub instead.
 */

const mockConfig = {
    get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
};

let _workspaceFolders: Array<{ uri: { fsPath: string } }> | undefined = undefined;

const vscode = {
    Uri: {
        joinPath: jest.fn((_base: { fsPath: string }, ...parts: string[]) => ({
            fsPath: parts.join('/'),
            toString: () => parts.join('/'),
        })),
        file: jest.fn((path: string) => ({ fsPath: path, toString: () => path })),
    },

    workspace: {
        getConfiguration: jest.fn(() => mockConfig),
        get workspaceFolders(): Array<{ uri: { fsPath: string } }> | undefined { return _workspaceFolders; },
        set workspaceFolders(v: Array<{ uri: { fsPath: string } }> | undefined) { _workspaceFolders = v; },
        fs: {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            createDirectory: jest.fn(),
            delete: jest.fn(),
        },
    },

    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
    },

    ProgressLocation: { Window: 10 },
    TreeItemCollapsibleState: { None: 0 },
    ThemeIcon: jest.fn(),
    ThemeColor: jest.fn(),
    TreeItem: jest.fn(),
    EventEmitter: jest.fn(() => ({ event: jest.fn(), fire: jest.fn() })),
};

export = vscode;
