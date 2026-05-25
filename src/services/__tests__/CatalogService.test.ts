import { CatalogService } from '../CatalogService';
import { GitHubService } from '../GitHubService';
import * as vscode from 'vscode';

const CATALOG_URL = 'https://raw.githubusercontent.com/org/repo/main/catalog/catalog.json';

function makeMockGitHub(fetchResponse?: string): jest.Mocked<Pick<GitHubService, 'fetchText' | 'rawFileUrl'>> {
    return {
        fetchText: jest.fn().mockResolvedValue(fetchResponse ?? '{"agents":[],"skills":[],"instructions":[]}'),
        rawFileUrl: jest.fn(),
    };
}

function makeMockContext(cachedValue?: unknown): vscode.ExtensionContext {
    return {
        globalState: {
            get: jest.fn().mockReturnValue(cachedValue),
            update: jest.fn().mockResolvedValue(undefined),
            keys: jest.fn().mockReturnValue([]),
            setKeysForSync: jest.fn(),
        },
    } as unknown as vscode.ExtensionContext;
}

function mockCatalogUrl(url = CATALOG_URL): void {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: (key: string, def: unknown) => {
            if (key === 'catalogUrl') { return url; }
            if (key === 'cacheTtlMinutes') { return 60; }
            return def;
        },
    });
}

describe('CatalogService', () => {
    describe('getCatalog — network fetch', () => {
        it('returns a parsed catalog from GitHub', async () => {
            const payload = JSON.stringify({
                agents: [{
                    id: 'agent-1', name: 'Agent One', description: 'Desc', author: 'a',
                    version: '1.0.0', installPath: '.github/agents/agent-1', files: ['agents/agent-1/agent.md'], tags: ['a'],
                }],
                skills: [],
                instructions: [],
            });

            const github = makeMockGitHub(payload);
            const context = makeMockContext(undefined);
            mockCatalogUrl();

            const service = new CatalogService(context, github as unknown as GitHubService);
            const result = await service.getCatalog(true);

            expect(result.agents).toHaveLength(1);
            expect(result.agents[0].id).toBe('agent-1');
            expect(result.agents[0].category).toBe('agent');
            expect(result.skills).toHaveLength(0);
            expect(result.instructions).toHaveLength(0);
        });

        it('assigns the correct category to each array', async () => {
            const entry = (id: string) => ({
                id, name: id, description: 'd', author: 'a',
                version: '1.0.0', installPath: '.github', files: [], tags: [],
            });
            const payload = JSON.stringify({
                agents: [entry('a1')],
                skills: [entry('s1')],
                instructions: [entry('i1')],
            });

            const service = new CatalogService(
                makeMockContext(undefined),
                makeMockGitHub(payload) as unknown as GitHubService,
            );
            mockCatalogUrl();
            const result = await service.getCatalog(true);

            expect(result.agents[0].category).toBe('agent');
            expect(result.skills[0].category).toBe('skill');
            expect(result.instructions[0].category).toBe('instruction');
        });

        it('skips malformed entries missing required fields', async () => {
            const payload = JSON.stringify({
                agents: [
                    { id: 'valid', name: 'Valid', description: 'd', author: 'a', version: '1.0.0', installPath: '.github', files: [], tags: [] },
                    { name: 'Missing id' },
                    { id: 'missing-files', name: 'n', description: 'd', author: 'a', version: '1.0.0', installPath: '.github' },
                ],
                skills: [],
                instructions: [],
            });

            const service = new CatalogService(
                makeMockContext(undefined),
                makeMockGitHub(payload) as unknown as GitHubService,
            );
            mockCatalogUrl();
            const result = await service.getCatalog(true);

            expect(result.agents).toHaveLength(1);
            expect(result.agents[0].id).toBe('valid');
        });

        it('returns empty arrays when catalog arrays are missing', async () => {
            const service = new CatalogService(
                makeMockContext(undefined),
                makeMockGitHub('{}') as unknown as GitHubService,
            );
            mockCatalogUrl();
            const result = await service.getCatalog(true);

            expect(result.agents).toEqual([]);
            expect(result.skills).toEqual([]);
            expect(result.instructions).toEqual([]);
        });

        it('throws when catalog.json is not valid JSON', async () => {
            const service = new CatalogService(
                makeMockContext(undefined),
                makeMockGitHub('not json {{{') as unknown as GitHubService,
            );
            mockCatalogUrl();
            await expect(service.getCatalog(true)).rejects.toThrow(/not valid JSON/);
        });

        it('throws when no catalog URL is configured', async () => {
            const service = new CatalogService(
                makeMockContext(undefined),
                makeMockGitHub() as unknown as GitHubService,
            );
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: (_key: string, def: unknown) => def,
            });
            await expect(service.getCatalog(true)).rejects.toThrow(/No catalog URL/);
        });
    });

    describe('getCatalog — caching', () => {
        it('returns cached catalog without calling GitHub when cache is fresh', async () => {
            const cachedCatalog = { agents: [], skills: [], instructions: [] };
            const context = makeMockContext({ catalog: cachedCatalog, fetchedAt: Date.now() });
            const github = makeMockGitHub();
            mockCatalogUrl();

            const service = new CatalogService(context, github as unknown as GitHubService);
            const result = await service.getCatalog();

            expect(github.fetchText).not.toHaveBeenCalled();
            expect(result).toEqual(cachedCatalog);
        });

        it('re-fetches when cache is expired', async () => {
            const expiredFetchedAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
            const context = makeMockContext({
                catalog: { agents: [], skills: [], instructions: [] },
                fetchedAt: expiredFetchedAt,
            });
            const github = makeMockGitHub();
            mockCatalogUrl();

            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: (key: string, def: unknown) => {
                    if (key === 'catalogUrl') { return CATALOG_URL; }
                    if (key === 'cacheTtlMinutes') { return 60; }
                    return def;
                },
            });

            const service = new CatalogService(context, github as unknown as GitHubService);
            await service.getCatalog();

            expect(github.fetchText).toHaveBeenCalledTimes(1);
        });

        it('bypasses cache when forceRefresh is true', async () => {
            const context = makeMockContext({ catalog: { agents: [], skills: [], instructions: [] }, fetchedAt: Date.now() });
            const github = makeMockGitHub();
            mockCatalogUrl();

            const service = new CatalogService(context, github as unknown as GitHubService);
            await service.getCatalog(true);

            expect(github.fetchText).toHaveBeenCalledTimes(1);
        });
    });
});
