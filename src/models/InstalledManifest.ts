export interface InstalledPackageEntry {
    id: string;
    version: string;
    installedAt: string;
    files: string[];
}

export interface InstalledManifest {
    version: 1;
    packages: Record<string, InstalledPackageEntry>;
}

export function createEmptyManifest(): InstalledManifest {
    return { version: 1, packages: {} };
}
