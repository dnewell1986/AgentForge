import * as vscode from 'vscode';
import { logger } from '../utils/logger';

const TOKEN_SECRET_KEY = 'agentforge.githubToken';

/**
 * Low-level GitHub HTTP client.
 * Reads the stored PAT from VS Code SecretStorage and injects it as a Bearer
 * token on every request. Raises typed errors for auth, rate-limit, and other
 * HTTP failures so callers can handle them distinctly.
 */
export class GitHubService {
    constructor(private readonly secrets: vscode.SecretStorage) {}

    /**
     * Fetches a URL and returns the response body as plain text.
     * @throws {GitHubAuthError} on 401
     * @throws {GitHubRateLimitError} on 403 with exhausted rate limit
     * @throws {GitHubError} on other non-OK responses
     */
    async fetchText(url: string): Promise<string> {
        const headers = await this.buildHeaders();

        logger.debug(`GET ${url}`);

        let response: Response;
        try {
            response = await fetch(url, { headers });
        } catch (err) {
            throw new GitHubError(`Network error reaching GitHub: ${err instanceof Error ? err.message : String(err)}`);
        }

        this.assertResponseOk(response, url);

        return response.text();
    }

    /** Saves a GitHub Personal Access Token to SecretStorage. */
    async setToken(token: string): Promise<void> {
        await this.secrets.store(TOKEN_SECRET_KEY, token);
        logger.info('GitHub token saved to SecretStorage.');
    }

    /** Removes the stored token. */
    async clearToken(): Promise<void> {
        await this.secrets.delete(TOKEN_SECRET_KEY);
        logger.info('GitHub token cleared.');
    }

    /** Returns true if a token is currently stored. */
    async hasToken(): Promise<boolean> {
        return (await this.secrets.get(TOKEN_SECRET_KEY)) !== undefined;
    }

    /**
     * Derives a raw-content URL for an individual package file, relative to the
     * catalog URL base. Used in Phase 4 when downloading package files.
     *
     * @example
     * rawFileUrl('https://raw.githubusercontent.com/org/repo/main/catalog.json', 'agents/my-agent/agent.md')
     * // → 'https://raw.githubusercontent.com/org/repo/main/agents/my-agent/agent.md'
     */
    rawFileUrl(catalogUrl: string, filePath: string): string {
        const lastSlash = catalogUrl.lastIndexOf('/');
        const base = catalogUrl.substring(0, lastSlash + 1);
        return `${base}${filePath}`;
    }

    private async buildHeaders(): Promise<Record<string, string>> {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.raw+json',
            'User-Agent': 'agentforge-vscode',
        };
        const token = await this.secrets.get(TOKEN_SECRET_KEY);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    private assertResponseOk(response: Response, url: string): void {
        if (response.ok) {
            return;
        }

        if (response.status === 401) {
            throw new GitHubAuthError(
                'GitHub request unauthorised (401). Set a GitHub Personal Access Token via the "AgentForge: Set GitHub Token" command.',
            );
        }

        if (response.status === 403) {
            const remaining = response.headers.get('x-ratelimit-remaining');
            if (remaining === '0') {
                const reset = response.headers.get('x-ratelimit-reset');
                const time = reset
                    ? new Date(parseInt(reset) * 1000).toLocaleTimeString()
                    : 'unknown';
                throw new GitHubRateLimitError(
                    `GitHub API rate limit exceeded. Resets at ${time}. Set a token to increase your limit.`,
                );
            }
            throw new GitHubError(`GitHub request forbidden (403): ${url}`);
        }

        if (response.status === 404) {
            throw new GitHubError(`GitHub resource not found (404): ${url}`);
        }

        throw new GitHubError(
            `GitHub request failed: ${response.status} ${response.statusText} — ${url}`,
        );
    }
}

/** Base error for all GitHub-related failures. */
export class GitHubError extends Error {}

/** Thrown when GitHub returns 401 — token missing or invalid. */
export class GitHubAuthError extends GitHubError {}

/** Thrown when the GitHub API rate limit is exhausted. */
export class GitHubRateLimitError extends GitHubError {}
