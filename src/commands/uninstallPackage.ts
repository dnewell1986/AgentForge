import * as vscode from 'vscode';
import { CatalogPackage } from '../models/CatalogPackage';
import { InstallationService } from '../services/InstallationService';
import { logger } from '../utils/logger';

/**
 * Prompts the user to confirm and then removes all files for the given package
 * from the workspace, moving them to the OS trash.
 */
export async function uninstallPackage(
    pkg: CatalogPackage,
    installationService: InstallationService,
): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        `Uninstall "${pkg.name}"? Its files will be moved to the trash.`,
        { modal: true },
        'Uninstall',
    );

    if (confirm !== 'Uninstall') {
        return;
    }

    logger.info(`Uninstalling: ${pkg.id}`);
    await installationService.uninstall(pkg);
}
