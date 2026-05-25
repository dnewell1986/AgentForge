import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { logger } from '../utils/logger';

/**
 * Prompts the user to enter a GitHub Personal Access Token and stores it in
 * VS Code SecretStorage. The token is never written to settings or logs.
 */
export async function setGitHubToken(github: GitHubService): Promise<void> {
    const token = await vscode.window.showInputBox({
        title: 'AgentForge: Set GitHub Token',
        prompt: 'Enter a GitHub Personal Access Token with public_repo (read) scope.',
        password: true,
        placeHolder: 'ghp_…',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Token cannot be empty.';
            }
            return undefined;
        },
    });

    if (!token) {
        return;
    }

    await github.setToken(token.trim());
    logger.info('GitHub token updated.');
    vscode.window.showInformationMessage('AgentForge: GitHub token saved.');
}
