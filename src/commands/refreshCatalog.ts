import * as vscode from 'vscode';
import { Catalog } from '../models/CatalogPackage';
import { CatalogService } from '../services/CatalogService';
import { logger } from '../utils/logger';

/**
 * Forces a fresh catalog fetch from GitHub and returns the result.
 * Displays a progress indicator in the status bar while loading.
 */
export async function refreshCatalog(catalogService: CatalogService): Promise<Catalog> {
    logger.info('Refreshing catalog…');
    return vscode.window.withProgress<Catalog>(
        {
            location: vscode.ProgressLocation.Window,
            title: 'AgentForge: Refreshing catalog…',
            cancellable: false,
        },
        () => catalogService.refresh(),
    );
}
