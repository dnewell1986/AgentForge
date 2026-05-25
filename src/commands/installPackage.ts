import * as vscode from 'vscode';
import { CatalogPackage } from '../models/CatalogPackage';
import { InstallationService } from '../services/InstallationService';
import { logger } from '../utils/logger';

/**
 * Installs a package into the open workspace. Shows a confirmation prompt if
 * the package is already recorded in the manifest (update flow).
 */
export async function installPackage(
    pkg: CatalogPackage,
    installationService: InstallationService,
): Promise<void> {
    const isInstalled = await installationService.isInstalled(pkg.id);

    if (isInstalled) {
        const answer = await vscode.window.showWarningMessage(
            `"${pkg.name}" is already installed. Update to v${pkg.version}?`,
            { modal: true },
            'Update',
        );
        if (answer !== 'Update') {
            return;
        }
    }

    logger.info(`Installing: ${pkg.id} v${pkg.version}`);
    await installationService.install(pkg);
}
