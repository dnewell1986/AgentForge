import { GitHubService, GitHubAuthError, GitHubRateLimitError, GitHubError } from '../GitHubService';
import * as vscode from 'vscode';

const mockSecrets: vscode.SecretStorage = {
    get: jest.fn().mockResolvedValue(undefined),
    store: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockResolvedValue([]),
    onDidChange: jest.fn() as unknown as vscode.SecretStorage['onDidChange'],
};

function mockFetch(status: number, body: string, headers: Record<string, string> = {}): void {
    global.fetch = jest.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        statusText: String(status),
        text: () => Promise.resolve(body),
        headers: { get: (key: string) => headers[key] ?? null },
    } as unknown as Response);
}

describe('GitHubService', () => {
    let service: GitHubService;

    beforeEach(() => {
        service = new GitHubService(mockSecrets);
    });

    describe('fetchText', () => {
        it('returns body text on 200', async () => {
            mockFetch(200, 'hello world');
            const result = await service.fetchText('https://example.com/file.txt');
            expect(result).toBe('hello world');
        });

        it('throws GitHubAuthError on 401', async () => {
            mockFetch(401, 'Unauthorized');
            await expect(service.fetchText('https://example.com')).rejects.toThrow(GitHubAuthError);
        });

        it('throws GitHubRateLimitError on 403 with exhausted rate limit', async () => {
            mockFetch(403, 'Forbidden', {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': '9999999999',
            });
            await expect(service.fetchText('https://example.com')).rejects.toThrow(GitHubRateLimitError);
        });

        it('throws GitHubError on 403 without rate limit header', async () => {
            mockFetch(403, 'Forbidden');
            await expect(service.fetchText('https://example.com')).rejects.toThrow(GitHubError);
            await expect(service.fetchText('https://example.com')).rejects.not.toThrow(GitHubRateLimitError);
        });

        it('throws GitHubError on 404', async () => {
            mockFetch(404, 'Not Found');
            await expect(service.fetchText('https://example.com')).rejects.toThrow(GitHubError);
        });

        it('throws GitHubError on 500', async () => {
            mockFetch(500, 'Server Error');
            await expect(service.fetchText('https://example.com')).rejects.toThrow(GitHubError);
        });

        it('includes Authorization header when token is stored', async () => {
            (mockSecrets.get as jest.Mock).mockResolvedValue('ghp_test_token');
            mockFetch(200, 'ok');

            await service.fetchText('https://example.com');

            const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
            expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer ghp_test_token');
        });

        it('omits Authorization header when no token is stored', async () => {
            (mockSecrets.get as jest.Mock).mockResolvedValue(undefined);
            mockFetch(200, 'ok');

            await service.fetchText('https://example.com');

            const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
            expect((options.headers as Record<string, string>)['Authorization']).toBeUndefined();
        });

        it('throws GitHubError on network failure', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));
            await expect(service.fetchText('https://example.com')).rejects.toThrow(GitHubError);
        });
    });

    describe('rawFileUrl', () => {
        it('replaces the catalog filename with the given file path', () => {
            const catalogUrl = 'https://raw.githubusercontent.com/org/repo/main/catalog/catalog.json';
            const result = service.rawFileUrl(catalogUrl, 'agents/my-agent/agent.md');
            expect(result).toBe('https://raw.githubusercontent.com/org/repo/main/catalog/agents/my-agent/agent.md');
        });

        it('handles catalog at repo root', () => {
            const catalogUrl = 'https://raw.githubusercontent.com/org/repo/main/catalog.json';
            const result = service.rawFileUrl(catalogUrl, 'agents/my-agent/agent.md');
            expect(result).toBe('https://raw.githubusercontent.com/org/repo/main/agents/my-agent/agent.md');
        });
    });

    describe('setToken / hasToken', () => {
        it('stores a token via SecretStorage', async () => {
            await service.setToken('ghp_abc123');
            expect(mockSecrets.store).toHaveBeenCalledWith('agentforge.githubToken', 'ghp_abc123');
        });

        it('returns true when a token is stored', async () => {
            (mockSecrets.get as jest.Mock).mockResolvedValue('ghp_abc123');
            expect(await service.hasToken()).toBe(true);
        });

        it('returns false when no token is stored', async () => {
            (mockSecrets.get as jest.Mock).mockResolvedValue(undefined);
            expect(await service.hasToken()).toBe(false);
        });
    });
});
