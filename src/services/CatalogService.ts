import * as vscode from 'vscode';
import { Catalog, CatalogPackage } from '../models/CatalogPackage';
import { GitHubService } from './GitHubService';
import { logger } from '../utils/logger';

const CACHE_KEY = 'agentforge.catalogCache';

interface CatalogCache {
    catalog: Catalog;
    fetchedAt: number;
}

/**
 * Responsible for loading, validating, and caching the catalog.json from the
 * configured GitHub repository. Cache lifetime is controlled by the
 * `agentforge.cacheTtlMinutes` setting and stored in extension global state so
 * it persists across VS Code restarts.
 */
export class CatalogService {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly github: GitHubService,
    ) {}

    /**
     * Returns the catalog, using the local cache if it is still valid.
     * @param forceRefresh - When true, bypasses the cache and fetches from GitHub.
     */
    async getCatalog(forceRefresh = false): Promise<Catalog> {
        if (!forceRefresh) {
            const cached = this.context.globalState.get<CatalogCache>(CACHE_KEY);
            if (cached && this.isCacheValid(cached.fetchedAt)) {
                logger.debug(`Returning cached catalog (age: ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s).`);
                return cached.catalog;
            }
        }
        return this.fetchAndCache();
    }

    /**
     * Forces a fresh fetch from GitHub, updates the cache, and returns the new
     * catalog. Equivalent to `getCatalog(true)`.
     */
    async refresh(): Promise<Catalog> {
        return this.getCatalog(true);
    }

    /** Clears the local catalog cache, forcing the next call to re-fetch. */
    async clearCache(): Promise<void> {
        await this.context.globalState.update(CACHE_KEY, undefined);
        logger.info('Catalog cache cleared.');
    }

    private async fetchAndCache(): Promise<Catalog> {
        const url = vscode.workspace
            .getConfiguration('agentforge')
            .get<string>('catalogUrl', '');

        if (!url) {
            throw new Error(
                'No catalog URL configured. Set agentforge.catalogUrl in VS Code settings.',
            );
        }

        logger.info(`Fetching catalog from ${url}`);

        const text = await this.github.fetchText(url);
        const catalog = this.parseCatalog(text);

        await this.context.globalState.update(CACHE_KEY, {
            catalog,
            fetchedAt: Date.now(),
        } satisfies CatalogCache);

        logger.info(
            `Catalog loaded: ${catalog.agents.length} agents, ` +
            `${catalog.skills.length} skills, ` +
            `${catalog.instructions.length} instructions.`,
        );

        return catalog;
    }

    private parseCatalog(text: string): Catalog {
        let raw: unknown;
        try {
            raw = JSON.parse(text);
        } catch {
            throw new Error('catalog.json is not valid JSON.');
        }

        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            throw new Error('catalog.json root must be a JSON object.');
        }

        const obj = raw as Record<string, unknown>;

        return {
            agents: this.parsePackageArray(obj['agents'], 'agent'),
            skills: this.parsePackageArray(obj['skills'], 'skill'),
            instructions: this.parsePackageArray(obj['instructions'], 'instruction'),
        };
    }

    private parsePackageArray(
        raw: unknown,
        category: CatalogPackage['category'],
    ): CatalogPackage[] {
        if (!Array.isArray(raw)) {
            return [];
        }
        return raw
            .filter((p) => this.isValidPackage(p))
            .map((p) => ({ ...(p as object), category }) as CatalogPackage);
    }

    private isValidPackage(p: unknown): boolean {
        if (typeof p !== 'object' || p === null) {
            return false;
        }
        const pkg = p as Record<string, unknown>;
        const valid =
            typeof pkg['id'] === 'string' &&
            typeof pkg['name'] === 'string' &&
            typeof pkg['description'] === 'string' &&
            typeof pkg['author'] === 'string' &&
            typeof pkg['version'] === 'string' &&
            typeof pkg['installPath'] === 'string' &&
            Array.isArray(pkg['files']);

        if (!valid) {
            logger.warn(`Skipping malformed catalog entry: ${JSON.stringify(pkg['id'] ?? '<no id>')}`);
        }
        return valid;
    }

    private isCacheValid(fetchedAt: number): boolean {
        const ttlMinutes = vscode.workspace
            .getConfiguration('agentforge')
            .get<number>('cacheTtlMinutes', 60);
        return Date.now() - fetchedAt < ttlMinutes * 60 * 1000;
    }
}
