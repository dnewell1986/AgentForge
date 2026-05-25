import * as vscode from 'vscode';
import { CatalogPackage, Catalog } from '../models/CatalogPackage';
import {
    InstalledManifest,
    InstalledPackageEntry,
    createEmptyManifest,
} from '../models/InstalledManifest';
import { GitHubService } from './GitHubService';
import { logger } from '../utils/logger';

const MANIFEST_FILENAME = '.agentforge-manifest.json';

/**
 * Handles installing and uninstalling catalog packages into the open workspace.
 * All installed file paths are recorded in `.agentforge-manifest.json` at the
 * workspace root so that uninstall can cleanly remove exactly what was written.
 *
 * File placement rules:
 *   - Each entry in `pkg.files` is a path relative to the catalog repository root.
 *   - The file is downloaded and written to `{workspace}/{pkg.installPath}/{basename}`.
 *   - The `pkg.installPath` directory (and any parents) is created automatically.
 */
export class InstallationService {
    constructor(private readonly github: GitHubService) {}

    /**
     * Downloads all files for the given package and writes them to the workspace.
     * Overwrites existing files — callers should confirm with the user beforehand
     * if the file is not owned by the manifest.
     *
     * @throws If no workspace folder is open.
     */
    async install(pkg: CatalogPackage): Promise<void> {
        const root = this.requireWorkspaceRoot();
        const catalogUrl = this.getCatalogUrl();
        const manifest = await this.readManifest(root);

        logger.info(`Installing ${pkg.id} v${pkg.version} → ${pkg.installPath}`);

        const writtenFiles: string[] = [];

        for (const catalogFilePath of pkg.files) {
            const sourceUrl = this.github.rawFileUrl(catalogUrl, catalogFilePath);
            const content = await this.github.fetchText(sourceUrl);

            const filename = catalogFilePath.split('/').pop() ?? catalogFilePath;
            const relativeTarget = `${pkg.installPath}/${filename}`;
            const targetUri = vscode.Uri.joinPath(root, relativeTarget);

            // Ensure parent directory exists before writing
            await vscode.workspace.fs.createDirectory(
                vscode.Uri.joinPath(targetUri, '..'),
            );
            await vscode.workspace.fs.writeFile(targetUri, Buffer.from(content, 'utf8'));

            writtenFiles.push(relativeTarget);
            logger.debug(`Written: ${relativeTarget}`);
        }

        manifest.packages[pkg.id] = {
            id: pkg.id,
            version: pkg.version,
            installedAt: new Date().toISOString(),
            files: writtenFiles,
        } satisfies InstalledPackageEntry;

        await this.writeManifest(root, manifest);
        logger.info(`Installed ${pkg.id} v${pkg.version}.`);
        vscode.window.showInformationMessage(`AgentForge: "${pkg.name}" installed successfully.`);
    }

    /**
     * Removes all files recorded in the manifest for the given package and
     * deletes the manifest entry. Deleted files are moved to the OS trash so
     * they can be recovered if needed.
     *
     * @throws If no workspace folder is open.
     */
    async uninstall(pkg: CatalogPackage): Promise<void> {
        const root = this.requireWorkspaceRoot();
        const manifest = await this.readManifest(root);
        const entry = manifest.packages[pkg.id];

        if (!entry) {
            vscode.window.showWarningMessage(
                `AgentForge: "${pkg.name}" has no manifest entry — nothing to remove.`,
            );
            return;
        }

        for (const file of entry.files) {
            try {
                await vscode.workspace.fs.delete(vscode.Uri.joinPath(root, file), {
                    useTrash: true,
                });
                logger.debug(`Deleted: ${file}`);
            } catch {
                logger.warn(`Could not delete "${file}" — it may have already been removed.`);
            }
        }

        delete manifest.packages[pkg.id];
        await this.writeManifest(root, manifest);
        logger.info(`Uninstalled ${pkg.id}.`);
        vscode.window.showInformationMessage(`AgentForge: "${pkg.name}" uninstalled.`);
    }

    /** Returns true if the package id is present in the workspace manifest. */
    async isInstalled(pkgId: string): Promise<boolean> {
        try {
            const manifest = await this.readManifest(this.requireWorkspaceRoot());
            return pkgId in manifest.packages;
        } catch {
            return false;
        }
    }

    /** Returns the installed version string, or undefined if not installed. */
    async getInstalledVersion(pkgId: string): Promise<string | undefined> {
        try {
            const manifest = await this.readManifest(this.requireWorkspaceRoot());
            return manifest.packages[pkgId]?.version;
        } catch {
            return undefined;
        }
    }

    /**
     * Returns the set of installed package ids. Returns an empty set if no
     * workspace is open or the manifest cannot be read.
     */
    async getInstalledIds(): Promise<Set<string>> {
        try {
            const manifest = await this.readManifest(this.requireWorkspaceRoot());
            return new Set(Object.keys(manifest.packages));
        } catch {
            return new Set();
        }
    }

    /**
     * Compares the manifest versions against the catalog and returns the ids of
     * packages that have a newer version available. Returns an empty set if no
     * workspace is open.
     */
    async getOutdatedIds(catalog: Catalog): Promise<Set<string>> {
        try {
            const manifest = await this.readManifest(this.requireWorkspaceRoot());
            const outdated = new Set<string>();
            const allPackages = [
                ...catalog.agents,
                ...catalog.skills,
                ...catalog.instructions,
            ];
            for (const pkg of allPackages) {
                const entry = manifest.packages[pkg.id];
                if (entry && entry.version !== pkg.version) {
                    outdated.add(pkg.id);
                }
            }
            return outdated;
        } catch {
            return new Set();
        }
    }

    private requireWorkspaceRoot(): vscode.Uri {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            throw new Error(
                'No workspace folder is open. Open a folder before installing packages.',
            );
        }
        return folders[0].uri;
    }

    private getCatalogUrl(): string {
        return vscode.workspace
            .getConfiguration('agentforge')
            .get<string>('catalogUrl', '');
    }

    private async readManifest(root: vscode.Uri): Promise<InstalledManifest> {
        const uri = vscode.Uri.joinPath(root, MANIFEST_FILENAME);
        try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            return JSON.parse(Buffer.from(bytes).toString('utf8')) as InstalledManifest;
        } catch {
            return createEmptyManifest();
        }
    }

    private async writeManifest(root: vscode.Uri, manifest: InstalledManifest): Promise<void> {
        const uri = vscode.Uri.joinPath(root, MANIFEST_FILENAME);
        await vscode.workspace.fs.writeFile(
            uri,
            Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
        );
    }
}
