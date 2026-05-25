import * as vscode from 'vscode';
import { CatalogPackage } from '../models/CatalogPackage';
import { logger } from '../utils/logger';

/**
 * Opens a QuickPick over all catalog packages and returns the one the user
 * selects, or undefined if they dismissed the picker.
 */
export async function searchCatalog(
    allPackages: CatalogPackage[],
): Promise<CatalogPackage | undefined> {
    if (allPackages.length === 0) {
        vscode.window.showInformationMessage(
            'AgentForge: No packages loaded. Refresh the catalog first.',
        );
        return undefined;
    }

    const items = allPackages.map<vscode.QuickPickItem & { pkg: CatalogPackage }>((pkg) => ({
        label: pkg.name,
        description: `${pkg.category} · v${pkg.version} · ${pkg.author}`,
        detail: pkg.description,
        pkg,
    }));

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Search agents, skills, and instructions…',
        matchOnDescription: true,
        matchOnDetail: true,
    });

    if (!picked) {
        return undefined;
    }

    logger.debug(`Search selected: ${picked.pkg.id}`);
    return picked.pkg;
}
