import * as vscode from 'vscode';
import { CatalogPackage, PackageCategory } from '../models/CatalogPackage';

export type PackageItemState = 'available' | 'installed' | 'update';

export class PackageTreeItem extends vscode.TreeItem {
    constructor(
        public readonly pkg: CatalogPackage,
        public readonly state: PackageItemState,
    ) {
        super(pkg.name, vscode.TreeItemCollapsibleState.None);

        this.description = `v${pkg.version}`;
        this.tooltip = pkg.description;
        this.contextValue = `package-${state}`;

        this.iconPath = this.resolveIcon(state);
    }

    private resolveIcon(state: PackageItemState): vscode.ThemeIcon {
        switch (state) {
            case 'installed':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
            case 'update':
                return new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('notificationsInfoIcon.foreground'));
            default:
                return new vscode.ThemeIcon('package');
        }
    }
}

export class CatalogTreeProvider implements vscode.TreeDataProvider<PackageTreeItem> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<PackageTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private packages: CatalogPackage[] = [];
    private installedIds: Set<string> = new Set();
    private outdatedIds: Set<string> = new Set();
    private filterText = '';

    constructor(readonly category: PackageCategory) {}

    setPackages(
        packages: CatalogPackage[],
        installedIds: Set<string>,
        outdatedIds: Set<string>,
    ): void {
        this.packages = packages;
        this.installedIds = installedIds;
        this.outdatedIds = outdatedIds;
        this._onDidChangeTreeData.fire();
    }

    setFilter(text: string): void {
        this.filterText = text.toLowerCase();
        this._onDidChangeTreeData.fire();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PackageTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): PackageTreeItem[] {
        const filtered = this.filterText
            ? this.packages.filter(
                  (p) =>
                      p.name.toLowerCase().includes(this.filterText) ||
                      p.description.toLowerCase().includes(this.filterText) ||
                      p.tags.some((t) => t.toLowerCase().includes(this.filterText)),
              )
            : this.packages;

        return filtered.map((pkg) => {
            let state: PackageItemState = 'available';
            if (this.outdatedIds.has(pkg.id)) {
                state = 'update';
            } else if (this.installedIds.has(pkg.id)) {
                state = 'installed';
            }
            return new PackageTreeItem(pkg, state);
        });
    }
}
