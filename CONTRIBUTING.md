# Contributing to AgentForge

Thank you for your interest in contributing! Contributions are welcome in two forms:

1. **Extension code** — bug fixes, features, tests, and improvements to the VS Code extension
2. **Catalog packages** — new agents, skills, and instruction files for the community catalog

---

## Table of Contents

- [Development Setup](#development-setup)
- [Running the Extension Locally](#running-the-extension-locally)
- [Running Tests](#running-tests)
- [Code Style](#code-style)
- [Commit Message Convention](#commit-message-convention)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Contributing Catalog Packages](#contributing-catalog-packages)

---

## Development Setup

**Prerequisites**

- [Node.js](https://nodejs.org/) 20 or later
- [npm](https://www.npmjs.com/) 10 or later
- [VS Code](https://code.visualstudio.com/) 1.90 or later
- [Git](https://git-scm.com/)

**Clone and install**

```bash
git clone https://github.com/agentforge/agentforge.git
cd agentforge
npm install
```

---

## Running the Extension Locally

1. Open the `agentforge` folder in VS Code
2. Press **F5** — this starts the `watch` build task and launches the **Extension Development Host**
3. A new VS Code window opens with AgentForge loaded
4. Changes to `src/` are compiled automatically; press **Ctrl+R** in the Extension Development Host to reload

To test catalog loading, set `agentforge.catalogUrl` in the Extension Development Host's settings to a raw GitHub URL pointing at a valid `catalog.json`.

---

## Running Tests

```bash
npm test
```

Lint only:

```bash
npm run lint
```

Compile only:

```bash
npm run compile
```

---

## Code Style

- **TypeScript strict mode** — `"strict": true` is enforced
- **ESLint** — `@typescript-eslint` rules; run `npm run lint` before pushing
- **JSDoc** — every exported function, class, and interface requires a JSDoc comment describing its purpose, parameters, and return value
- **No magic strings** — use named constants or enum members
- **Async correctness** — no `async void`, no `.Result` / `.Wait()`, always propagate `CancellationToken`
- **No commented-out code** — delete it; history is in source control

---

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commits on `main` are used to automatically generate the `CHANGELOG.md` and determine the next SemVer release version.

**Format**

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

**Types**

| Type | Use for |
|---|---|
| `feat` | A new user-facing feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `chore` | Build, tooling, or dependency updates |
| `refactor` | Code change with no external behaviour change |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |

**Breaking changes**

Append `!` to the type: `feat!: rename catalogUrl setting`

Or add a `BREAKING CHANGE:` footer in the commit body.

**Examples**

```
feat(catalog): add icon field to package metadata
fix(install): handle missing parent directory on first install
docs: add catalog-schema.md reference
chore(deps): update @types/vscode to 1.91.0
```

---

## Submitting a Pull Request

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes, ensuring all tests and lint pass:
   ```bash
   npm run compile && npm run lint && npm test
   ```
3. Commit using the [Conventional Commits](#commit-message-convention) format
4. Push your branch and open a pull request against `main`
5. Fill in the pull request template — make sure all checklist items are ticked

Your PR will be reviewed by a maintainer. Please respond to review comments promptly. Once approved and all checks pass, a maintainer will merge it.

---

## Contributing Catalog Packages

The default catalog lives in [`catalog/`](catalog/). To add a new package:

1. Create a subdirectory under the appropriate category:
   ```
   catalog/agents/your-agent-name/
   catalog/skills/your-skill-name/
   catalog/instructions/your-instruction-name/
   ```

2. Add your content file(s):
   - Agents: `agent.md` — YAML frontmatter (`description`, `tools`) + system prompt
   - Skills: `SKILL.md` — skill description, when to use, output format
   - Instructions: `name.instructions.md` — YAML frontmatter (`applyTo`) + rules

3. Add an entry to [`catalog/catalog.json`](catalog/catalog.json) following the schema in [`docs/catalog-schema.md`](docs/catalog-schema.md)

4. Open a pull request with:
   - A clear title: `feat(catalog): add <package-name> <category>`
   - A description of what the package does and who it is for
   - Any relevant examples

**Package requirements**

- `id` must be unique across the entire catalog
- `description` must clearly explain what the package does and when to use it
- At least two meaningful `tags`
- Content must be original or properly licensed (MIT-compatible)
- Files must follow VS Code GitHub Copilot conventions
