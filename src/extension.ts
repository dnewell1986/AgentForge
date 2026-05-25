import * as vscode from 'vscode';
import { CatalogTreeProvider, PackageTreeItem } from './providers/CatalogTreeProvider';
import { refreshCatalog } from './commands/refreshCatalog';
import { installPackage } from './commands/installPackage';
import { uninstallPackage } from './commands/uninstallPackage';
import { searchCatalog } from './commands/searchCatalog';
import { setGitHubToken } from './commands/setGitHubToken';
import { GitHubService, GitHubAuthError, GitHubRateLimitError } from './services/GitHubService';
import { CatalogService } from './services/CatalogService';
import { InstallationService } from './services/InstallationService';
import { PackageDetailPanel } from './views/PackageDetailPanel';
import { initLogger, logger } from './utils/logger';
import { Catalog, CatalogPackage } from './models/CatalogPackage';

export function activate(context: vscode.ExtensionContext): void {
    const outputChannel = vscode.window.createOutputChannel('AgentForge');
    initLogger(outputChannel);
    logger.info('AgentForge activated.');

    const github = new GitHubService(context.secrets);
    const catalogService = new CatalogService(context, github);
    const installationService = new InstallationService(github);

    const agentsProvider = new CatalogTreeProvider('agent');
    const skillsProvider = new CatalogTreeProvider('skill');
    const instructionsProvider = new CatalogTreeProvider('instruction');

    /** The last successfully loaded catalog, used to refresh providers after install/uninstall. */
    let currentCatalog: Catalog | undefined;

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('agentforge.agents', agentsProvider),
        vscode.window.registerTreeDataProvider('agentforge.skills', skillsProvider),
        vscode.window.registerTreeDataProvider('agentforge.instructions', instructionsProvider),
        outputChannel,
    );

    /** Pushes a catalog and up-to-date installed/outdated state into all tree views. */
    async function applyCatalog(catalog: Catalog): Promise<void> {
        currentCatalog = catalog;
        const installedIds = await installationService.getInstalledIds();
        const outdatedIds = await installationService.getOutdatedIds(catalog);
        agentsProvider.setPackages(catalog.agents, installedIds, outdatedIds);
        skillsProvider.setPackages(catalog.skills, installedIds, outdatedIds);
        instructionsProvider.setPackages(catalog.instructions, installedIds, outdatedIds);
    }

    /** Re-renders tree views using the cached catalog and current manifest state. */
    async function refreshProviders(): Promise<void> {
        if (currentCatalog) {
            await applyCatalog(currentCatalog);
        }
    }

    /**
     * Wraps an async operation and surfaces typed GitHub errors as actionable
     * VS Code notifications rather than unhandled rejections.
     */
    async function withErrorHandling(operation: () => Promise<void>): Promise<void> {
        try {
            await operation();
        } catch (err) {
            if (err instanceof GitHubAuthError) {
                logger.error('GitHub authentication error', err);
                const action = await vscode.window.showErrorMessage(
                    `AgentForge: ${err.message}`,
                    'Set Token',
                );
                if (action === 'Set Token') {
                    await setGitHubToken(github);
                }
            } else if (err instanceof GitHubRateLimitError) {
                logger.error('GitHub rate limit error', err);
                vscode.window.showWarningMessage(`AgentForge: ${err.message}`);
            } else {
                const message = err instanceof Error ? err.message : String(err);
                logger.error('Unexpected error', err);
                vscode.window.showErrorMessage(`AgentForge: ${message}`);
            }
        }
    }

    /** Opens the package detail panel and wires install/uninstall back to refreshProviders. */
    async function showDetails(pkg: CatalogPackage): Promise<void> {
        await PackageDetailPanel.show(
            pkg,
            context.extensionUri,
            installationService,
            async (p) => {
                await installPackage(p, installationService);
                await refreshProviders();
            },
            async (p) => {
                await uninstallPackage(p, installationService);
                await refreshProviders();
            },
        );
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('agentforge.refreshCatalog', () =>
            withErrorHandling(async () => {
                const catalog = await refreshCatalog(catalogService);
                await applyCatalog(catalog);
            }),
        ),

        vscode.commands.registerCommand('agentforge.setGitHubToken', () =>
            setGitHubToken(github),
        ),

        vscode.commands.registerCommand('agentforge.search', () =>
            withErrorHandling(async () => {
                const catalog = await catalogService.getCatalog();
                const all = [...catalog.agents, ...catalog.skills, ...catalog.instructions];
                const pkg = await searchCatalog(all);
                if (pkg) {
                    await showDetails(pkg);
                }
            }),
        ),

        vscode.commands.registerCommand(
            'agentforge.installPackage',
            (item?: PackageTreeItem) =>
                withErrorHandling(async () => {
                    if (!item) {
                        vscode.window.showWarningMessage('AgentForge: Select a package to install.');
                        return;
                    }
                    await installPackage(item.pkg, installationService);
                    await refreshProviders();
                }),
        ),

        vscode.commands.registerCommand(
            'agentforge.uninstallPackage',
            (item?: PackageTreeItem) =>
                withErrorHandling(async () => {
                    if (!item) {
                        vscode.window.showWarningMessage('AgentForge: Select a package to uninstall.');
                        return;
                    }
                    await uninstallPackage(item.pkg, installationService);
                    await refreshProviders();
                }),
        ),

        vscode.commands.registerCommand(
            'agentforge.showDetails',
            (item?: PackageTreeItem) =>
                withErrorHandling(async () => {
                    if (!item) {
                        return;
                    }
                    await showDetails(item.pkg);
                }),
        ),
    );

    logger.info('AgentForge commands and tree views registered.');

    // Load catalog on activation (non-blocking — errors are handled gracefully)
    void withErrorHandling(async () => {
        const catalog = await catalogService.getCatalog();
        await applyCatalog(catalog);
    });
}

export function deactivate(): void {
    logger.info('AgentForge deactivated.');
}
