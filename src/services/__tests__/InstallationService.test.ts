import { InstallationService } from '../InstallationService';
import { GitHubService } from '../GitHubService';
import * as vscode from 'vscode';
import { createEmptyManifest, InstalledManifest } from '../../models/InstalledManifest';
import { CatalogPackage } from '../../models/CatalogPackage';

const WORKSPACE_ROOT = { fsPath: '/workspace', toString: () => '/workspace' };

function setWorkspaceFolders(value: Array<{ uri: { fsPath: string } }> | undefined): void {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', { value, configurable: true, writable: true });
}

function mockWorkspace(): void {
    setWorkspaceFolders([{ uri: WORKSPACE_ROOT as unknown as vscode.Uri }]);
}

function mockNoWorkspace(): void {
    setWorkspaceFolders(undefined);
}

function makeMockGitHub(): jest.Mocked<Pick<GitHubService, 'fetchText' | 'rawFileUrl'>> {
    return {
        fetchText: jest.fn().mockResolvedValue('# file content'),
        rawFileUrl: jest.fn().mockReturnValue('https://example.com/file.md'),
    };
}

function makeManifestBytes(manifest: InstalledManifest): Uint8Array {
    return Buffer.from(JSON.stringify(manifest), 'utf8');
}

const samplePackage: CatalogPackage = {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent',
    author: 'test',
    version: '1.0.0',
    category: 'agent',
    tags: ['test'],
    installPath: '.github/agents/test-agent',
    files: ['agents/test-agent/agent.md'],
};

describe('InstallationService', () => {
    let service: InstallationService;
    let mockGithub: jest.Mocked<Pick<GitHubService, 'fetchText' | 'rawFileUrl'>>;

    beforeEach(() => {
        mockGithub = makeMockGitHub();
        service = new InstallationService(mockGithub as unknown as GitHubService);
        mockWorkspace();
        (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(new Error('not found'));
        (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        (vscode.workspace.fs.createDirectory as jest.Mock).mockResolvedValue(undefined);
        (vscode.workspace.fs.delete as jest.Mock).mockResolvedValue(undefined);
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: (key: string, def: unknown) => key === 'catalogUrl'
                ? 'https://raw.githubusercontent.com/org/repo/main/catalog/catalog.json'
                : def,
        });
    });

    describe('isInstalled', () => {
        it('returns false when manifest does not exist', async () => {
            expect(await service.isInstalled('test-agent')).toBe(false);
        });

        it('returns true when package is in the manifest', async () => {
            const manifest: InstalledManifest = {
                version: 1,
                packages: { 'test-agent': { id: 'test-agent', version: '1.0.0', installedAt: '', files: [] } },
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(makeManifestBytes(manifest));
            expect(await service.isInstalled('test-agent')).toBe(true);
        });

        it('returns false when no workspace is open', async () => {
            mockNoWorkspace();
            expect(await service.isInstalled('test-agent')).toBe(false);
        });
    });

    describe('getInstalledVersion', () => {
        it('returns the installed version from the manifest', async () => {
            const manifest: InstalledManifest = {
                version: 1,
                packages: { 'test-agent': { id: 'test-agent', version: '2.0.0', installedAt: '', files: [] } },
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(makeManifestBytes(manifest));
            expect(await service.getInstalledVersion('test-agent')).toBe('2.0.0');
        });

        it('returns undefined when package is not installed', async () => {
            expect(await service.getInstalledVersion('test-agent')).toBeUndefined();
        });
    });

    describe('getInstalledIds', () => {
        it('returns a set of all installed package ids', async () => {
            const manifest: InstalledManifest = {
                version: 1,
                packages: {
                    'agent-a': { id: 'agent-a', version: '1.0.0', installedAt: '', files: [] },
                    'agent-b': { id: 'agent-b', version: '1.0.0', installedAt: '', files: [] },
                },
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(makeManifestBytes(manifest));
            const ids = await service.getInstalledIds();
            expect(ids).toEqual(new Set(['agent-a', 'agent-b']));
        });

        it('returns empty set when no workspace is open', async () => {
            mockNoWorkspace();
            const ids = await service.getInstalledIds();
            expect(ids.size).toBe(0);
        });
    });

    describe('getOutdatedIds', () => {
        it('returns ids where installed version differs from catalog version', async () => {
            const manifest: InstalledManifest = {
                version: 1,
                packages: {
                    'test-agent': { id: 'test-agent', version: '1.0.0', installedAt: '', files: [] },
                },
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(makeManifestBytes(manifest));

            const catalog = {
                agents: [{ ...samplePackage, version: '2.0.0' }],
                skills: [],
                instructions: [],
            };

            const outdated = await service.getOutdatedIds(catalog);
            expect(outdated).toEqual(new Set(['test-agent']));
        });

        it('does not include packages that are up to date', async () => {
            const manifest: InstalledManifest = {
                version: 1,
                packages: {
                    'test-agent': { id: 'test-agent', version: '1.0.0', installedAt: '', files: [] },
                },
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(makeManifestBytes(manifest));

            const catalog = { agents: [samplePackage], skills: [], instructions: [] };
            const outdated = await service.getOutdatedIds(catalog);
            expect(outdated.size).toBe(0);
        });
    });

    describe('install', () => {
        it('downloads each file and writes it to the workspace', async () => {
            await service.install(samplePackage);

            expect(mockGithub.rawFileUrl).toHaveBeenCalledWith(
                expect.stringContaining('catalog.json'),
                'agents/test-agent/agent.md',
            );
            expect(mockGithub.fetchText).toHaveBeenCalledTimes(1);
            // One write for the package file, one write for the manifest
            expect(vscode.workspace.fs.writeFile).toHaveBeenCalledTimes(2);
        });

        it('writes the manifest after a successful install', async () => {
            await service.install(samplePackage);

            const writeFileCalls = (vscode.workspace.fs.writeFile as jest.Mock).mock.calls;
            const manifestWrite = writeFileCalls.find(
                ([, bytes]: [unknown, Uint8Array]) => Buffer.from(bytes).toString('utf8').includes('test-agent'),
            );
            expect(manifestWrite).toBeDefined();
        });

        it('throws when no workspace is open', async () => {
            mockNoWorkspace();
            await expect(service.install(samplePackage)).rejects.toThrow(/No workspace folder/);
        });
    });

    describe('uninstall', () => {
        it('deletes installed files and removes the manifest entry', async () => {
            const manifest: InstalledManifest = {
                version: 1,
                packages: {
                    'test-agent': {
                        id: 'test-agent', version: '1.0.0', installedAt: '',
                        files: ['.github/agents/test-agent/agent.md'],
                    },
                },
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(makeManifestBytes(manifest));

            await service.uninstall(samplePackage);

            expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(1);

            const updatedManifest = JSON.parse(
                Buffer.from((vscode.workspace.fs.writeFile as jest.Mock).mock.calls[0][1]).toString('utf8'),
            ) as InstalledManifest;
            expect(updatedManifest.packages['test-agent']).toBeUndefined();
        });

        it('warns but does not throw when package has no manifest entry', async () => {
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                makeManifestBytes(createEmptyManifest()),
            );
            await expect(service.uninstall(samplePackage)).resolves.not.toThrow();
            expect(vscode.workspace.fs.delete).not.toHaveBeenCalled();
        });
    });
});
