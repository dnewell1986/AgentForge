# VS Code Copilot Marketplace Extension — MVP Project Plan

## Project Goal

Build a lightweight VS Code extension that allows users to browse and install GitHub Copilot-compatible:

* Agents
* Skills
* Instruction files

The extension will read a catalog hosted in a GitHub repository and install selected assets into the user’s local workspace using GitHub Copilot conventions.
## Open Source

This project is open source, hosted publicly on GitHub under the MIT licence. All development follows community-standard open-source practices:

* Public repository with a clear `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `LICENSE`
* Conventional Commits for all commit messages (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
* Semantic Versioning (SemVer) for all releases
* GitHub Issues and Discussions for bug reports, feature requests, and community input
* Pull request workflow with required reviews before merging to `main`
* GitHub Actions CI on every PR (lint, compile, test)
* Automated changelog generation from Conventional Commits (e.g. `release-please`)
* Branch protection on `main`
---

# MVP Scope

## Core Features

### Catalog Browsing

Users can:

* Browse available agents, skills, and instruction files
* Search/filter the catalog
* View descriptions and metadata
* View installation targets

### Installation

Users can:

* Install assets into their workspace
* Update existing installed assets
* Remove installed assets

### GitHub Repository Source

The extension will:

* Pull catalog metadata from GitHub
* Download package contents from GitHub
* Cache catalog data locally

### Copilot Compatibility

The extension should install files according to GitHub Copilot conventions such as:

* `.github/copilot-instructions.md`
* agent folders/files
* reusable prompt/instruction assets

---

# Documentation Standards

All code and project artefacts must meet the following documentation requirements:

## Code Documentation

* Every exported function, class, and interface has a JSDoc comment explaining its purpose, parameters, and return value
* Non-obvious internal logic has inline comments explaining *why*, not *what*
* No undocumented public API surface

## Repository Documentation

| File | Purpose |
|---|---|
| `README.md` | Project overview, feature list, screenshots, quick-start guide |
| `CONTRIBUTING.md` | How to fork, set up locally, run tests, and submit a PR |
| `CODE_OF_CONDUCT.md` | Contributor Covenant code of conduct |
| `CHANGELOG.md` | Auto-generated from Conventional Commits |
| `LICENSE` | MIT licence |
| `docs/project-plan.md` | This file — overall goals and architecture |
| `docs/architecture.md` | Component diagram and key design decisions |
| `docs/catalog-schema.md` | Full catalog.json schema reference |

## GitHub Repository Hygiene

* Issue templates for Bug Report and Feature Request
* Pull request template with checklist (tests, docs, changelog)
* Labels: `bug`, `enhancement`, `documentation`, `good first issue`, `help wanted`
* `CODEOWNERS` file routing reviews to maintainers
* Releases tagged and published to GitHub Releases with auto-generated notes

---

# Recommended Initial Architecture

## VS Code Extension

### Responsibilities

* UI
* Catalog browsing
* Installation workflows
* Workspace integration

### Suggested Stack

* TypeScript
* VS Code Extension API
* React webview (optional)

---

# Repository Structure

## Extension Repository

```text
/src
  /commands
  /services
  /providers
  /views
  /models
```

---

# Catalog Repository Structure

Example:

```text
/catalog.json

/agents
  /architect-agent
  /debug-agent

/skills
  /api-design
  /refactoring

/instructions
  /dotnet-api
  /clean-architecture
```

---

# Catalog Schema

## Suggested catalog.json Structure

```json
{
  "agents": [],
  "skills": [],
  "instructions": []
}
```

## Package Metadata

Each package should include:

* id
* name
* description
* author
* version
* tags
* install path
* file list
* icon (optional)

---

# MVP Tasks

## Phase 1 — Extension Foundation

### Tasks

* Create VS Code extension scaffold
* Configure TypeScript
* Register commands
* Add activity sidebar
* Create basic UI views
* Add extension settings

### Deliverable

A functioning extension shell inside VS Code.

---

## Phase 2 — GitHub Catalog Integration

### Tasks

* Create GitHub catalog service
* Download catalog.json
* Parse catalog metadata
* Cache catalog locally
* Handle repository errors

### Deliverable

Extension can load catalog data from GitHub.

---

## Phase 3 — Catalog UI

### Tasks

* Display agents list
* Display skills list
* Display instruction files
* Add search/filter support
* Add package details view

### Deliverable

Users can browse available assets.

---

## Phase 4 — Installation Engine

### Tasks

* Download selected package files
* Create required folders
* Install files into workspace
* Detect existing installations
* Support overwrite/update flows
* Add uninstall support

### Deliverable

Users can install Copilot-compatible assets directly into their project.

---

## Phase 5 — Quality Improvements

### Tasks

* Add logging/debug output
* Add extension configuration options
* Add better error handling
* Add unit tests
* Add GitHub Actions CI
* Publish extension preview

### Deliverable

Stable MVP suitable for early adopters.

---

# Suggested MVP Timeline

## Week 1

* Extension scaffold
* Sidebar UI
* GitHub catalog integration

## Week 2

* Catalog browsing
* Package detail views
* Installation engine

## Week 3

* Update/uninstall flows
* Error handling
* Testing
* Initial release

---

# Suggested Future Enhancements

Once the MVP works well, future versions could include:

* Multiple catalog repositories
* Community publishing
* Ratings/download counts
* Dependency support
* AI provider integrations
* Tool bundles
* MCP server integration
* Enterprise/private catalogs
* Workflow orchestration
* Agent execution runtime

---

# Recommended Initial Focus

Keep the first version extremely simple:

1. Read catalog from GitHub
2. Show installable assets
3. Install files correctly
4. Make the experience smooth

That alone provides immediate value and validates whether developers want a reusable Copilot asset marketplace.
