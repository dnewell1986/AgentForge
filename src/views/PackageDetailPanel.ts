import * as vscode from 'vscode';
import { CatalogPackage } from '../models/CatalogPackage';
import { InstallationService } from '../services/InstallationService';

type WebviewMessage =
    | { command: 'install'; packageId: string }
    | { command: 'uninstall'; packageId: string };

/**
 * Singleton webview panel that displays package metadata and exposes
 * Install / Uninstall / Update actions. Re-uses the existing panel when a
 * new package is selected rather than opening multiple tabs.
 */
export class PackageDetailPanel {
    private static currentPanel: PackageDetailPanel | undefined;

    private pkg: CatalogPackage;

    private constructor(
        private readonly panel: vscode.WebviewPanel,
        pkg: CatalogPackage,
        private readonly installationService: InstallationService,
        private readonly onInstall: (pkg: CatalogPackage) => Promise<void>,
        private readonly onUninstall: (pkg: CatalogPackage) => Promise<void>,
    ) {
        this.pkg = pkg;

        panel.onDidDispose(() => {
            PackageDetailPanel.currentPanel = undefined;
        });

        panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            if (message.command === 'install') {
                await this.onInstall(this.pkg);
                await this.render();
            } else if (message.command === 'uninstall') {
                await this.onUninstall(this.pkg);
                await this.render();
            }
        });
    }

    /**
     * Opens or reveals the detail panel for the given package.
     * If a panel is already open it is reused and updated in-place.
     */
    static async show(
        pkg: CatalogPackage,
        extensionUri: vscode.Uri,
        installationService: InstallationService,
        onInstall: (pkg: CatalogPackage) => Promise<void>,
        onUninstall: (pkg: CatalogPackage) => Promise<void>,
    ): Promise<void> {
        if (PackageDetailPanel.currentPanel) {
            PackageDetailPanel.currentPanel.pkg = pkg;
            await PackageDetailPanel.currentPanel.render();
            PackageDetailPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'agentforgePackageDetail',
            pkg.name,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true,
            },
        );

        const instance = new PackageDetailPanel(
            panel,
            pkg,
            installationService,
            onInstall,
            onUninstall,
        );
        PackageDetailPanel.currentPanel = instance;
        await instance.render();
    }

    private async render(): Promise<void> {
        const isInstalled = await this.installationService.isInstalled(this.pkg.id);
        const installedVersion = isInstalled
            ? await this.installationService.getInstalledVersion(this.pkg.id)
            : undefined;

        this.panel.title = this.pkg.name;
        this.panel.webview.html = this.buildHtml(isInstalled, installedVersion);
    }

    private buildHtml(isInstalled: boolean, installedVersion: string | undefined): string {
        const nonce = generateNonce();
        const pkg = this.pkg;
        const isOutdated = isInstalled && installedVersion !== pkg.version;

        const categoryColor: Record<string, string> = {
            agent: '#0078d4',
            skill: '#107c10',
            instruction: '#5c2d91',
        };
        const badgeColor = categoryColor[pkg.category] ?? '#666';

        const actionButtons = buildActionButtons(isInstalled, isOutdated, pkg.version);
        const tags = pkg.tags
            .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
            .join('');
        const files = pkg.files
            .map((f) => `<li>${escapeHtml(f)}</li>`)
            .join('');

        const installedLabel = isInstalled
            ? isOutdated
                ? `<span class="badge badge-warn">&#8593; v${escapeHtml(installedVersion ?? '')} &rarr; v${escapeHtml(pkg.version)} available</span>`
                : `<span class="badge badge-ok">&#10003; Installed v${escapeHtml(pkg.version)}</span>`
            : '';

        return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pkg.name)}</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 28px 32px;
      max-width: 720px;
    }
    h1 { margin: 0 0 8px; font-size: 1.5em; font-weight: 600; }
    .meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 4px;
      font-size: 0.78em; font-weight: 600; text-transform: capitalize;
    }
    .badge-category { background: ${badgeColor}; color: #fff; }
    .badge-ok { background: #107c10; color: #fff; }
    .badge-warn { background: #ca5010; color: #fff; }
    .byline { color: var(--vscode-descriptionForeground); font-size: 0.88em; }
    .description { margin: 0 0 20px; line-height: 1.65; }
    .section { margin-bottom: 20px; }
    .section-title {
      font-weight: 600; font-size: 0.85em; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--vscode-descriptionForeground);
      margin: 0 0 8px; padding-bottom: 6px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .tag {
      display: inline-block; padding: 2px 9px; border-radius: 10px;
      font-size: 0.8em; background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground); margin: 0 4px 4px 0;
    }
    .install-path {
      font-family: var(--vscode-editor-font-family); font-size: 0.85em;
      background: var(--vscode-textBlockQuote-background);
      padding: 5px 10px; border-radius: 4px; display: block;
    }
    .files { list-style: none; padding: 0; margin: 0; }
    .files li {
      padding: 3px 0; font-family: var(--vscode-editor-font-family);
      font-size: 0.85em; color: var(--vscode-textLink-foreground);
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 28px; }
    .btn {
      padding: 7px 18px; border: none; border-radius: 4px; cursor: pointer;
      font-size: 0.9em; font-family: var(--vscode-font-family);
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border, transparent);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  </style>
</head>
<body>
  <h1>${escapeHtml(pkg.name)}</h1>
  <div class="meta">
    <span class="badge badge-category">${escapeHtml(pkg.category)}</span>
    ${installedLabel}
  </div>
  <div class="byline">by ${escapeHtml(pkg.author)} &nbsp;&middot;&nbsp; v${escapeHtml(pkg.version)}</div>

  <p class="description">${escapeHtml(pkg.description)}</p>

  ${tags ? `<div class="section"><div class="section-title">Tags</div><div>${tags}</div></div>` : ''}

  <div class="section">
    <div class="section-title">Install Path</div>
    <code class="install-path">${escapeHtml(pkg.installPath)}</code>
  </div>

  <div class="section">
    <div class="section-title">Files (${pkg.files.length})</div>
    <ul class="files">${files}</ul>
  </div>

  <div class="actions">${actionButtons}</div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const pkgId = ${JSON.stringify(pkg.id)};
    document.querySelectorAll('.btn[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        vscode.postMessage({ command: btn.dataset.cmd, packageId: pkgId });
      });
    });
  </script>
</body>
</html>`;
    }
}

function buildActionButtons(isInstalled: boolean, isOutdated: boolean, latestVersion: string): string {
    if (!isInstalled) {
        return `<button class="btn btn-primary" data-cmd="install">Install</button>`;
    }
    if (isOutdated) {
        return `
            <button class="btn btn-primary" data-cmd="install">Update to v${escapeHtml(latestVersion)}</button>
            <button class="btn btn-secondary" data-cmd="uninstall">Uninstall</button>`;
    }
    return `<button class="btn btn-secondary" data-cmd="uninstall">Uninstall</button>`;
}

function generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
