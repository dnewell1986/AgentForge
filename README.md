<div align="center">

# AgentForge

**A community marketplace for GitHub Copilot agents, skills, and instruction files — built right into VS Code.**

[![CI](https://github.com/agentforge/agentforge/actions/workflows/ci.yml/badge.svg)](https://github.com/agentforge/agentforge/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/agentforge.agentforge?label=marketplace)](https://marketplace.visualstudio.com/items?itemName=agentforge.agentforge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

AgentForge is an open-source VS Code extension that gives developers a one-stop marketplace for reusable GitHub Copilot assets. Browse a curated catalog of agents, skills, and instruction files, then install them into your workspace with a single click — no manual file copying required.

## Features

- **Browse** community-contributed Copilot agents, skills, and instruction files in a dedicated activity bar
- **Search** across all categories with instant QuickPick filtering
- **View details** — rich detail panel showing description, author, version, tags, and install target
- **Install** packages into your workspace, following Copilot file conventions automatically
- **Update** installed packages when newer versions are available
- **Uninstall** packages and cleanly remove all installed files (moved to trash)
- **Custom catalogs** — point to any privately hosted `catalog.json` for team or enterprise use

## Quick Start

### Install from the Marketplace

1. Open VS Code and go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for **AgentForge**
3. Click **Install**

### Browse and install a package

1. Click the **AgentForge** icon in the activity bar (left sidebar)
2. The Agents, Skills, and Instructions tree views populate from the catalog
3. Click any package to open the detail panel
4. Click **Install** — the files are written directly into your workspace

Installed packages are tracked in `.agentforge-manifest.json` at your workspace root. Installed items display a checkmark; packages with updates available display an upgrade indicator.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `agentforge.catalogUrl` | Community catalog URL | URL to a `catalog.json`. Override to use a custom or private catalog. |
| `agentforge.cacheTtlMinutes` | `60` | Minutes to cache the catalog before re-fetching. |
| `agentforge.debug` | `false` | Enable verbose logging in the AgentForge output channel. |

### Setting a GitHub token

The unauthenticated GitHub API rate limit is 60 requests per hour. For heavy use or private catalogs, set a Personal Access Token (classic, `public_repo` read scope):

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run **AgentForge: Set GitHub Token**
3. Enter your token — it is stored in VS Code's encrypted `SecretStorage` and never written to settings or logs

### Using a custom catalog

Point the extension at any publicly accessible `catalog.json` by adding this to your VS Code settings:

```json
{
  "agentforge.catalogUrl": "https://raw.githubusercontent.com/your-org/your-catalog/main/catalog.json"
}
```

See [`docs/catalog-schema.md`](docs/catalog-schema.md) for the schema your catalog must follow.

## Default Catalog

The default catalog is hosted in this repository under [`catalog/`](catalog/) and includes:

| Category | Package |
|---|---|
| Agent | Solution Architect |
| Agent | .NET Enterprise Engineer |
| Skill | API Design Review |
| Skill | Project Setup |
| Instruction | .NET SonarC# Standards |
| Instruction | .NET Enterprise Service Standards |

Want to contribute a package? See [CONTRIBUTING.md](CONTRIBUTING.md).

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for component diagrams and key design decisions.

## Contributing

Contributions are welcome — both to the extension and to the default catalog. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, commit conventions, and the PR process.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

MIT — see [LICENSE](LICENSE).
