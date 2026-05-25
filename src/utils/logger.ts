import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function initLogger(channel: vscode.OutputChannel): void {
    outputChannel = channel;
}

function isDebugEnabled(): boolean {
    return vscode.workspace.getConfiguration('agentforge').get<boolean>('debug', false);
}

function write(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    outputChannel?.appendLine(`[${timestamp}] [${level}] ${message}`);
}

export const logger = {
    info(message: string): void {
        write('INFO', message);
    },

    warn(message: string): void {
        write('WARN', message);
    },

    error(message: string, err?: unknown): void {
        const detail = err instanceof Error ? ` — ${err.message}` : '';
        write('ERROR', `${message}${detail}`);
    },

    debug(message: string): void {
        if (isDebugEnabled()) {
            write('DEBUG', message);
        }
    },

    show(): void {
        outputChannel?.show(true);
    },
};
