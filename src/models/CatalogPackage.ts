export type PackageCategory = 'agent' | 'skill' | 'instruction';

export interface CatalogPackage {
    id: string;
    name: string;
    description: string;
    author: string;
    version: string;
    category: PackageCategory;
    tags: string[];
    installPath: string;
    files: string[];
    icon?: string;
}

export interface Catalog {
    agents: CatalogPackage[];
    skills: CatalogPackage[];
    instructions: CatalogPackage[];
}
